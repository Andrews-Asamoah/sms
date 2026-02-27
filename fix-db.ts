import { Client } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  try {
    await client.connect();
    console.log("Checking if announcements table exists...");
    const res = await client.query(
      "SELECT to_regclass('public.announcements')",
    );
    if (res.rows[0].to_regclass) {
      console.log("Table 'announcements' exists.");
    } else {
      console.log("Table 'announcements' is MISSING. Creating it...");
      await client.query(`
        CREATE TABLE announcements (
          id TEXT PRIMARY KEY,
          "schoolId" TEXT NOT NULL,
          "authorId" TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          target TEXT NOT NULL DEFAULT 'ALL',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        )
      `);
      console.log("Table 'announcements' created successfully.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
