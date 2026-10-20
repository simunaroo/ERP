import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau } from './helpers/moi_truong.js';

let ctx; const tk = {};
before(async () => {
  ctx = await batDau();
  for (const u of ['ngocson', 'thilan', 'vanhung', 'thihong']) tk[u] = await ctx.login(u);
});
after(async () => { await ctx.ketThuc(); });

let soChay = 0;
const soMoi = () => `0987${String(++soChay).padStart(6, '0')}`;
const nhapNhieu = (token, n, them = {}) => ctx.api(token, 'POST', '/nhap-so', { ds: Array.from({ length: n }, () => ({ sdt: soMoi(), nguon: 'facebook', ...them })) });
const demTheoSale = async () => Object.fromEntries((await ctx.sql(
  `SELECT sale_id, count(*)::int AS n FROM chia_so_log WHERE kieu = 'tu_dong' GROUP BY sale_id`)).map((r) => [r.sale_id, r.n]));
const apiNgoai = (khoa, body) => fetch(`${ctx.goc}/nhap-so/tu-dong`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(khoa ? { 'X-Api-Key': khoa } : {}) }, body: JSON.stringify(body),
});

describe('Nhập số và chia số cho Sale', () => {
  it('TC-NS-01: Chưa cấu hình tỷ lệ → Admin nhập 10 số, chia đều 5/5 cho 2 Sale', async () => {
    const r = await nhapNhieu(tk.ngocson, 10);
    assert.equal(r.s, 201);
    assert.equal(r.d.tao, 10);
    assert.deepEqual(await demTheoSale(), { 2: 5, 3: 5 });
    assert.equal((await ctx.api(tk.ngocson, 'GET', '/nhap-so/ty-le')).d.che_do, 'chia_deu');
  });

  it('TC-NS-02: Đặt tỷ lệ 70/30 → số mới bù cho đúng tỷ lệ tháng (20 số: 14/6)', async () => {
    const r = await ctx.api(tk.ngocson, 'PUT', '/nhap-so/ty-le', { ds: [{ sale_id: 2, ty_le: 70 }, { sale_id: 3, ty_le: 30 }] });
    assert.equal(r.s, 200);
    assert.equal(r.d.che_do, 'theo_ty_le');
    await nhapNhieu(tk.ngocson, 10);
    assert.deepEqual(await demTheoSale(), { 2: 14, 3: 6 });
  });

  it('TC-NS-03: Tỷ lệ 0% → Sale đó không nhận số; tổng ≠ 100% bị từ chối', async () => {
    assert.equal((await ctx.api(tk.ngocson, 'PUT', '/nhap-so/ty-le', { ds: [{ sale_id: 2, ty_le: 60 }, { sale_id: 3, ty_le: 30 }] })).s, 400);
    await ctx.api(tk.ngocson, 'PUT', '/nhap-so/ty-le', { ds: [{ sale_id: 2, ty_le: 0 }, { sale_id: 3, ty_le: 100 }] });
    const r = await nhapNhieu(tk.ngocson, 3);
    assert.ok(r.d.ket_qua.every((k) => k.sale_id === 3));
  });

  it('TC-NS-04: Số trùng (kể cả viết +84 / có dấu cách) không tạo mới, báo Sale đang giữ', async () => {
    const r = await ctx.api(tk.ngocson, 'POST', '/nhap-so', { ds: [{ sdt: '+84 901 000 001' }, { sdt: '0901000001' }, { sdt: '12345' }] });
    assert.equal(r.d.tao, 0);
    assert.equal(r.d.trung, 2);
    assert.equal(r.d.loi, 1);
    assert.equal(r.d.ket_qua[0].trung.sale, 'Nguyễn Thị Lan');
  });

  it('TC-NS-05: Sale tự nhập → số thuộc chính Sale đó, nguồn "Sale tự tìm", không tính vào tỷ lệ chia', async () => {
    const truoc = await demTheoSale();
    const r = await ctx.api(tk.thilan, 'POST', '/nhap-so', { sdt: soMoi(), ten: 'Anh Tự Tìm' });
    assert.equal(r.d.ket_qua[0].sale_id, 2);
    const [kh] = await ctx.sql('SELECT nguon, sale_phu_trach_id FROM khach_hang WHERE id = $1', [r.d.ket_qua[0].khach_hang_id]);
    assert.deepEqual(kh, { nguon: 'sale_tu_tim', sale_phu_trach_id: 2 });
    assert.deepEqual(await demTheoSale(), truoc);
  });

  it('TC-NS-06: API tự động: sai/thiếu key → 401; đúng key → số được chia, Sale nhận thông báo', async () => {
    assert.equal((await apiNgoai(null, { sdt: soMoi() })).status, 401);
    assert.equal((await apiNgoai('sai', { sdt: soMoi() })).status, 401);
    const sdt = soMoi();
    const r = await apiNgoai('khoa-api-test', { sdt, ten: 'Chị Web', nguon: 'website', nhu_cau: 'Sàn gỗ 60m2' });
    assert.equal(r.status, 201);
    const d = await r.json();
    assert.equal(d.ket_qua[0].sale_id, 3); // dang 0/100
    const tb = (await ctx.api(tk.vanhung, 'GET', '/thong-bao')).d.items.find((t) => t.tieu_de.includes(sdt));
    assert.equal(tb.link, `/khach-hang/${d.ket_qua[0].khach_hang_id}`);
    const [log] = await ctx.sql('SELECT kenh, nguoi_nhap_id FROM chia_so_log WHERE khach_hang_id = $1', [d.ket_qua[0].khach_hang_id]);
    assert.deepEqual(log, { kenh: 'api', nguoi_nhap_id: null });
  });

  it('TC-NS-07: Phân quyền: Kế toán không nhập số; Sale không xem/sửa tỷ lệ; Sale chỉ thấy số mình nhập', async () => {
    assert.equal((await nhapNhieu(tk.thihong, 1)).s, 403);
    assert.equal((await ctx.api(tk.thilan, 'GET', '/nhap-so/ty-le')).s, 403);
    assert.equal((await ctx.api(tk.thilan, 'PUT', '/nhap-so/ty-le', { ds: [{ sale_id: 2, ty_le: 100 }] })).s, 403);
    const ds = (await ctx.api(tk.thilan, 'GET', '/nhap-so/gan-day')).d.items;
    assert.ok(ds.length >= 1 && ds.every((x) => x.nguoi_nhap === 'Nguyễn Thị Lan'));
  });

  it('TC-NS-08: Số mới chia cho Sale hiện trong "Việc cần làm"', async () => {
    const viec = (await ctx.api(tk.vanhung, 'GET', '/tong-quan')).d.viec.find((v) => v.nhan === 'Số mới chưa liên hệ');
    assert.ok(viec.so >= 1);
  });

  it('TC-NS-09: Nhập đồng thời 2 lô → không lệch tỷ lệ, không lọt số trùng', async () => {
    await ctx.api(tk.ngocson, 'PUT', '/nhap-so/ty-le', { ds: [{ sale_id: 2, ty_le: 50 }, { sale_id: 3, ty_le: 50 }] });
    await ctx.sql('DELETE FROM chia_so_log');
    const chung = soMoi();
    const lo = (n) => ctx.api(tk.ngocson, 'POST', '/nhap-so', { ds: [{ sdt: chung }, ...Array.from({ length: n }, () => ({ sdt: soMoi() }))] });
    const [a, b] = await Promise.all([lo(5), lo(5)]);
    assert.equal(a.d.tao + b.d.tao, 11); // so chung chi tao 1 lan
    assert.deepEqual(await demTheoSale(), { 2: 6, 3: 5 });
  });
});

describe('Admin chọn Sale khi nhập và chuyển số', () => {
  it('TC-NS-10: Admin chọn Sale khi nhập → số về đúng Sale đó, không tính vào tỷ lệ chia', async () => {
    const truoc = await demTheoSale();
    const r = await ctx.api(tk.ngocson, 'POST', '/nhap-so', { sale_id: 3, ds: [{ sdt: soMoi() }, { sdt: soMoi(), sale_id: 2 }] });
    assert.deepEqual(r.d.ket_qua.map((k) => k.sale_id), [3, 2]); // sale_id cua dong uu tien hon cua ca lo
    assert.deepEqual(await demTheoSale(), truoc);
    const [log] = await ctx.sql('SELECT kieu FROM chia_so_log WHERE khach_hang_id = $1', [r.d.ket_qua[0].khach_hang_id]);
    assert.equal(log.kieu, 'admin_chon');
    assert.equal((await ctx.api(tk.ngocson, 'POST', '/nhap-so', { sale_id: 4, sdt: soMoi() })).s, 400); // id 4 la Van hanh
  });

  it('TC-NS-11: Admin chuyển khách sang Sale khác → Sale mới thấy và được báo, Sale cũ mất quyền xem, có lịch sử', async () => {
    const r = await ctx.api(tk.ngocson, 'POST', '/nhap-so', { sale_id: 2, sdt: soMoi(), ten: 'Khách Chuyển' });
    const id = r.d.ket_qua[0].khach_hang_id;
    assert.equal((await ctx.api(tk.ngocson, 'PUT', `/nhap-so/khach/${id}/chuyen-sale`, { sale_id: 3 })).s, 400); // thieu ly do
    assert.equal((await ctx.api(tk.ngocson, 'PUT', `/nhap-so/khach/${id}/chuyen-sale`, { sale_id: 2, ly_do: 'x' })).s, 400); // trung Sale cu
    const c = await ctx.api(tk.ngocson, 'PUT', `/nhap-so/khach/${id}/chuyen-sale`, { sale_id: 3, ly_do: 'Nguyễn Thị Lan nghỉ phép' });
    assert.equal(c.s, 200);
    assert.equal((await ctx.api(tk.thilan, 'GET', `/khach-hang/${id}`)).s, 403);
    const kh = (await ctx.api(tk.vanhung, 'GET', `/khach-hang/${id}`)).d;
    assert.equal(kh.sale, 'Trần Văn Hùng');
    assert.equal(kh.giao_so[0].kieu, 'chuyen');
    assert.equal(kh.giao_so[0].tu_sale, 'Nguyễn Thị Lan');
    assert.ok((await ctx.api(tk.vanhung, 'GET', '/thong-bao')).d.items.some((t) => t.tieu_de.includes('Bạn được chuyển khách: Khách Chuyển')));
    assert.ok((await ctx.api(tk.thilan, 'GET', '/thong-bao')).d.items.some((t) => t.tieu_de.includes('đã chuyển cho Trần Văn Hùng')));
    // Danh sach "so da nhap" khong hien dong chuyen thanh 1 so moi
    const ds = (await ctx.api(tk.ngocson, 'GET', '/nhap-so/gan-day?limit=100')).d.items.filter((x) => x.khach_hang_id === id);
    assert.equal(ds.length, 1);
  });

  it('TC-NS-12: Sale không chuyển được khách', async () => {
    assert.equal((await ctx.api(tk.thilan, 'PUT', '/nhap-so/khach/1/chuyen-sale', { sale_id: 3, ly_do: 'x' })).s, 403);
  });
});
