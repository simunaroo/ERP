import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau, taoDonChot } from './helpers/moi_truong.js';

let ctx; const tk = {};
before(async () => {
  ctx = await batDau();
  for (const u of ['ngocson', 'doanha', 'hanha', 'toana']) tk[u] = await ctx.login(u);
});
after(async () => { await ctx.ketThuc(); });

describe('Thông báo', () => {
  it('TC-TB-01: Thao tác lỗi (rollback) không sinh thông báo — ghi cùng transaction', async () => {
    const truoc = (await ctx.api(tk.ngocson, 'GET', '/thong-bao/dem')).d.chua_doc;
    const r = await ctx.api(tk.toana, 'POST', '/cong-no/de-xuat-chi', { loai_chi: 'coc', don_hang_id: 1, ncc_id: 2, so_tien: 999999999 });
    assert.equal(r.s, 400);
    assert.equal((await ctx.api(tk.ngocson, 'GET', '/thong-bao/dem')).d.chua_doc, truoc);
  });

  it('TC-TB-02: Người thao tác không tự nhận thông báo của chính mình', async () => {
    const don = await taoDonChot(ctx, tk.doanha);
    const ds = (await ctx.api(tk.doanha, 'GET', '/thong-bao')).d.items;
    assert.ok(!ds.some((t) => t.tieu_de.includes(`phụ trách đơn ${don.ma_don}`)));
  });

  it('TC-TB-03: Link thông báo theo vai trò: Kế toán → mở đề xuất ở Công nợ, Vận hành → màn mua hàng của đơn', async () => {
    const r = await ctx.api(tk.toana, 'POST', '/cong-no/de-xuat-chi', { loai_chi: 'coc', don_hang_id: 1, ncc_id: 2, so_tien: 1000 });
    await ctx.api(tk.ngocson, 'POST', `/cong-no/de-xuat-chi/${r.d.id}/duyet`, { hanh_dong: 'duyet' });
    const kt = (await ctx.api(tk.toana, 'GET', '/thong-bao')).d.items.find((t) => t.tieu_de.includes(`DXC-${r.d.id}`));
    assert.match(kt.link, new RegExp(`^/cong-no\\?.*mo=${r.d.id}`));
    const { ANH_BILL } = await import('./helpers/moi_truong.js');
    await ctx.api(tk.toana, 'POST', `/cong-no/de-xuat-chi/${r.d.id}/da-chi`, { bill: ANH_BILL });
    const vh = (await ctx.api(tk.hanha, 'GET', '/thong-bao')).d.items.find((t) => t.tieu_de.includes(`Đã chi: DXC-${r.d.id}`));
    assert.equal(vh.link, '/mua-hang/don/1');
  });

  it('TC-TB-04: Chỉ đọc/đánh dấu thông báo của chính mình; đọc hết → 0 chưa đọc', async () => {
    const cua = (await ctx.api(tk.hanha, 'GET', '/thong-bao')).d.items[0];
    assert.equal((await ctx.api(tk.doanha, 'POST', `/thong-bao/${cua.id}/doc`)).s, 404);
    assert.equal((await ctx.api(tk.hanha, 'POST', `/thong-bao/${cua.id}/doc`)).s, 204);
    await ctx.api(tk.hanha, 'POST', '/thong-bao/doc-het');
    assert.equal((await ctx.api(tk.hanha, 'GET', '/thong-bao/dem')).d.chua_doc, 0);
  });
});

describe('Phân quyền theo vai trò', () => {
  const ROLE = { admin: 'ngocson', sale: 'doanha', van_hanh: 'hanha', ke_toan: 'toana' };
  const URL = [
    '/tong-quan', '/thong-bao', '/don-hang', '/don-hang/1', '/danh-muc/vat-tu', '/danh-muc/khach-hang', '/khach-hang', '/nha-cung-cap',
    '/phan-tich/tong-hop', '/mua-hang/don', '/mua-hang/don/1', '/mua-hang/bo-sung', '/thi-cong/lich', '/thi-cong/quyet-toan',
    '/cong-no/de-xuat-chi', '/cong-no/ncc', '/cong-no/tho', '/thu-tien/don/1', '/thu-tien/cong-no', '/nguoi-dung',
  ];
  it('TC-PQ-01: Mọi API GET × 4 vai trò không trả lỗi 500', async () => {
    for (const u of URL) for (const [vt, ten] of Object.entries(ROLE)) {
      const r = await ctx.api(tk[ten], 'GET', u);
      assert.ok(r.s < 500, `${vt} ${u} → ${r.s} ${r.d?.message}`);
    }
  });

  // [url, vai tro, ma mong doi]
  const KY_VONG = [
    ['/khach-hang', 'van_hanh', 403], ['/danh-muc/khach-hang', 'van_hanh', 403], ['/danh-muc/khach-hang', 'ke_toan', 403],
    ['/cong-no/de-xuat-chi', 'van_hanh', 403], ['/cong-no/de-xuat-chi', 'sale', 403], ['/nguoi-dung', 'ke_toan', 403],
    ['/mua-hang/don', 'sale', 403], ['/phan-tich/tong-hop', 'van_hanh', 403], ['/thu-tien/cong-no', 'sale', 403],
    ['/nguoi-dung', 'admin', 200], ['/cong-no/de-xuat-chi', 'ke_toan', 200], ['/thu-tien/don/1', 'van_hanh', 200],
  ];
  for (const [u, vt, ma] of KY_VONG) {
    it(`TC-PQ-02: ${vt} GET ${u} → ${ma}`, async () => {
      assert.equal((await ctx.api(tk[ROLE[vt]], 'GET', u)).s, ma);
    });
  }
});
