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
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    console.log("TABLE_LIST_START");
    res.rows.forEach((row) => console.log(row.table_name));
    console.log("TABLE_LIST_END");
  } catch (err) {
    console.error("Query error:", err);
  } finally {
    await client.end();
  }
}

main();
