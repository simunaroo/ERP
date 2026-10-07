import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

// Ap dung cac file trong sql/migrations theo thu tu ten, MOI FILE CHI CHAY MOT LAN:
// ten file da chay duoc ghi vao bang schema_migrations (giong Flyway/Knex/Prisma).
// Ly do: migration sau co the xoa/doi bang ma migration truoc dung -> chay lai tu dau se loi.
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../sql/migrations');
const dsFile = () => fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const TAO_BANG = `CREATE TABLE IF NOT EXISTS schema_migrations (
  ten TEXT PRIMARY KEY, chay_luc TIMESTAMPTZ NOT NULL DEFAULT now())`;

// DB vua tao tu schema.sql (da la ban moi nhat) -> danh dau moi migration "da chay" (baseline), khong chay lai.
export async function danhDauDaChay(db) {
  await db.query(TAO_BANG);
  for (const f of dsFile()) await db.query('INSERT INTO schema_migrations (ten) VALUES ($1) ON CONFLICT DO NOTHING', [f]);
}

export async function migrate(conn) {
  const db = new pg.Client(conn);
  await db.connect();
  await db.query(TAO_BANG);
  const daChay = new Set((await db.query('SELECT ten FROM schema_migrations')).rows.map((r) => r.ten));
  let soFile = 0;
  for (const file of dsFile().filter((f) => !daChay.has(f))) {
    // Moi file mot transaction: loi giua chung thi khong de lai CSDL "nua cu nua moi".
    try {
      await db.query('BEGIN');
      await db.query(fs.readFileSync(path.join(dir, file), 'utf8'));
      await db.query('INSERT INTO schema_migrations (ten) VALUES ($1)', [file]);
      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK');
      await db.end();
      throw new Error(`Migration ${file} lỗi: ${e.message}`);
    }
    soFile++;
    console.log(`Da ap dung migration ${file}`);
  }
  if (!soFile) console.log('Khong co migration moi');
  await db.end();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await migrate({
    host: process.env.PG_HOST, port: Number(process.env.PG_PORT), user: process.env.PG_USER,
    password: process.env.PG_PASSWORD, database: process.env.PG_DATABASE,
  });
}
