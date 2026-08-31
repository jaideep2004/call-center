import "dotenv/config";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { auth } from "@/server/auth";
import { queryOne } from "@/server/db";

const CHANNEL = "call:events";
const PUBLISH_TOKEN = process.env.GATEWAY_PUBLISH_TOKEN;
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.method === "POST" && req.url === "/publish") {
    // /publish is server-to-server only. When GATEWAY_PUBLISH_TOKEN is set it
    // must be presented as `Authorization: Bearer <token>`. Without it, the
    // endpoint stays open only outside production (local dev) and is disabled
    // in production (fail closed, never fail open).
    if (PUBLISH_TOKEN) {
      if (req.headers.authorization !== `Bearer ${PUBLISH_TOKEN}`) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }
    } else if (process.env.NODE_ENV === "production") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "publish disabled: GATEWAY_PUBLISH_TOKEN not set" }));
      return;
    }
    let body = "";
    req.on("data", (chunk: string) => body += chunk);
    req.on("end", () => {
      try {
        const { membershipId, event, data } = JSON.parse(body);
        io.to(`agent:${membershipId}`).emit(event, data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e: any) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});
const io = new Server(server, { cors: { origin: process.env.NEXT_PUBLIC_APP_URL, credentials: true } });

// Authenticate every socket against the better-auth session and derive the
// room from the DB — the client's membershipId query is never trusted.
io.use(async (socket, next) => {
  try {
    const cookie = (socket.handshake.headers.cookie as string | undefined) ?? "";
    const session = await (auth.api as any).getSession({ headers: { cookie } });
    if (!session?.user) return next(new Error("unauthorized"));
    const membership = await queryOne<{ id: string }>(
      `SELECT id FROM app.memberships WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [session.user.id],
    );
    if (!membership) return next(new Error("no active membership"));
    (socket as any).membershipId = membership.id;
    next();
  } catch (e) {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  const membershipId = (socket as any).membershipId;
  socket.join(`agent:${membershipId}`);
  socket.emit("gateway:ready", { timestamp: new Date().toISOString() });
  socket.on("disconnect", () => socket.leave(`agent:${membershipId}`));
});

(async () => {
  try {
    const sub = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
    await sub.connect();
    await sub.subscribe(CHANNEL, (message) => {
      try {
        const { membershipId, event, data } = JSON.parse(message);
        io.to(`agent:${membershipId}`).emit(event, data);
      } catch { /* skip malformed */ }
    });
    console.info("redis bridge connected");
  } catch {
    console.warn("redis not available — socket events from server disabled");
  }
})();

const port = Number(process.env.REALTIME_PORT ?? 3001);
server.listen(port, () => console.info("realtime-gateway ready on", port));
