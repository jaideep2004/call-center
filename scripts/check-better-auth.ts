import "dotenv/config";
import { auth } from "../src/server/auth";

async function main() {
  const api = auth.api as any;
  console.log("API methods:", Object.getOwnPropertyNames(api).filter(k => typeof api[k] === "function"));
}
main().catch(console.error);
