// Chup hinh muc 3.3: tro ly AI NCC tra loi "vat tu nen mua cua NCC nao" (goi Gemini that) + sinh lai hinh ket qua kiem thu.
// Can: backend cong 3999 (PG_DATABASE=datn_erp_test du lieu lon), frontend Vite cong 5199 (VITE_API_TARGET=http://localhost:3999).
// Chay: node chup_tro_ly_ncc.mjs  -> anh/c3_5_tro_ly_ncc.png, anh/c3_4_ket_qua_kiem_thu.png
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
let ad = await h(null, 'POST', '/auth/login', { username: 'ngocson', password: 'ngocson123456' });
if (ad.buoc === 'cai_2fa') {
  const k = await h(null, 'POST', '/auth/2fa/khoi-tao', { ma_tam: ad.ma_tam });
  ad = await h(null, 'POST', '/auth/2fa/kich-hoat', { ma_tam: k.ma_tam, ma: maTai(k.khoa, buocHienTai()) });
}

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
// c3_5: tro ly NCC (khung chat duoc keo cao de thay tron cau tra loi)
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1366, height: 1000, deviceScaleFactor: 1.5 });
  await p.goto(`${F}/login`, { waitUntil: 'networkidle0' });
  await p.evaluate((s) => localStorage.setItem('erp-auth', JSON.stringify({ state: { token: s.token, user: s.user }, version: 0 })), ad);
  await p.goto(`${F}/`, { waitUntil: 'networkidle0' }); await cho(800);
  await p.addStyleTag({ content: '.chat-noi{height:960px!important;max-height:none!important;width:560px!important}' });
  await p.click('.chat-noi-nut'); await p.waitForSelector('.chat-noi'); await cho(600);
  const [ncc] = await p.$$("xpath/.//div[contains(@class,'chat-noi-sp')]//button[normalize-space(.)='NCC']");
  if (!ncc) throw new Error('Khong thay chip NCC (tai khoan chua co quyen tro_ly.ncc?)');
  await ncc.click(); await cho(500);
  await p.type('.chat-nhap textarea', 'Sàn SPC vân gỗ 4mm nên mua của NCC nào?'); await p.keyboard.press('Enter'); await cho(1500);
  await p.waitForFunction(() => !document.body.innerText.includes('Đang trả lời...'), { timeout: 120000 }); await cho(800);
  const loi = await p.$eval('.chat-noi', (e) => e.querySelector('.chat-noi-loi')?.innerText || '');
  if (loi) throw new Error(`Tro ly bao loi: ${loi}`);
  const el = await p.$('.chat-noi'); await el.screenshot({ path: path.join(OUT, 'c3_5_tro_ly_ncc.png') });
  console.log('chup c3_5');
}
// c3_4: ket qua chay bo kiem thu tu dong (giong chup_ch3.mjs)
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
  console.log('chup c3_4', tong[1], 'ca,', nhom.length, 'nhom');
}
await browser.close();
