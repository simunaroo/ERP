// Doc cau truc CSDL that (DB test, tao tu schema.sql) -> schema.json cho phan "Thiet ke bang" cua Chuong 2.
// Chay: node lay_schema.cjs   (doc ket noi tu backend/.env, luon dung DB datn_erp_test)
require('F:/DATN/backend/node_modules/dotenv').config({ path: 'F:/DATN/backend/.env', quiet: true });
const pg = require('F:/DATN/backend/node_modules/pg');
const fs = require('fs');
const path = require('path');

const c = new pg.Client({ host: process.env.PG_HOST, port: +process.env.PG_PORT, user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: 'datn_erp_test' });
(async () => {
  await c.connect();
  const bang = (await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                                 AND table_name <> 'schema_migrations' ORDER BY table_name`)).rows.map((r) => r.table_name);
  const cot = (await c.query(`SELECT table_name, column_name, data_type, udt_name, character_maximum_length, numeric_precision, numeric_scale,
                                     is_nullable, column_default, ordinal_position
                                FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`)).rows;
  const rb = (await c.query(`SELECT conrelid::regclass::text AS bang, conname, contype, pg_get_constraintdef(oid) AS def,
                                    (SELECT array_agg(a.attname ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid = conrelid AND a.attnum = ANY(conkey)) AS cols
                               FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conrelid <> 0`)).rows;
  const en = (await c.query(`SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS v FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid GROUP BY t.typname`)).rows;
  const tg = (await c.query(`SELECT event_object_table AS bang, trigger_name AS ten FROM information_schema.triggers WHERE trigger_schema = 'public' GROUP BY 1, 2 ORDER BY 1, 2`)).rows;
  const view = (await c.query(`SELECT table_name FROM information_schema.views WHERE table_schema = 'public'`)).rows.map((r) => r.table_name);
  fs.writeFileSync(path.join(__dirname, 'schema.json'), JSON.stringify({ bang, cot, rb, en, tg, view }, null, 1));
  console.log(`schema.json: ${bang.length} bảng, ${tg.length} trigger, ${view.length} view`);
  await c.end();
})();
