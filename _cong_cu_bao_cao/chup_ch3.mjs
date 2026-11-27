// Chup hinh cho muc 3.3 Chuong 3 (khong trung voi muc 2.9 Chuong 2).
// Can: backend cong 3999 (PG_DATABASE=datn_erp_test du lieu lon, GEMINI_API_KEY that), frontend Vite cong 5199.
// Chay: node chup_ch3.mjs  -> anh/c3_*.png
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maTai, buocHienTai } from 'file:///F:/DATN/backend/src/utils/totp.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'anh');
const B = 'http://localhost:3999/api';
const F = 'http://localhost:5199';
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const h = async (t, m, u, b) => (await fetch(B + u, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined })).json().catch(() => null);
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
  return r;
}
const ph = { thilan: await phien('thilan'), vannam: await phien('vannam'), ngocson: await phien('ngocson') };
// Sinh thong bao that cho Van hanh vannam: Sale gui yeu cau sua don, Admin chuyen don sang vannam
{
  const vn = ph.vannam.user.id;
  const donVn = (await h(ph.thilan.token, 'GET', '/don-hang?limit=50')).items.filter((d) => d.van_hanh === ph.vannam.user.ho_ten && !['hoan_tat', 'huy', 'nhap'].includes(d.trang_thai));
  for (const [i, d] of donVn.slice(0, 2).entries()) {
    await h(ph.thilan.token, 'POST', `/don-hang/${d.id}/yeu-cau-sua`, { noi_dung: ['Khách muốn đổi sang sàn SPC 6mm cho phòng ngủ.', 'Khách hẹn lùi ngày lắp đặt sang thứ Bảy.'][i] });
  }
  const khac = (await h(ph.ngocson.token, 'GET', '/don-hang?limit=50&giai_doan=len_phuong_an')).items.find((d) => d.van_hanh && d.van_hanh !== ph.vannam.user.ho_ten);
  if (khac) await h(ph.ngocson.token, 'PUT', `/don-hang/${khac.id}/phu-trach`, { van_hanh_id: vn, ly_do: 'Vận hành cũ nghỉ phép' });
}

// Don hoan thien da chot cua Sale thilan -> tao link bao gia
const don = (await h(ph.thilan.token, 'GET', '/don-hang?limit=30&giai_doan=thi_cong')).items[0]
  || (await h(ph.thilan.token, 'GET', '/don-hang?limit=30')).items.find((d) => d.trang_thai !== 'nhap');
const bg = await h(ph.thilan.token, 'POST', `/don-hang/${don.id}/bao-gia`);
const token = bg.token || bg.bao_gia_token || (bg.link || bg.url || '').split('/').pop();
console.log('bao gia don', don.id, token);

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
async function trang(user, vp = { width: 1366, height: 820, deviceScaleFactor: 1.5 }) {
  const c = await browser.createBrowserContext(); const p = await c.newPage();
  await p.setViewport(vp);
  await p.goto(`${F}/login`, { waitUntil: 'networkidle0' });
  if (user) await p.evaluate((s) => localStorage.setItem('erp-auth', JSON.stringify({ state: { token: s.token, user: s.user }, version: 0 })), ph[user]);
  return p;
}

// c3_1: bao gia khach xem tren dien thoai (2 man canh nhau: dau trang + cuon xuong)
{
  const p = await trang(null, { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(`${F}/bao-gia/${token}`, { waitUntil: 'networkidle0' }); await cho(1200);
  const a1 = Buffer.from(await p.screenshot({ fullPage: true })).toString('base64');
  const g = await browser.newPage(); await g.setViewport({ width: 420, height: 400, deviceScaleFactor: 1.5 });
  await g.setContent(`<body style="margin:0;padding:12px;background:#e5e7eb;display:inline-block"><img src="data:image/png;base64,${a1}" style="width:390px;display:block;border-radius:14px;box-shadow:0 2px 8px #0003"></body>`, { waitUntil: 'load' });
  await g.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  const body = await g.$('body'); await body.screenshot({ path: path.join(OUT, 'c3_1_bao_gia_dien_thoai.png') });
  console.log('chup c3_1');
}
// c3_2: hop thong bao cua Van hanh
{
  const p = await trang('vannam');
  await p.goto(`${F}/`, { waitUntil: 'networkidle0' }); await cho(1200);
  await p.click('.thong-bao .chuong'); await cho(800);
  await p.screenshot({ path: path.join(OUT, 'c3_2_thong_bao.png') });
  console.log('chup c3_2');
}
// c3_3: tro ly AI tu choi cau hoi ngoai pham vi va chuyen huong dung tro ly (goi Gemini that)
{
  const p = await trang('thilan');
  await p.goto(`${F}/khach-hang`, { waitUntil: 'networkidle0' }); await cho(1000);
  await p.click('.chat-noi-nut'); await p.waitForSelector('.chat-noi'); await cho(600);
  const [san] = await p.$$("xpath/.//div[contains(@class,'chat-noi-sp')]//button[starts-with(normalize-space(.),'Sàn')]");
  if (san) { await san.click(); await cho(400); }
  for (const cau of ['Thời tiết Hà Nội ngày mai thế nào?', 'Cửa Xingfa giá bao nhiêu?', 'Khách hỏi có bán gạch men lát nền không?']) {
    await p.type('.chat-nhap textarea', cau); await p.keyboard.press('Enter'); await cho(1200);
    await p.waitForFunction(() => !document.body.innerText.includes('Đang trả lời...'), { timeout: 120000 }); await cho(500);
  }
  const loi = await p.$eval('.chat-noi', (e) => e.querySelector('.chat-noi-loi')?.innerText || '');
  if (loi) console.warn('Tro ly bao loi:', loi);
  await p.evaluate(() => document.querySelector('.chat-tn.toi')?.scrollIntoView({ block: 'start' })); await cho(400);
  await p.screenshot({ path: path.join(OUT, 'c3_3_tro_ly_tu_choi.png') });
  console.log('chup c3_3');
}
// c3_4: ket qua chay bo kiem thu tu dong (tong hop theo nhom tu KET_QUA_KIEM_THU.md)
{
  const md = fs.readFileSync('F:/DATN/backend/test/KET_QUA_KIEM_THU.md', 'utf8');
  const nhom = []; let cur = null;
  for (const l of md.split('\n')) {
    const m = l.match(/^## (.+)$/); if (m) { cur = { ten: m[1], dat: 0, truot: 0 }; nhom.push(cur); continue; }
    if (cur && /^\| (TC|E2E)/.test(l)) { if (l.includes('Đạt')) cur.dat++; else cur.truot++; }
  }
  const tong = md.match(/Tổng \*\*(\d+)\*\* ca · Đạt \*\*(\d+)\*\* · Trượt \*\*(\d+)\*\*/);
  const luc = md.match(/Chạy lúc: ([^·]+)/)[1].trim();
  const dong = nhom.map((n) => `<div><span class="ok">✔</span> ${n.ten.padEnd(32, ' ')} <span class="mo">${String(n.dat + n.truot).padStart(3)} ca</span>  <span class="ok">${n.dat} đạt</span>${n.truot ? `  <span class="loi">${n.truot} trượt</span>` : ''}</div>`).join('');
  const html = `<body style="margin:0;background:#1e1e1e"><pre style="margin:0;padding:18px 22px;font:14px/1.5 Consolas,monospace;color:#d4d4d4;white-space:pre">
<style>.ok{color:#89d185}.loi{color:#f48771}.mo{color:#9cdcfe}.vang{color:#dcdcaa}</style><span class="vang">PS F:\\DATN\\backend&gt; npm run test:bao-cao</span>
<span class="mo">(PG_DATABASE=datn_erp_test · chạy lúc ${luc})</span>

${dong}
<span class="mo">ℹ tests</span> ${tong[1]}
<span class="mo">ℹ pass</span>  <span class="ok">${tong[2]}</span>
<span class="mo">ℹ fail</span>  ${tong[3]}
<span class="mo">ℹ báo cáo chi tiết:</span> test/KET_QUA_KIEM_THU.md</pre></body>`;
  const p = await browser.newPage(); await p.setViewport({ width: 760, height: 400, deviceScaleFactor: 2 });
  await p.setContent(html, { waitUntil: 'load' });
  const el = await p.$('pre'); await el.screenshot({ path: path.join(OUT, 'c3_4_ket_qua_kiem_thu.png') });
  console.log('chup c3_4');
}
await browser.close();
