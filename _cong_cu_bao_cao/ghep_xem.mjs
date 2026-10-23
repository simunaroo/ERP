import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [ra, ...ds] = process.argv.slice(2);
const html = `<body style="margin:0;display:grid;grid-template-columns:repeat(3,520px);gap:6px;background:#888">${ds.map((f) => `<div style="background:#fff"><div style="font:12px sans-serif">${f}</div><img src="data:image/png;base64,${fs.readFileSync('anh/' + f).toString('base64')}" style="width:520px"></div>`).join('')}</body>`;
const br = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await br.newPage(); await p.setViewport({ width: 1572, height: 400 }); await p.setContent(html);
await p.screenshot({ path: ra, fullPage: true }); await br.close();
