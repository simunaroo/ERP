import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau } from './helpers/moi_truong.js';

let ctx; const tk = {};
before(async () => {
  ctx = await batDau();
  for (const u of ['ngocson', 'thilan', 'vannam', 'thihong']) tk[u] = await ctx.login(u);
});
after(async () => { await ctx.ketThuc(); });

const quyenCua = async (vaiTro) => (await ctx.api(tk.ngocson, 'GET', '/phan-quyen')).d.gan[vaiTro];
const luu = (vaiTro, quyen) => ctx.api(tk.ngocson, 'PUT', `/phan-quyen/${vaiTro}`, { quyen });

describe('Phân quyền theo chức năng (RBAC)', () => {
  it('TC-PQ-01: Quyền mặc định giữ đúng phân quyền cũ; /auth/me trả danh sách quyền', async () => {
    const me = (await ctx.api(tk.thihong, 'GET', '/auth/me')).d;
    assert.ok(me.quyen.includes('chi.lap'));
    assert.ok(!me.quyen.includes('chi.duyet'));
    const dxc = await ctx.api(tk.thihong, 'POST', '/cong-no/de-xuat-chi', { loai_chi: 'coc', don_hang_id: 1, ncc_id: 2, so_tien: 1000 });
    assert.equal((await ctx.api(tk.thihong, 'POST', `/cong-no/de-xuat-chi/${dxc.d.id}/duyet`, { hanh_dong: 'duyet' })).s, 403);
  });

  it('TC-PQ-02: Admin cấp quyền "Duyệt chi" cho Kế toán → có hiệu lực ngay; thu lại → bị chặn ngay', async () => {
    const goc = await quyenCua('ke_toan');
    assert.equal((await luu('ke_toan', [...goc, 'chi.duyet'])).s, 200);
    const dxc = await ctx.api(tk.thihong, 'POST', '/cong-no/de-xuat-chi', { loai_chi: 'coc', don_hang_id: 1, ncc_id: 2, so_tien: 2000 });
    assert.equal((await ctx.api(tk.thihong, 'POST', `/cong-no/de-xuat-chi/${dxc.d.id}/duyet`, { hanh_dong: 'duyet' })).s, 200);
    await luu('ke_toan', goc);
    const dxc2 = await ctx.api(tk.thihong, 'POST', '/cong-no/de-xuat-chi', { loai_chi: 'coc', don_hang_id: 1, ncc_id: 2, so_tien: 3000 });
    assert.equal((await ctx.api(tk.thihong, 'POST', `/cong-no/de-xuat-chi/${dxc2.d.id}/duyet`, { hanh_dong: 'duyet' })).s, 403);
  });

  it('TC-PQ-03: Bỏ quyền "Xem khách hàng" của Sale → API khách hàng trả 403', async () => {
    const goc = await quyenCua('sale');
    await luu('sale', goc.filter((q) => q !== 'khach_hang.xem'));
    assert.equal((await ctx.api(tk.thilan, 'GET', '/khach-hang')).s, 403);
    assert.ok(!(await ctx.api(tk.thilan, 'GET', '/auth/me')).d.quyen.includes('khach_hang.xem'));
    await luu('sale', goc);
    assert.equal((await ctx.api(tk.thilan, 'GET', '/khach-hang')).s, 200);
  });

  it('TC-PQ-04: Không gán được quyền quản trị cho vai trò khác; Admin không tự mất quyền quản trị', async () => {
    assert.equal((await luu('sale', ['he_thong.quan_tri'])).s, 400);
    const r = await luu('admin', ['bao_cao.xem']);
    assert.equal(r.s, 200);
    assert.ok(r.d.gan.admin.includes('he_thong.quan_tri'));
    assert.equal((await ctx.api(tk.ngocson, 'GET', '/phan-quyen')).s, 200);
    // Trigger CSDL cung chan neu ghi thang
    await assert.rejects(ctx.sql(`INSERT INTO vai_tro_quyen (vai_tro, ma_quyen) VALUES ('sale', 'he_thong.quan_tri')`));
  });

  it('TC-PQ-05: Chỉ Admin vào màn phân quyền; thay đổi quyền được ghi nhật ký', async () => {
    assert.equal((await ctx.api(tk.thihong, 'GET', '/phan-quyen')).s, 403);
    assert.equal((await ctx.api(tk.vannam, 'PUT', '/phan-quyen/van_hanh', { quyen: [] })).s, 403);
    const nk = (await ctx.api(tk.ngocson, 'GET', '/nhat-ky?bang=vai_tro_quyen')).d.items;
    assert.ok(nk.some((x) => x.ban_ghi === 'ke_toan:chi.duyet' && x.hanh_dong === 'INSERT' && x.nguoi === 'Vương Ngọc Sơn'));
  });
});
