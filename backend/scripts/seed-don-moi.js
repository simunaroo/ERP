// Them don hang GIA LAP cho mot khoang ngay vao DB DA CO du lieu (chi THEM, khong xoa/sua du lieu cu).
// Dung lai bo sinh cua seed-lon.js: vat tu, mua hang NCC, de xuat chi, thi cong, nghiem thu, phieu thu, cham soc.
// Chay: npm run db:seed:don-moi -- --tu 2026-10-06 --so 90      (den = hom nay; DB theo PG_DATABASE trong .env)
import 'dotenv/config';
import pg from 'pg';
import { napNguCanh, sinhDon } from './seed-lon.js';

const thamSo = (ten, macDinh) => { const i = process.argv.indexOf(`--${ten}`); return i > 0 ? process.argv[i + 1] : macDinh; };
const tu = new Date(`${thamSo('tu', '2026-10-06')}T08:00:00+07:00`);
const soDon = Number(thamSo('so', 90));
const homNay = new Date();
if (!(tu < homNay) || !(soDon > 0)) throw new Error('Tham số không hợp lệ: --tu phải trước hôm nay, --so > 0');

const db = new pg.Client({ host: process.env.PG_HOST, port: Number(process.env.PG_PORT), user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: process.env.PG_DATABASE });
await db.connect();
console.log(`Thêm ${soDon} đơn chốt từ ${tu.toLocaleDateString('vi-VN')} đến hôm nay vào DB "${process.env.PG_DATABASE}"...`);
try {
  await db.query(`SET app.bo_qua_nhat_ky = '1'`); // du lieu gia lap: khong ghi nhat ky thay doi
  await db.query('BEGIN');
  const kq = await sinhDon(db, await napNguCanh(db), { tu, homNay, soDon, themVao: true });
  await db.query('COMMIT');
  console.log(kq);
} catch (e) {
  await db.query('ROLLBACK');
  throw e;
} finally {
  await db.end();
}
