// Thu man "Bao cao cham soc" (Admin) tren DB test: bang theo Sale, danh sach ton dong, AI nhan xet.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
for (let i = 0; i < 40; i++) { try { const a = await fetch('http://localhost:5199/login'); const b = await fetch('http://localhost:3999/api/health'); if (a.ok && b.ok) break; } catch { /* doi */ } await new Promise((r) => setTimeout(r, 1000)); }
const br = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const loi = []; const p = await br.newPage(); await p.setViewport({ width: 1440, height: 900 }); p.on('pageerror', (e) => loi.push(e.message));
await p.goto('http://localhost:5199/login', { waitUntil: 'networkidle0' });
await p.type('#u', 'ngocson'); await p.type('#p', 'ngocson123456');
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}), p.keyboard.press('Enter')]);
await p.goto('http://localhost:5199/khach-hang/bao-cao', { waitUntil: 'networkidle0' });
await p.screenshot({ path: path.join(DIR, 'bcs1.png'), fullPage: true });
const [nut] = await p.$$("xpath/.//button[contains(., 'Phân tích bằng AI')]");
await nut.click();
await p.waitForFunction(() => !document.body.innerText.includes('AI đang phân tích'), { timeout: 90000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 500));
const ai = await p.evaluate(() => [...document.querySelectorAll('.card')].pop().innerText.slice(0, 1500));
console.log(ai);
console.log('loi:', loi);
await br.close();
