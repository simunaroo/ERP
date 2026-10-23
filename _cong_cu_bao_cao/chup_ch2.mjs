// Chup man hinh phan mem that cho muc 2.9 Chuong 2 (DB thu datn_erp_test, du lieu mau lon).
// Can: backend chay cong 3999 (PG_DATABASE=datn_erp_test), frontend Vite cong 5199 tro API ve 3999.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maTai, buocHienTai } from 'file:///F:/DATN/backend/src/utils/totp.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'anh');
fs.mkdirSync(OUT, { recursive: true });
const B = 'http://localhost:3999/api';
const F = 'http://localhost:5199';
const h = async (t, m, u, b) => {
  const r = await fetch(B + u, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined });
  return r.json().catch(() => null);
};
// Dang nhap qua API (Admin/Ke toan tu cai 2FA bang khoa nhan duoc) -> { token, user }
// Chay lai nhieu lan: dat lai 2FA trong DB test de tu cai lai (khong can nho khoa lan truoc).
{
  const { createRequire } = await import('node:module');
  const req = createRequire('F:/DATN/backend/package.json');
  req('dotenv').config({ path: 'F:/DATN/backend/.env', quiet: true });
  const pg = req('pg');
  const c = new pg.Client({ host: process.env.PG_HOST, port: +process.env.PG_PORT, user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: 'datn_erp_test' });
  await c.connect(); await c.query('UPDATE users SET totp_khoa = NULL, totp_bat_luc = NULL, totp_buoc_cuoi = NULL, totp_ma_du_phong = NULL'); await c.end();
}
const khoa = {};
async function phien(u) {
  let r = await h(null, 'POST', '/auth/login', { username: u, password: `${u}123456` });
  if (r.buoc === 'cai_2fa') {
    const k = await h(null, 'POST', '/auth/2fa/khoi-tao', { ma_tam: r.ma_tam });
    khoa[u] = k.khoa;
    r = await h(null, 'POST', '/auth/2fa/kich-hoat', { ma_tam: k.ma_tam, ma: maTai(k.khoa, buocHienTai()) });
  } else if (r.buoc === 'nhap_ma_2fa') {
    r = await h(null, 'POST', '/auth/2fa/xac-minh', { ma_tam: r.ma_tam, ma: maTai(khoa[u], buocHienTai() + 1) });
  }
  if (!r.token) throw new Error(`Đăng nhập ${u} lỗi: ${JSON.stringify(r)}`);
  return r;
}
const ph = {};
for (const u of ['thilan', 'vannam', 'thihong', 'ngocson']) ph[u] = await phien(u);
const tk = Object.fromEntries(Object.entries(ph).map(([u, x]) => [u, x.token]));

// ---- Chuan bi du lieu minh hoa ----
// 1 don cua Van hanh dang mua hang: dat hang NCC + NCC yeu cau coc.
const dsMua = (await h(tk.vannam, 'GET', '/don-hang?limit=50&giai_doan=mua_hang')).items;
let donMua = dsMua[0]?.id;
for (const d of dsMua) {
  const ct = await h(tk.vannam, 'GET', `/mua-hang/don/${d.id}`);
  const cho = ct.dong.filter((x) => ['cho_xu_ly', 'dang_hoi'].includes(x.trang_thai) && x.top_ncc.length);
  if (cho.length) {
    for (const x of cho) await h(tk.vannam, 'PUT', `/mua-hang/dong/${x.id}`, { ncc_id: x.top_ncc[0].ncc_id });
    const ct2 = await h(tk.vannam, 'GET', `/mua-hang/don/${d.id}`);
    const n = ct2.ncc.find((y) => y.dong_cho_dat > 0);
    const dh = await h(tk.vannam, 'POST', `/mua-hang/don/${d.id}/dat-hang`, { ncc_id: n.ncc_id });
    await h(tk.vannam, 'POST', `/mua-hang/dat-hang/${dh.id}/phan-hoi`, { loai: 'coc', so_tien_coc: Math.round(dh.tong_tien * 0.3 / 1000) * 1000 });
    donMua = d.id; break;
  }
}
const dxc = (await h(tk.thihong, 'GET', '/cong-no/de-xuat-chi?trang_thai=cho_duyet')).items[0];
const donNt = (await h(tk.vannam, 'GET', '/don-hang?limit=5&giai_doan=nghiem_thu')).items[0];
// Giao dich ngan hang: tien vao khop phieu cho xac nhan, tien ra khop de xuat da duyet, 1 giao dich la.
const phieuCho = (await h(tk.thihong, 'GET', '/thu-tien/cho-xac-nhan')).find((p) => p.hinh_thuc === 'chuyen_khoan');
if (phieuCho) await h(tk.thihong, 'POST', '/ngan-hang/gia-lap', { loai: 'vao', so_tien: phieuCho.so_tien, noi_dung: `${phieuCho.ma_don.replaceAll('-', '')} THANH TOAN` });
const daDuyet = (await h(tk.thihong, 'GET', '/cong-no/de-xuat-chi?trang_thai=da_duyet')).items[0];
if (daDuyet) await h(tk.thihong, 'POST', '/ngan-hang/gia-lap', { loai: 'ra', so_tien: daDuyet.so_tien, noi_dung: `IBFT ${daDuyet.noi_dung_ck}` });
await h(tk.thihong, 'POST', '/ngan-hang/gia-lap', { loai: 'vao', so_tien: 2500000, noi_dung: 'NGUYEN VAN A CHUYEN TIEN' });
// Thay doi de nhat ky co du lieu + 1 ban sao luu
await h(tk.ngocson, 'PUT', '/cau-hinh/ty_le_gia_von_tu_sx', { gia_tri: 60 });
await h(tk.ngocson, 'POST', '/sao-luu/ngay');
console.log({ donMua, dxc: dxc?.id, donNt: donNt?.id });

const KICH = [
  ['01_dang_nhap', null, '/login'],
  ['02_tong_quan_van_hanh', 'vannam', '/'],
  ['03_danh_sach_don_sale', 'thilan', '/don-hang'],
  ['04_tao_don_sale', 'thilan', '/don-hang/tao'],
  ['05_khach_hang_sale', 'thilan', '/khach-hang'],
  ['06_chi_tiet_don_tien_do', 'vannam', `/don-hang/${donMua}`],
  ['07_mua_hang_dat_hang_ncc', 'vannam', `/mua-hang/don/${donMua}`, '.ds-dat-hang'],
  ['08_lich_thi_cong', 'vannam', '/thi-cong'],
  ['09_nghiem_thu', 'vannam', `/thi-cong/nghiem-thu/${donNt?.id}`],
  ['10_ncc_bang_gia', 'thihong', '/nha-cung-cap/so-sanh-gia'],
  ['11_de_xuat_chi_qr', 'thihong', `/cong-no?mo=${dxc?.id}`, '.phieu'],
  ['12_cong_no_ncc', 'thihong', '/cong-no/ncc'],
  ['13_cong_no_khach', 'thihong', '/cong-no/khach'],
  ['14_phan_tich_ai', 'thihong', '/nha-cung-cap/phan-tich'],
  ['15_nguoi_dung_admin', 'ngocson', '/nguoi-dung'],
  ['16_tong_quan_admin', 'ngocson', '/'],
  ['18_nhap_so', 'ngocson', '/nhap-so'],
  ['19_quan_ly_chia_so', 'ngocson', '/nhap-so/chia'],
  ['20_bao_cao_lai_lo', 'thihong', '/bao-cao?tu=2026-09-01&den=2026-09-30'],
  ['21_doi_soat_ngan_hang', 'thihong', '/cong-no/ngan-hang', 'table'],
  ['22_phan_quyen', 'ngocson', '/phan-quyen'],
  ['23_nhat_ky', 'ngocson', '/nhat-ky'],
  ['24_sao_luu', 'ngocson', '/sao-luu'],
];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
async function trang(user, vp = { width: 1366, height: 820, deviceScaleFactor: 1.5 }) {
  const c = await browser.createBrowserContext(); const p = await c.newPage();
  await p.setViewport(vp);
  await p.goto(`${F}/login`, { waitUntil: 'networkidle0' });
  if (user) await p.evaluate((s) => localStorage.setItem('erp-auth', JSON.stringify({ state: { token: s.token, user: s.user }, version: 0 })), ph[user]);
  return p;
}
const ctxs = {};
for (const [ten, user, url, cuonToi] of KICH) {
  ctxs[user || 'khach'] ||= await trang(user);
  const p = ctxs[user || 'khach'];
  await p.goto(F + url, { waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  if (cuonToi) await p.evaluate((s) => document.querySelector(s)?.closest('.card, .phieu')?.scrollIntoView({ block: 'start' }), cuonToi);
  await new Promise((r) => setTimeout(r, 400));
  await p.screenshot({ path: path.join(OUT, `${ten}.png`) });
  console.log('chup', ten);
}

// 17: man cai dat 2FA (Ke toan B chua bat)
{
  const p = await trang(null);
  await p.type('#u', 'vanduc'); await p.type('#p', 'vanduc123456'); await p.keyboard.press('Enter');
  await p.waitForSelector('.qr-2fa'); await new Promise((r) => setTimeout(r, 500));
  await p.screenshot({ path: path.join(OUT, '17_xac_thuc_2_lop.png') });
  console.log('chup 17_xac_thuc_2_lop');
}
// 25: 3 man dien thoai ghep canh nhau
{
  const anh = [];
  for (const [u, url] of [['vannam', '/'], ['vannam', `/don-hang/${donMua}`], ['thihong', '/bao-cao?tu=2026-09-01&den=2026-09-30']]) {
    const p = await trang(u, { width: 390, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await p.goto(F + url, { waitUntil: 'networkidle0' }); await new Promise((r) => setTimeout(r, 1200));
    anh.push(Buffer.from(await p.screenshot()).toString('base64'));
  }
  const p = await browser.newPage(); await p.setViewport({ width: 1230, height: 800, deviceScaleFactor: 1.5 });
  await p.setContent(`<body style="margin:0;padding:10px;background:#e5e7eb;display:flex;gap:15px">${anh.map((a) => `<img src="data:image/png;base64,${a}" style="width:390px;border-radius:14px;box-shadow:0 2px 8px #0003">`).join('')}</body>`, { waitUntil: 'load' });
  await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  await p.screenshot({ path: path.join(OUT, '25_dien_thoai.png') });
  console.log('chup 25_dien_thoai');
}
await browser.close();
