import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { batDau, taoDonChot, muaDuHang, homNay } from './helpers/moi_truong.js';

let ctx; const tk = {};
before(async () => {
  ctx = await batDau();
  for (const u of ['ngocson', 'thilan', 'vannam', 'thihong']) tk[u] = await ctx.login(u);
});
after(async () => { await ctx.ketThuc(); });

const taiExcel = async (token, url) => {
  const r = await fetch(`${ctx.goc}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  const wb = new ExcelJS.Workbook();
  if (r.ok) await wb.xlsx.load(Buffer.from(await r.arrayBuffer()));
  return { s: r.status, loai: r.headers.get('content-type'), ws: wb.worksheets[0] };
};

describe('Báo cáo lãi/lỗ và xuất Excel', () => {
  let don;
  it('TC-BC-01: Lãi gộp = doanh thu − chi NCC − mua bổ sung − công thợ; chi NCC = SL × giá chốt × (1 + VAT)', async () => {
    don = await taoDonChot(ctx, tk.thilan); // 10 x 300.000 + 5 x 250.000 = 4.250.000
    await ctx.api(tk.vannam, 'PATCH', `/don-hang/${don.id}/phuong-an`, { phuong_an_van_chuyen: 'Xe tải', phuong_an_thi_cong: 'Không' });
    await muaDuHang(ctx, tk.vannam, don.id);
    const r = await ctx.api(tk.thihong, 'GET', `/bao-cao/lai-lo?tu=${homNay()}&den=${homNay()}&limit=100`);
    assert.equal(r.s, 200);
    const x = r.d.items.find((d) => d.id === don.id);
    assert.equal(x.doanh_thu, 4250000);
    const [{ chi }] = await ctx.sql(
      `SELECT round(sum(v.so_luong_can * m.gia_chot * (1 + m.vat_pct / 100)))::bigint AS chi FROM don_hang_vat_tu v JOIN mua_hang_dong m ON m.don_hang_vat_tu_id = v.id WHERE v.don_hang_id = $1`, [don.id]);
    assert.equal(x.chi_ncc, Number(chi));
    assert.ok(x.chi_ncc > 0);
    assert.equal(x.lai_gop, x.doanh_thu - x.chi_ncc - x.chi_ncc_uoc_tinh - x.gia_von_tu_sx - x.mua_bo_sung - x.cong_tho);
    assert.equal(x.tam_tinh, true); // chua quyet toan
    assert.equal(r.d.tong.doanh_thu, r.d.items.reduce((a, d) => a + d.doanh_thu, 0));
  });

  it('TC-BC-02: Lọc "chỉ đơn lỗ" chỉ trả đơn lãi gộp < 0; khoảng ngày sai → 400', async () => {
    const r = await ctx.api(tk.ngocson, 'GET', '/bao-cao/lai-lo?tu=2020-01-01&chi_lo=1&limit=100');
    assert.ok(r.d.items.every((d) => d.lai_gop < 0));
    assert.equal((await ctx.api(tk.ngocson, 'GET', '/bao-cao/lai-lo?tu=2026-12-01&den=2026-01-01')).s, 400);
  });

  it('TC-BC-03: Sale và Vận hành không xem được báo cáo lãi/lỗ', async () => {
    assert.equal((await ctx.api(tk.thilan, 'GET', '/bao-cao/lai-lo')).s, 403);
    assert.equal((await ctx.api(tk.vannam, 'GET', '/bao-cao/lai-lo')).s, 403);
  });

  it('TC-BC-04: Xuất Excel lãi/lỗ: file .xlsx đúng tiêu đề, có dòng tổng khớp số liệu', async () => {
    const f = await taiExcel(tk.thihong, `/bao-cao/lai-lo/excel?tu=${homNay()}&den=${homNay()}`);
    assert.equal(f.s, 200);
    assert.match(f.loai, /spreadsheetml/);
    assert.equal(f.ws.getCell('A1').value, 'BÁO CÁO LÃI/LỖ GỘP THEO ĐƠN HÀNG');
    const cuoi = f.ws.getRow(f.ws.rowCount);
    assert.match(String(cuoi.getCell(1).value), /^Tổng \d+ đơn$/);
    const json = await ctx.api(tk.thihong, 'GET', `/bao-cao/lai-lo?tu=${homNay()}&den=${homNay()}`);
    assert.equal(cuoi.getCell(13).value, json.d.tong.lai_gop);
  });

  it('TC-BC-05: Xuất Excel danh sách đơn giữ phạm vi dữ liệu: Sale chỉ có đơn của mình', async () => {
    const f = await taiExcel(tk.thilan, '/don-hang/excel');
    assert.equal(f.s, 200);
    const sales = new Set();
    f.ws.eachRow((row, i) => { if (i > 4 && row.getCell(1).value !== 'Tổng') sales.add(row.getCell(7).value); });
    assert.deepEqual([...sales], ['Nguyễn Thị Lan']);
  });

  it('TC-BC-06: Xuất Excel đề xuất chi và công nợ khách (Kế toán); Sale bị chặn', async () => {
    assert.equal((await taiExcel(tk.thihong, '/cong-no/de-xuat-chi/excel')).s, 200);
    assert.equal((await taiExcel(tk.thihong, '/thu-tien/cong-no/excel')).s, 200);
    assert.equal((await taiExcel(tk.thilan, '/cong-no/de-xuat-chi/excel')).s, 403);
  });
});
