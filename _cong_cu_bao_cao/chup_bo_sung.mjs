// Chup bo sung cho Chuong 2 sau khi thay "Len don nhanh bang AI" bang tro ly AI theo san pham,
// them san pham quan tam va cau hinh xac thuc hai lop theo vai tro (13/11/2026).
// Can: backend cong 3999 (PG_DATABASE=datn_erp_test, GEMINI_API_KEY that), frontend Vite cong 5199 tro API ve 3999.
// Chay: node chup_bo_sung.mjs   -> anh/04, 05, 15, 27 (chup lai) va 30, 31, 32 (moi)
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maTai, buocHienTai } from 'file:///F:/DATN/backend/src/utils/totp.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'anh');
const B = 'http://localhost:3999/api';
const F = 'http://localhost:5199';
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const h = async (t, m, u, b) => {
  const r = await fetch(B + u, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined });
  return r.json().catch(() => null);
};

// Dat lai 2FA trong DB test de tu cai lai khi dang nhap (giong chup_ch2.mjs)
{
  const { createRequire } = await import('node:module');
  const req = createRequire('F:/DATN/backend/package.json');
  req('dotenv').config({ path: 'F:/DATN/backend/.env', quiet: true });
  const pg = req('pg');
  const c = new pg.Client({ host: process.env.PG_HOST, port: +process.env.PG_PORT, user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: 'datn_erp_test' });
  await c.connect(); await c.query('UPDATE users SET totp_khoa = NULL, totp_bat_luc = NULL, totp_buoc_cuoi = NULL, totp_ma_du_phong = NULL'); await c.end();
}
async function phien(u) {
  let r = await h(null, 'POST', '/auth/login', { username: u, password: `${u}123456` });
  if (r.buoc === 'cai_2fa') {
    const k = await h(null, 'POST', '/auth/2fa/khoi-tao', { ma_tam: r.ma_tam });
    r = await h(null, 'POST', '/auth/2fa/kich-hoat', { ma_tam: k.ma_tam, ma: maTai(k.khoa, buocHienTai()) });
  }
  if (!r.token) throw new Error(`Đăng nhập ${u} lỗi: ${JSON.stringify(r)}`);
  return r;
}
const ph = { thilan: await phien('thilan'), ngocson: await phien('ngocson') };

// Khach cua Sale: da cham soc, co nhu cau va quan tam san pham San -> dung cho chi tiet khach + khung chat
const ds = (await h(ph.thilan.token, 'GET', '/khach-hang?limit=100')).items;
const coSan = (k) => (k.san_pham || []).some((s) => s.ten === 'Sàn');
const trongNha = (k) => /phòng (ngủ|khách)|chung cư|căn hộ/i.test(k.nhu_cau || '') && !/ngoài trời|ban công/i.test(k.nhu_cau);
const khach = ds.find((k) => k.trang_thai_cham_soc === 'quan_tam' && trongNha(k) && coSan(k))
  || ds.find((k) => trongNha(k) && coSan(k))
  || ds.find((k) => k.trang_thai_cham_soc === 'quan_tam' && k.nhu_cau && coSan(k))
  || ds.find((k) => k.lan_cham_soc_cuoi && k.nhu_cau && coSan(k)) || ds[0];
console.log('khach minh hoa:', khach.id, khach.ten, khach.nhu_cau, (khach.san_pham || []).map((s) => s.ten));

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
async function trang(user) {
  const c = await browser.createBrowserContext(); const p = await c.newPage();
  await p.setViewport({ width: 1366, height: 820, deviceScaleFactor: 1.5 });
  await p.goto(`${F}/login`, { waitUntil: 'networkidle0' });
  await p.evaluate((s) => localStorage.setItem('erp-auth', JSON.stringify({ state: { token: s.token, user: s.user }, version: 0 })), ph[user]);
  return p;
}
async function chup(p, ten, url) {
  if (url) { await p.goto(F + url, { waitUntil: 'networkidle0' }).catch(() => {}); await cho(1500); }
  await p.screenshot({ path: path.join(OUT, `${ten}.png`) });
  console.log('chup', ten);
}

const sale = await trang('thilan');
await chup(sale, '04_tao_don_sale', '/don-hang/tao');
await chup(sale, '05_khach_hang_sale', '/khach-hang');
await chup(sale, '27_chi_tiet_khach', `/khach-hang/${khach.id}`);

// 30: mo tro ly tu ho so khach, chon tro ly San, hoi that (Gemini) roi chup
{
  const [nut] = await sale.$$("xpath/.//button[contains(., 'Hỏi trợ lý sản phẩm')]");
  await nut.click(); await sale.waitForSelector('.chat-noi'); await cho(800);
  const [tabSan] = await sale.$$("xpath/.//div[contains(@class,'chat-noi-sp')]//button[normalize-space(.)='Sàn' or starts-with(normalize-space(.),'Sàn')]");
  if (tabSan) { await tabSan.click(); await cho(500); }
  await sale.type('.chat-nhap textarea', 'Khách này nên tư vấn loại sàn nào, hết khoảng bao nhiêu tiền?');
  await sale.keyboard.press('Enter');
  await cho(1500);
  await sale.waitForFunction(() => !document.body.innerText.includes('Đang trả lời...'), { timeout: 120000 });
  await cho(800);
  const loi = await sale.$eval('.chat-noi', (e) => e.querySelector('.chat-noi-loi')?.innerText || '');
  if (loi) console.warn('Tro ly bao loi:', loi);
  // Cuon de thay ca cau hoi cua Sale o dau khung chat
  await sale.evaluate(() => document.querySelector('.chat-tn.toi')?.scrollIntoView({ block: 'start' }));
  await cho(400);
  await chup(sale, '30_tro_ly_ai_chat');
}

const admin = await trang('ngocson');
await chup(admin, '15_nguoi_dung_admin', '/nguoi-dung');
await admin.goto(F + '/tro-ly/kien-thuc', { waitUntil: 'networkidle0' }); await cho(1500);
// Nut noi "Tro ly" nam de len nut "Luu" o goc duoi khi chua cuon trang -> an di cho anh minh hoa
await admin.evaluate(() => { const n = document.querySelector('.chat-noi-nut'); if (n) n.style.display = 'none'; });
await chup(admin, '31_kien_thuc_tro_ly');
await chup(admin, '32_xac_thuc_vai_tro', '/nguoi-dung/xac-thuc');
await browser.close();
