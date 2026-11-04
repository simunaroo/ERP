// Thu giao dien nhap so tu file Excel tren trinh duyet (DB test, cong 3999/5199).
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
for (let i = 0; i < 30; i++) { try { await fetch('http://localhost:5199/login'); await fetch('http://localhost:3999/api/health'); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
const br = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const loi = []; const p = await br.newPage(); await p.setViewport({ width: 1366, height: 950 }); p.on('pageerror', (e) => loi.push(e.message));
await p.goto('http://localhost:5199/login', { waitUntil: 'networkidle0' });
await p.type('#u', 'ngocson'); await p.type('#p', 'ngocson123456');
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}), p.keyboard.press('Enter')]);
await p.goto('http://localhost:5199/nhap-so', { waitUntil: 'networkidle0' });
const inp = await p.$('input[type=file]');
await inp.uploadFile(path.join(DIR, 'so_test_80.xlsx'));
await new Promise((r) => setTimeout(r, 1500));
await p.screenshot({ path: path.join(DIR, 'thu1.png') });
const [b] = await p.$$("xpath/.//button[starts-with(., 'Nhập 80')]");
console.log('nut Nhap 80:', Boolean(b));
if (b) { await b.click(); await new Promise((r) => setTimeout(r, 3000)); }
console.log('ket qua:', await p.$eval('.card .mt .small', (e) => e.innerText).catch(() => null), 'loi:', loi);
await br.close();
