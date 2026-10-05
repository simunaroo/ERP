import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dbName = process.env.PG_DATABASE;

if (!/^[a-z_][a-z0-9_]*$/.test(dbName)) {
  throw new Error(`Ten database khong hop le: ${dbName}`);
}

const conn = {
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
};

const admin = new pg.Client({ ...conn, database: 'postgres' });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
await admin.query(`CREATE DATABASE ${dbName}`);
await admin.end();
console.log(`Da tao lai database ${dbName}`);

const db = new pg.Client({ ...conn, database: dbName });
await db.connect();
for (const file of ['schema.sql', 'seed.sql']) {
  await db.query(fs.readFileSync(path.join(root, 'sql', file), 'utf8'));
  console.log(`Da chay sql/${file}`);
}
await db.end();

if (process.argv.includes('--lon')) {
  const { seedLon } = await import('./seed-lon.js');
  const kq = await seedLon({ ...conn, database: dbName });
  console.log('Da sinh du lieu lon:', kq);
}
