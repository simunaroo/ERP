// Khoi phuc CSDL tu ban sao luu (.dump) VAO MOT DATABASE MOI, khong ghi de database dang chay.
// Chay: npm run db:khoi-phuc -- sao-luu/erp_datn_erp_20261023-020000.dump [ten_db_moi]
// Kiem tra du lieu xong thi tu doi ten: ALTER DATABASE <ten_db_moi> RENAME TO datn_erp; (sau khi tat backend, doi ten DB cu)
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const [file, tenMoi = `${process.env.PG_DATABASE}_khoi_phuc_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`] = process.argv.slice(2);
if (!file || !fs.existsSync(file)) throw new Error('Thiếu hoặc sai đường dẫn file .dump');
if (!/^[a-z_][a-z0-9_]*$/.test(tenMoi)) throw new Error(`Tên database không hợp lệ: ${tenMoi}`);
if (tenMoi === process.env.PG_DATABASE) throw new Error('Không khôi phục đè lên database đang dùng — hãy chọn tên mới rồi đổi tên sau.');

const conn = { host: process.env.PG_HOST, port: Number(process.env.PG_PORT), user: process.env.PG_USER, password: process.env.PG_PASSWORD };
const admin = new pg.Client({ ...conn, database: 'postgres' });
await admin.connect();
if ((await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [tenMoi])).rowCount) throw new Error(`Database ${tenMoi} đã tồn tại`);
await admin.query(`CREATE DATABASE ${tenMoi}`);
await admin.end();
const bin = (t) => (process.env.PG_BIN ? path.join(process.env.PG_BIN, t) : t);
execFileSync(bin('pg_restore'), ['-h', conn.host, '-p', String(conn.port), '-U', conn.user, '-d', tenMoi, '--no-owner', file],
  { env: { ...process.env, PGPASSWORD: conn.password }, stdio: 'inherit' });
console.log(`Đã khôi phục vào database "${tenMoi}". Ảnh bill: giải nén file _uploads.tar.gz cùng tên vào backend/uploads.`);
