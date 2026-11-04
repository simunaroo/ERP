import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { batDau } from './helpers/moi_truong.js';

let ctx; const tk = {};
before(async () => {
  ctx = await batDau();
  for (const u of ['ngocson', 'thilan', 'thihong']) tk[u] = await ctx.login(u);
});
after(async () => { await ctx.ketThuc(); });

const b64 = (x) => Buffer.from(x).toString('base64');
const doc = (ten, data, t = tk.ngocson) => ctx.api(t, 'POST', '/nhap-so/doc-file', { ten, data });

describe('Nhập số từ file (Excel / CSV / TXT)', () => {
  it('TC-NSF-01: Excel có tiêu đề (cột đảo thứ tự), SĐT kiểu số mất số 0 đầu → đọc đúng, tự thêm 0', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('So');
    ws.addRow(['Họ tên', 'Số điện thoại', 'Nhu cầu', 'Nguồn']);
    ws.addRow(['Anh Ba', 912000111, 'Sàn gỗ 30m2', 'Zalo']);
    ws.addRow(['Chị Tư', '0987 000 222', '', 'FB']);
    ws.addRow(['', '', 'Dòng không có số', '']);
    const r = await doc('danh-sach.xlsx', b64(await wb.xlsx.writeBuffer()));
    assert.equal(r.s, 200, r.d?.message);
    assert.equal(r.d.theo_tieu_de, true);
    assert.equal(r.d.so_dong, 2);
    assert.deepEqual(r.d.dong[0], { ten: 'Anh Ba', sdt: '0912000111', nhu_cau: 'Sàn gỗ 30m2', nguon: 'zalo' });
    assert.equal(r.d.dong[1].nguon, 'facebook');
  });

  it('TC-NSF-02: CSV dấu phẩy, địa chỉ có dấu phẩy trong ngoặc kép, có BOM; không có tiêu đề → theo thứ tự cột', async () => {
    const csv = '﻿0912000333,Anh Năm,"Cầu Giấy, Hà Nội",Ốp tường\r\n0912000444,Chị Sáu,"Quận 7, TP.HCM",\r\n';
    const r = await doc('so.csv', b64(csv));
    assert.equal(r.d.theo_tieu_de, false);
    assert.deepEqual(r.d.dong.map((d) => d.dia_chi), ['Cầu Giấy, Hà Nội', 'Quận 7, TP.HCM']);
    const r2 = await doc('so2.csv', b64('SĐT;Tên\n0912000555;Anh Bảy\n'));
    assert.deepEqual(r2.d.dong, [{ sdt: '0912000555', ten: 'Anh Bảy' }]);
  });

  it('TC-NSF-03: TXT dạng "SĐT | Tên | Địa chỉ | Nhu cầu" giống ô dán', async () => {
    const r = await doc('so.txt', b64('0912000666 | Anh Tám | Hà Đông | Sàn SPC\n0912 000 777 | Chị Chín\n'));
    assert.equal(r.d.so_dong, 2);
    assert.equal(r.d.dong[1].sdt, '0912 000 777'); // chuan hoa luc nhap, khong phai luc doc
  });

  it('TC-NSF-04: File mẫu tải về đọc lại được đúng 2 dòng ví dụ; file .xls cũ / rỗng / quá lớn bị từ chối', async () => {
    const f = await fetch(`${ctx.goc}/nhap-so/file-mau`, { headers: { Authorization: `Bearer ${tk.ngocson}` } });
    assert.equal(f.status, 200);
    const r = await doc('mau-nhap-so.xlsx', Buffer.from(await f.arrayBuffer()).toString('base64'));
    assert.deepEqual(r.d.dong.map((d) => d.sdt), ['0912345678', '0987654321']);
    assert.equal((await doc('cu.xls', b64('abc'))).s, 400);
    assert.equal((await doc('rong.txt', '')).s, 400);
    assert.equal((await doc('to.txt', b64('0'.repeat(2.1 * 1024 * 1024)))).s, 400);
  });

  it('TC-NSF-05: Đọc xong nhập được (luồng xem trước → nhập); Kế toán không có quyền đọc file', async () => {
    const r = await doc('so.txt', b64('0912000888 | Khách File\n'));
    const n = await ctx.api(tk.ngocson, 'POST', '/nhap-so', { ds: r.d.dong });
    assert.equal(n.d.tao, 1);
    assert.equal((await doc('so.txt', b64('0912000999'), tk.thihong)).s, 403);
  });
});
