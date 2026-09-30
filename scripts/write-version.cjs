// Writes src/generated/version.ts with the current git SHA + build time so
// /api/v1/health can report exactly which code is running in production.
// Runs as part of `npm run build`. Never fails the build (falls back to
// "unknown" when git metadata is unavailable).
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function sh(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

const sha = sh("git rev-parse --short HEAD") ?? "unknown";
const branch = sh("git rev-parse --abbrev-ref HEAD") ?? "unknown";
const builtAt = new Date().toISOString();

const dir = path.join(__dirname, "..", "src", "generated");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  path.join(dir, "version.json"),
  JSON.stringify({ sha, branch, builtAt }, null, 2),
);
console.log(`version: ${sha} (${branch}) @ ${builtAt}`);
