// Thuc nghiem muc 3.3: do thoi gian phan hoi API tren DB test du lieu lon (datn_erp_test, db-reset --lon).
// Can: backend cong 3999 (PG_DATABASE=datn_erp_test). Chay: node do_hieu_nang.mjs  -> in bang Markdown + do_hieu_nang.json
// Moi API goi 1 lan khoi dong (bo qua) + 10 lan do; lay trung vi va lan cham nhat.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maTai, buocHienTai } from 'file:///F:/DATN/backend/src/utils/totp.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const B = 'http://localhost:3999/api';
const h = async (t, m, u, b) => (await fetch(B + u, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined })).json();
{
  const { createRequire } = await import('node:module');
  const req = createRequire('F:/DATN/backend/package.json');
  req('dotenv').config({ path: 'F:/DATN/backend/.env', quiet: true });
  const pg = req('pg');
  const c = new pg.Client({ host: process.env.PG_HOST, port: +process.env.PG_PORT, user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: 'datn_erp_test' });
  await c.connect();
  await c.query('UPDATE users SET totp_khoa = NULL, totp_bat_luc = NULL, totp_buoc_cuoi = NULL, totp_ma_du_phong = NULL');
  const dem = (await c.query(`SELECT (SELECT count(*) FROM don_hang)::int don, (SELECT count(*) FROM khach_hang)::int khach,
    (SELECT count(*) FROM don_hang_vat_tu)::int dong_vt, (SELECT count(*) FROM de_xuat_chi)::int dxc, (SELECT count(*) FROM thanh_toan_khach)::int phieu_thu,
    (SELECT count(*) FROM khach_hang_cham_soc)::int cham_soc, (SELECT count(*) FROM don_hang_giai_doan_log)::int log_tien_do`)).rows[0];
  await c.end();
  globalThis.DEM = dem;
}
async function phien(u) {
  let r = await h(null, 'POST', '/auth/login', { username: u, password: `${u}123456` });
  if (r.buoc === 'cai_2fa') {
    const k = await h(null, 'POST', '/auth/2fa/khoi-tao', { ma_tam: r.ma_tam });
    r = await h(null, 'POST', '/auth/2fa/kich-hoat', { ma_tam: k.ma_tam, ma: maTai(k.khoa, buocHienTai()) });
  }
  return r.token;
}
const tk = { thilan: await phien('thilan'), vannam: await phien('vannam'), thihong: await phien('thihong'), ngocson: await phien('ngocson') };
const donId = (await h(tk.ngocson, 'GET', '/don-hang?limit=1&giai_doan=thi_cong')).items[0].id;

const DS = [
  ['Đăng nhập (bcrypt)', null, 'POST', '/auth/login', { username: 'thilan', password: 'thilan123456' }],
  ['Trang Tổng quan (Admin)', 'ngocson', 'GET', '/tong-quan'],
  ['Danh sách đơn hàng (lọc, phân trang 20)', 'ngocson', 'GET', '/don-hang?limit=20&q=09'],
  ['Chi tiết đơn hàng', 'ngocson', 'GET', `/don-hang/${donId}`],
  ['Danh sách khách hàng của Sale', 'thilan', 'GET', '/khach-hang?limit=20'],
  ['Công nợ khách hàng', 'thihong', 'GET', '/thu-tien/cong-no'],
  ['Công nợ nhà cung cấp', 'thihong', 'GET', '/cong-no/ncc'],
  ['Báo cáo lãi/lỗ 12 tháng', 'thihong', 'GET', '/bao-cao/lai-lo?tu=2025-11-01&den=2026-10-31'],
  ['Xuất Excel lãi/lỗ 12 tháng', 'thihong', 'GET', '/bao-cao/lai-lo/excel?tu=2025-11-01&den=2026-10-31', null, 'file'],
  ['Phân tích vật tư và giá NCC (số liệu)', 'thihong', 'GET', '/phan-tich/tong-hop'],
  ['Báo cáo chăm sóc khách hàng', 'ngocson', 'GET', '/cham-soc/bao-cao?tu=2026-10-01&den=2026-10-31'],
];
const ketQua = [];
for (const [ten, u, m, url, body, kieu] of DS) {
  const t = u ? tk[u] : null;
  const goi = async () => {
    const t0 = performance.now();
    const r = await fetch(B + url, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const buf = Buffer.from(await r.arrayBuffer());
    if (!r.ok) throw new Error(`${ten}: HTTP ${r.status} ${buf.toString().slice(0, 200)}`);
    return { ms: performance.now() - t0, kb: buf.length / 1024 };
  };
  await goi();
  const lan = [];
  for (let i = 0; i < 10; i++) lan.push(await goi());
  const ms = lan.map((x) => x.ms).sort((a, b) => a - b);
  ketQua.push({ ten, trung_vi_ms: Math.round((ms[4] + ms[5]) / 2), cham_nhat_ms: Math.round(ms[9]), kb: Math.round(lan[0].kb), kieu: kieu || 'json' });
}
fs.writeFileSync(path.join(DIR, 'do_hieu_nang.json'), JSON.stringify({ luc: new Date().toISOString(), du_lieu: globalThis.DEM, ket_qua: ketQua }, null, 1));
console.log('Du lieu:', globalThis.DEM);
console.log('| API | Trung vị (ms) | Chậm nhất (ms) | Dung lượng (KB) |');
for (const k of ketQua) console.log(`| ${k.ten} | ${k.trung_vi_ms} | ${k.cham_nhat_ms} | ${k.kb} |`);
