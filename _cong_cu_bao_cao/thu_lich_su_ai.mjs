// Thu nhat ky AI nhan xet cham soc: chay AI 2 lan (lan 2 lam moi) -> lich su co 2 dong -> bam Xem ban cu.
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
const bam = async (chu) => { const [n] = await p.$$(`xpath/.//button[contains(., '${chu}')]`); await n.click(); };
const doiXong = () => p.waitForFunction(() => !document.body.innerText.includes('AI đang phân tích'), { timeout: 90000 }).catch(() => {});
console.log('truoc:', await p.evaluate(() => document.querySelector('#ai-nhan-xet').innerText.includes('Chưa có lần phân tích')));
await bam('Phân tích bằng AI'); await new Promise((r) => setTimeout(r, 300)); await doiXong();
await bam('Phân tích lại'); await new Promise((r) => setTimeout(r, 300)); await doiXong();
await new Promise((r) => setTimeout(r, 800));
console.log('lich su:', await p.evaluate(() => [...document.querySelectorAll('#ai-nhan-xet h3')].map((h) => h.innerText)));
const nut = await p.$$("xpath/.//button[normalize-space(.)='Xem']");
await nut[nut.length - 1].click(); await new Promise((r) => setTimeout(r, 800));
console.log('banner:', await p.evaluate(() => document.querySelector('#ai-nhan-xet .banner')?.innerText));
const card = await p.$('#ai-nhan-xet'); await card.screenshot({ path: path.join(DIR, 'ls_ai.png') });
console.log('loi:', loi);
await br.close();
