import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

// Ap dung moi file trong sql/migrations theo thu tu ten. Cac migration viet idempotent nen chay lai van an toan.
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../sql/migrations');

export async function migrate(conn) {
  const db = new pg.Client(conn);
  await db.connect();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.query(fs.readFileSync(path.join(dir, file), 'utf8'));
    console.log(`Da ap dung migration ${file}`);
  }
  await db.end();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await migrate({
    host: process.env.PG_HOST, port: Number(process.env.PG_PORT), user: process.env.PG_USER,
    password: process.env.PG_PASSWORD, database: process.env.PG_DATABASE,
  });
}
