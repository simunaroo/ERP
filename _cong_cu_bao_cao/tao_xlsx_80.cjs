// Chuyen so_test_80.txt thanh so_test_80.xlsx (co dong tieu de + cot Nguon) de thu nhap so tu file Excel.
const E = require('F:/DATN/backend/node_modules/exceljs');
const fs = require('fs');
const path = require('path');

const dong = fs.readFileSync(path.join(__dirname, 'so_test_80.txt'), 'utf8').trim().split(/\r?\n/).map((l) => l.split('|').map((x) => x.trim()));
const wb = new E.Workbook();
const ws = wb.addWorksheet('So');
ws.addRow(['SĐT', 'Tên', 'Địa chỉ', 'Nhu cầu', 'Nguồn']);
const NGUON = ['Facebook', 'Zalo', 'Google', 'Website', 'TikTok'];
dong.forEach((d, i) => ws.addRow([d[0].replace(/\s/g, ''), d[1] || '', d[2] || '', d[3] || '', NGUON[i % 5]]));
ws.columns.forEach((c, i) => { c.width = [14, 22, 26, 34, 12][i]; });
wb.xlsx.writeFile(path.join(__dirname, 'so_test_80.xlsx')).then(() => console.log('Da tao so_test_80.xlsx', dong.length, 'dong'));
