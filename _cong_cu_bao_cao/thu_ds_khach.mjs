// Chup danh sach khach cua Sale: cot "Nhan so" va ghi chu lan cham soc gan nhat.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
for (let i = 0; i < 40; i++) { try { const a = await fetch('http://localhost:5199/login'); const b = await fetch('http://localhost:3999/api/health'); if (a.ok && b.ok) break; } catch { /* doi */ } await new Promise((r) => setTimeout(r, 1000)); }
const br = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const loi = []; const p = await br.newPage(); await p.setViewport({ width: 1600, height: 1000 }); p.on('pageerror', (e) => loi.push(e.message));
await p.goto('http://localhost:5199/login', { waitUntil: 'networkidle0' });
await p.type('#u', process.argv[2] || 'thilan'); await p.type('#p', `${process.argv[2] || 'thilan'}123456`);
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}), p.keyboard.press('Enter')]);
await p.goto('http://localhost:5199/khach-hang', { waitUntil: 'networkidle0' });
await p.screenshot({ path: path.join(DIR, 'ds_khach.png') });
console.log('loi:', loi);
await br.close();
