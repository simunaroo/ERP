import ExcelJS from 'exceljs';

// Xuat bang ra file .xlsx va gui ve trinh duyet.
// cot: [{ key, nhan, rong?, kieu?: 'tien' | 'so' | 'pct' | 'ngay' | 'chu' }]; dong: mang object; tong: object dong tong (tuy chon).
export async function xuatExcel(res, { tenFile, tieuDe, moTa, cot, dong, tong }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERP NST';
  const ws = wb.addWorksheet('Dữ liệu', { views: [{ state: 'frozen', ySplit: moTa ? 4 : 3 }] });
  ws.columns = cot.map((c) => ({ key: c.key, width: c.rong || 16 }));
  ws.mergeCells(1, 1, 1, cot.length);
  ws.getCell(1, 1).value = tieuDe;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  if (moTa) { ws.mergeCells(2, 1, 2, cot.length); ws.getCell(2, 1).value = moTa; ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF666666' } }; }
  const hangDau = ws.getRow(moTa ? 4 : 3);
  hangDau.values = cot.map((c) => c.nhan);
  hangDau.font = { bold: true };
  hangDau.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    cell.border = { bottom: { style: 'thin' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  const DINH_DANG = { tien: '#,##0', so: '#,##0.##', pct: '0.0"%"', ngay: 'dd/mm/yyyy' };
  const them = (o, dam = false) => {
    const r = ws.addRow(cot.map((c) => {
      const v = o[c.key];
      if (v === null || v === undefined) return null;
      if (c.kieu === 'ngay') return new Date(v);
      if (['tien', 'so', 'pct'].includes(c.kieu)) return Number(v);
      return v;
    }));
    cot.forEach((c, i) => { if (DINH_DANG[c.kieu]) r.getCell(i + 1).numFmt = DINH_DANG[c.kieu]; });
    if (dam) r.font = { bold: true };
  };
  dong.forEach((o) => them(o));
  if (tong) them(tong, true);
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', `attachment; filename="${tenFile}"; filename*=UTF-8''${encodeURIComponent(tenFile)}`);
  await wb.xlsx.write(res);
  res.end();
}
