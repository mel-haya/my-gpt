import { db } from "../lib/db-config";
import { users } from "../lib/db-schema";

async function main() {
  console.log("Testing DB connection...");
  try {
    const res = await db.select().from(users).limit(1);
    console.log("DB Connection Success:", res.length >= 0);
  } catch (err) {
    console.error("DB Connection Failed:", err);
  }
}

main();
