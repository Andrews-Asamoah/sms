import { Client } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  try {
    await client.connect();
    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    console.log("Tables in public schema:");
    res.rows.forEach((row) => console.log("- " + row.table_name));
  } catch (err) {
    console.error("Query error:", err);
  } finally {
    await client.end();
  }
}

main();
