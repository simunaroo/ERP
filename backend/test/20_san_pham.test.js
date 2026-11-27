import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau } from './helpers/moi_truong.js';

// San pham = loai vat tu (seed: 1 Cửa, 2 Sàn, 3 Tấm ốp). Vat tu seed: 1-2 Cửa, 3-4 Sàn, 5-6 Tấm ốp.
let ctx; let sale; let saleB; let admin;
before(async () => {
  ctx = await batDau();
  [sale, saleB, admin] = await Promise.all([ctx.login('thilan'), ctx.login('vanhung'), ctx.login('ngocson')]);
});
after(async () => { await ctx.ketThuc(); });

const tenSp = (ds) => ds.map((s) => s.ten);
const DON = {
  hinh_thuc: 'vat_tu', tinh_thanh: 'Hà Nội', dia_chi_cong_trinh: 'Số 9 Đường Thử', dieu_khoan_nghiem_thu: 'theo_hop_dong',
};

describe('Sản phẩm quan tâm của khách & sản phẩm của đơn', () => {
  it('TC-SP-01: Dữ liệu mẫu đã có sản phẩm: khách có đơn → theo đơn; đơn → loại vật tư nhiều tiền nhất', async () => {
    const thieu = await ctx.sql(`SELECT count(*)::int AS n FROM don_hang dh WHERE dh.san_pham_id IS NULL
                                   AND EXISTS (SELECT 1 FROM don_hang_vat_tu v WHERE v.don_hang_id = dh.id)`);
    assert.equal(thieu[0].n, 0, 'đơn có vật tư thì phải có sản phẩm');
    const kh = (await ctx.api(sale, 'GET', '/khach-hang/1')).d;
    assert.ok(kh.san_pham.length > 0, 'khách đã đặt đơn phải có sản phẩm quan tâm');
    assert.ok(kh.don_hang.every((d) => d.san_pham), 'đơn trong hồ sơ khách hiện tên sản phẩm');
  });

  it('TC-SP-02: Thêm khách kèm sản phẩm; Sale sửa lại; id sai → 400; Sale khác → 403', async () => {
    const kh = (await ctx.api(sale, 'POST', '/khach-hang', { ten: 'Khách SP', sdt: '0966000111', san_pham_ids: [2, 3, 3] })).d;
    assert.deepEqual(tenSp((await ctx.api(sale, 'GET', `/khach-hang/${kh.id}`)).d.san_pham), ['Sàn', 'Tấm ốp']);

    const sua = await ctx.api(sale, 'PUT', `/khach-hang/${kh.id}/san-pham`, { san_pham_ids: [1, 3] });
    assert.equal(sua.s, 200);
    assert.deepEqual(tenSp(sua.d), ['Cửa', 'Tấm ốp']);

    assert.equal((await ctx.api(sale, 'PUT', `/khach-hang/${kh.id}/san-pham`, { san_pham_ids: [999] })).s, 400);
    assert.equal((await ctx.api(sale, 'PUT', `/khach-hang/${kh.id}/san-pham`, { san_pham_ids: 'Sàn' })).s, 400);
    assert.equal((await ctx.api(saleB, 'PUT', `/khach-hang/${kh.id}/san-pham`, { san_pham_ids: [] })).s, 403);

    // Loc danh sach khach theo san pham
    const loc = (await ctx.api(sale, 'GET', '/khach-hang?san_pham=1&limit=100')).d.items;
    assert.ok(loc.some((k) => k.id === kh.id));
    assert.ok(loc.every((k) => k.san_pham.some((s) => s.id === 1)));
    assert.ok(!(await ctx.api(sale, 'GET', '/khach-hang?san_pham=2&limit=100')).d.items.some((k) => k.id === kh.id));
  });

  it('TC-SP-03: Nhập số có "Nhu cầu" → tự đoán sản phẩm theo từ khoá (không nhầm "của" thành "cửa")', async () => {
    const r = await ctx.api(admin, 'POST', '/nhap-so', { ds: [
      { sdt: '0955000001', nguon: 'facebook', nhu_cau: 'Lát sàn gỗ phòng khách + ốp tường nano' },
      { sdt: '0955000002', nguon: 'zalo', nhu_cau: 'Nhà của chị cần tư vấn' },
    ] });
    assert.equal(r.s, 201, r.d?.message);
    const [a, b] = await Promise.all(['0955000001', '0955000002'].map((sdt) => ctx.sql(
      `SELECT l.ten FROM khach_hang k JOIN khach_hang_san_pham ks ON ks.khach_hang_id = k.id
         JOIN loai_vat_tu l ON l.id = ks.loai_vat_tu_id WHERE k.sdt = $1 ORDER BY l.id`, [sdt])));
    assert.deepEqual(a.map((x) => x.ten), ['Sàn', 'Tấm ốp']);
    assert.deepEqual(b, []);
  });

  it('TC-SP-04: Đơn lưu sản phẩm: bỏ trống → tự lấy loại nhiều tiền nhất; chọn tay → giữ; khách được thêm sản phẩm quan tâm', async () => {
    const kh = (await ctx.api(sale, 'POST', '/khach-hang', { ten: 'Khách Đơn SP', sdt: '0966000222' })).d;
    const tu = await ctx.api(sale, 'POST', '/don-hang', { ...DON, khach_hang_id: kh.id, chot: true, vat_tu: [
      { vat_tu_id: 1, so_luong_can: 1, don_gia: 2000000 }, // Cửa 2tr
      { vat_tu_id: 5, so_luong_can: 30, don_gia: 200000 }, // Tấm ốp 6tr
    ] });
    assert.equal(tu.s, 201, tu.d?.message);
    const ct = (await ctx.api(sale, 'GET', `/don-hang/${tu.d.id}`)).d;
    assert.equal(ct.san_pham, 'Tấm ốp');

    const tay = await ctx.api(sale, 'POST', '/don-hang', { ...DON, khach_hang_id: kh.id, san_pham_id: 1, vat_tu: [{ vat_tu_id: 5, so_luong_can: 1, don_gia: 1 }] });
    assert.equal(tay.d.san_pham_id, 1);
    assert.equal((await ctx.api(sale, 'POST', '/don-hang', { ...DON, khach_hang_id: kh.id, san_pham_id: 999, vat_tu: [] })).s, 400);

    assert.deepEqual(tenSp((await ctx.api(sale, 'GET', `/khach-hang/${kh.id}`)).d.san_pham), ['Cửa', 'Tấm ốp']);
    const ds = (await ctx.api(sale, 'GET', '/don-hang?san_pham=3&limit=100')).d.items;
    assert.ok(ds.some((d) => d.id === tu.d.id) && ds.every((d) => d.san_pham === 'Tấm ốp'));
  });
});
