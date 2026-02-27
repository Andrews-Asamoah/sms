const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database");

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'assessment_templates'
      AND column_name IN ('classLevel', 'subjectCode');
    `);

    console.log("Target columns in assessment_templates:");
    if (res.rows.length === 0) {
      console.log("None of the target columns found!");
    }
    res.rows.forEach((row) => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
