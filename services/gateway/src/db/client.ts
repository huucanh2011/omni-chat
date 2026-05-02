import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), ".data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "gateway.db"));

const schemaPath = path.resolve(process.cwd(), "src/db/schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf-8");
db.exec(schemaSql);
db.exec("DROP TABLE IF EXISTS messages;");
db.exec("DROP TABLE IF EXISTS chats;");

const accountColumns = db
  .prepare("PRAGMA table_info(accounts)")
  .all() as Array<{ name: string }>;

if (!accountColumns.some((col) => col.name === "service_url")) {
  db.exec("ALTER TABLE accounts ADD COLUMN service_url TEXT NOT NULL DEFAULT ''");
}
