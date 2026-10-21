import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau, taoDonChot, ANH_BILL } from './helpers/moi_truong.js';

let ctx; const tk = {};
before(async () => {
  ctx = await batDau();
  for (const u of ['ngocson', 'thilan', 'vannam', 'thihong']) tk[u] = await ctx.login(u);
});
after(async () => { await ctx.ketThuc(); });

let soGd = 0;
// Payload dung dinh dang webhook SePay
const sepay = (loai, soTien, noiDung, id = `SP${++soGd}`) => ({
  id, gateway: 'Vietcombank', transactionDate: '2026-10-21 10:15:00', accountNumber: '0123456789',
  content: noiDung, transferType: loai, transferAmount: soTien, referenceCode: `FT${soGd}`,
});
const webhook = async (body, khoa = 'khoa-ngan-hang-test') => {
  const r = await fetch(`${ctx.goc}/ngan-hang/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(khoa ? { Authorization: `Apikey ${khoa}` } : {}) }, body: JSON.stringify(body),
  });
  return { s: r.status, d: await r.json() };
};
const daThu = async (donId) => Number((await ctx.sql('SELECT da_thu_khach FROM v_don_hang_tien WHERE don_hang_id = $1', [donId]))[0].da_thu_khach);

describe('Đối soát ngân hàng (webhook SePay)', () => {
  let don;
  it('TC-NH-01: Sai/thiếu API key → 401; tiền vào có mã đơn → tự tạo phiếu thu đã xác nhận', async () => {
    don = await taoDonChot(ctx, tk.thilan); // tong 4.250.000
    assert.equal((await webhook(sepay('in', 1000000, `${don.ma_don} THANH TOAN`), null)).s, 401);
    assert.equal((await webhook(sepay('in', 1000000, `${don.ma_don} THANH TOAN`), 'sai')).s, 401);
    const r = await webhook(sepay('in', 1000000, `${don.ma_don} THANH TOAN`));
    assert.equal(r.s, 200);
    assert.equal(r.d.success, true);
    assert.equal(r.d.trang_thai, 'da_khop');
    assert.equal(r.d.cach, 'tao_phieu');
    assert.equal(await daThu(don.id), 1000000);
    const [p] = await ctx.sql('SELECT hinh_thuc, trang_thai, bill_anh, nguoi_xac_nhan_id, nguoi_tao_id FROM thanh_toan_khach WHERE id = $1', [r.d.phieuId]);
    assert.deepEqual(p, { hinh_thuc: 'chuyen_khoan', trang_thai: 'da_xac_nhan', bill_anh: null, nguoi_xac_nhan_id: null, nguoi_tao_id: 2 });
  });

  it('TC-NH-02: Có phiếu chờ xác nhận đúng số tiền → ngân hàng tự xác nhận phiếu đó (nội dung mất dấu gạch vẫn nhận)', async () => {
    const tao = await ctx.api(tk.thilan, 'POST', '/thu-tien', { don_hang_id: don.id, loai: 'tam_ung', so_tien: 500000, hinh_thuc: 'chuyen_khoan', bill: ANH_BILL });
    assert.equal(tao.d.trang_thai, 'cho_xac_nhan');
    const r = await webhook(sepay('in', 500000, `MBVCB.123 ${don.ma_don.replaceAll('-', '')} THANH TOAN`));
    assert.equal(r.d.cach, 'xac_nhan_phieu');
    assert.equal(r.d.phieuId, tao.d.id);
    const ds = (await ctx.api(tk.thilan, 'GET', `/thu-tien/don/${don.id}`)).d.phieu;
    assert.equal(ds.find((x) => x.id === tao.d.id).nguoi_xac_nhan, 'Ngân hàng (tự động)');
    assert.ok((await ctx.api(tk.thilan, 'GET', '/thong-bao')).d.items.some((t) => t.tieu_de.includes('ngân hàng tự xác nhận')));
  });

  it('TC-NH-03: Ngân hàng gửi lại cùng giao dịch → không xử lý lần hai', async () => {
    const truoc = await daThu(don.id);
    const body = sepay('in', 200000, `${don.ma_don} THANH TOAN`, 'SP-LAP');
    await webhook(body);
    const r = await webhook(body);
    assert.equal(r.d.trung, true);
    assert.equal(await daThu(don.id), truoc + 200000);
  });

  it('TC-NH-04: Không có mã đơn / vượt số còn phải thu → chưa khớp, báo Kế toán; Kế toán khớp tay hoặc bỏ qua', async () => {
    const a = await webhook(sepay('in', 300000, 'CHUYEN TIEN'));
    assert.equal(a.d.trang_thai, 'chua_khop');
    const b = await webhook(sepay('in', 99000000, `${don.ma_don} THANH TOAN`));
    assert.equal(b.d.trang_thai, 'chua_khop');
    assert.ok((await ctx.api(tk.thihong, 'GET', '/thong-bao')).d.items.some((t) => t.tieu_de.includes('chưa khớp')));
    const truoc = await daThu(don.id);
    assert.equal((await ctx.api(tk.thihong, 'POST', `/ngan-hang/giao-dich/${a.d.id}/khop`, { don_hang_id: don.id })).s, 200);
    assert.equal(await daThu(don.id), truoc + 300000);
    assert.equal((await ctx.api(tk.thihong, 'POST', `/ngan-hang/giao-dich/${b.d.id}/bo-qua`, {})).s, 400);
    assert.equal((await ctx.api(tk.thihong, 'POST', `/ngan-hang/giao-dich/${b.d.id}/bo-qua`, { ly_do: 'Khách chuyển nhầm, đã hoàn' })).s, 200);
    const ds = (await ctx.api(tk.thihong, 'GET', '/ngan-hang/giao-dich?trang_thai=chua_khop')).d;
    assert.equal(ds.items.length, 0);
  });

  it('TC-NH-05: Tiền ra khớp nội dung CK của đề xuất chi đã duyệt → tự ghi "đã chi", không cần ảnh bill', async () => {
    const dxc = (await ctx.api(tk.thihong, 'POST', '/cong-no/de-xuat-chi', { loai_chi: 'coc', don_hang_id: 1, ncc_id: 2, so_tien: 1500 })).d;
    await ctx.api(tk.ngocson, 'POST', `/cong-no/de-xuat-chi/${dxc.id}/duyet`, { hanh_dong: 'duyet' });
    const ct = (await ctx.api(tk.thihong, 'GET', `/cong-no/de-xuat-chi/${dxc.id}`)).d;
    const r = await webhook(sepay('out', 1500, `IBFT ${ct.noi_dung_ck}`));
    assert.equal(r.d.cach, 'da_chi');
    const sau = (await ctx.api(tk.thihong, 'GET', `/cong-no/de-xuat-chi/${dxc.id}`)).d;
    assert.equal(sau.trang_thai, 'da_thanh_toan');
    const [p] = await ctx.sql('SELECT bill_anh, nguoi_tao_id FROM phieu_thanh_toan WHERE de_xuat_chi_id = $1', [dxc.id]);
    assert.deepEqual(p, { bill_anh: null, nguoi_tao_id: null });
  });

  it('TC-NH-06: Giả lập giao dịch chạy cùng luồng xử lý; Sale không được dùng', async () => {
    const r = await ctx.api(tk.thihong, 'POST', '/ngan-hang/gia-lap', { loai: 'vao', so_tien: 100000, noi_dung: `${don.ma_don} THANH TOAN` });
    assert.equal(r.s, 201);
    assert.equal(r.d.trang_thai, 'da_khop');
    assert.equal((await ctx.api(tk.thilan, 'POST', '/ngan-hang/gia-lap', { loai: 'vao', so_tien: 1, noi_dung: 'x' })).s, 403);
  });
});
