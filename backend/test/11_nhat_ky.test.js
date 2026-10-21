import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau, taoDonChot } from './helpers/moi_truong.js';

let ctx; const tk = {};
before(async () => {
  ctx = await batDau();
  for (const u of ['ngocson', 'thilan', 'vannam', 'thihong']) tk[u] = await ctx.login(u);
});
after(async () => { await ctx.ketThuc(); });

const nhatKy = async (q) => (await ctx.api(tk.ngocson, 'GET', `/nhat-ky?${new URLSearchParams(q)}`)).d;

describe('Nhật ký thay đổi (trigger)', () => {
  it('TC-NK-01: Dữ liệu mẫu (seed) không sinh nhật ký', async () => {
    const [{ n }] = await ctx.sql('SELECT count(*)::int AS n FROM nhat_ky_thay_doi');
    assert.equal(n, 0);
  });

  it('TC-NK-02: Tạo đơn qua web → ghi INSERT kèm đúng người thao tác, kênh web', async () => {
    const don = await taoDonChot(ctx, tk.thilan);
    const kq = await nhatKy({ bang: 'don_hang', ban_ghi: don.id, hanh_dong: 'INSERT' });
    assert.equal(kq.items.length, 1);
    assert.equal(kq.items[0].nguoi, 'Nguyễn Thị Lan');
    assert.equal(kq.items[0].kenh, 'web');
    assert.equal(kq.items[0].du_lieu_moi.ma_don, don.ma_don);
    // Theo don: gom ca dong vat tu cua don
    const theoDon = await nhatKy({ don_hang_id: don.id });
    assert.ok(theoDon.items.some((x) => x.bang === 'don_hang_vat_tu'));
  });

  it('TC-NK-03: UPDATE chỉ lưu các cột thực sự đổi (cũ → mới)', async () => {
    const don = await taoDonChot(ctx, tk.thilan);
    await ctx.api(tk.vannam, 'PATCH', `/don-hang/${don.id}/phuong-an`, { phuong_an_van_chuyen: 'Xe tải 2 tấn', phuong_an_thi_cong: 'Không' });
    const u = (await nhatKy({ bang: 'don_hang', ban_ghi: don.id, hanh_dong: 'UPDATE' })).items[0];
    assert.equal(u.nguoi, 'Đỗ Văn Nam');
    assert.equal(u.du_lieu_moi.phuong_an_van_chuyen, 'Xe tải 2 tấn');
    assert.equal(u.du_lieu_cu.phuong_an_van_chuyen, null);
    assert.ok(!('ma_don' in u.du_lieu_moi)); // cot khong doi thi khong luu
  });

  it('TC-NK-04: Đổi mật khẩu → có nhật ký nhưng không lộ hash mật khẩu', async () => {
    const r = await ctx.api(tk.thihong, 'POST', '/auth/doi-mat-khau', { mat_khau_cu: 'thihong123456', mat_khau_moi: 'thihong654321' });
    assert.ok(r.s < 300, `đổi mật khẩu lỗi ${r.s}`);
    const [x] = (await nhatKy({ bang: 'users', hanh_dong: 'UPDATE' })).items;
    assert.equal(x.du_lieu_moi.password_hash, '***');
    assert.equal(x.du_lieu_cu.password_hash, '***');
    tk.thihong = await ctx.login('thihong', 'thihong654321'); // doi mat khau -> phien cu het hieu luc
  });

  it('TC-NK-05: Thao tác lỗi (rollback) không để lại nhật ký', async () => {
    const truoc = (await nhatKy({ bang: 'de_xuat_chi' })).tong;
    const r = await ctx.api(tk.thihong, 'POST', '/cong-no/de-xuat-chi', { loai_chi: 'coc', don_hang_id: 1, ncc_id: 2, so_tien: 999999999 });
    assert.equal(r.s, 400);
    assert.equal((await nhatKy({ bang: 'de_xuat_chi' })).tong, truoc);
  });

  it('TC-NK-06: Chỉ Admin xem nhật ký', async () => {
    assert.equal((await ctx.api(tk.thihong, 'GET', '/nhat-ky')).s, 403);
    assert.equal((await ctx.api(tk.thilan, 'GET', '/nhat-ky')).s, 403);
  });
});
