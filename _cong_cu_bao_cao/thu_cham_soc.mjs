// Thu giao dien cham soc: cap nhat ngay tren dong danh sach khach + so dien thoai noi bat o chi tiet (DB test).
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
for (let i = 0; i < 40; i++) { try { const a = await fetch('http://localhost:5199/login'); const b = await fetch('http://localhost:3999/api/health'); if (a.ok && b.ok) break; } catch { /* doi server */ } await new Promise((r) => setTimeout(r, 1000)); }
const br = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const loi = []; const p = await br.newPage(); await p.setViewport({ width: 1366, height: 820 }); p.on('pageerror', (e) => loi.push(e.message));
await p.goto('http://localhost:5199/login', { waitUntil: 'networkidle0' });
await p.type('#u', 'thilan'); await p.type('#p', 'thilan123456');
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}), p.keyboard.press('Enter')]);
await p.goto('http://localhost:5199/khach-hang?trang_thai=moi', { waitUntil: 'networkidle0' });
const [nut] = await p.$$("xpath/.//button[text()='Cập nhật']");
await nut.click(); await new Promise((r) => setTimeout(r, 300));
await p.select('.cs-gon select', 'hen_goi_lai');
await new Promise((r) => setTimeout(r, 200));
await p.screenshot({ path: path.join(DIR, 'cs1.png') });
// Chon "Quan tam" + ghi chu -> Luu -> dong bien mat khoi bo loc "Moi"
await p.select('.cs-gon select', 'quan_tam');
await p.type('.cs-gon input.grow', 'Khách hỏi giá sàn SPC 40m2');
const truoc = await p.$$eval('tbody tr', (t) => t.length);
await p.click('.cs-gon button.btn'); await new Promise((r) => setTimeout(r, 1200));
const sau = await p.$$eval('tbody tr', (t) => t.length);
console.log('so dong truoc/sau khi luu (loc Moi):', truoc, sau);
const href = await p.$eval('tbody a[href^="/khach-hang/"]', (a) => a.getAttribute('href'));
await p.goto(`http://localhost:5199${href}`, { waitUntil: 'networkidle0' });
await p.screenshot({ path: path.join(DIR, 'cs2.png') });
console.log('loi:', loi);
await br.close();
