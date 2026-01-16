import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({
  path: ".env",
});
const connectionString = process.env.NEON_DATABASE_URL as string;
const client = neon(connectionString);
export const db = drizzle(client);
