import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau, quaLenPhuongAn, taoDonChot } from './helpers/moi_truong.js';

let ctx; let sale; let saleB; let vh; let admin;
before(async () => {
  ctx = await batDau();
  [sale, saleB, vh, admin] = await Promise.all([ctx.login('thilan'), ctx.login('vanhung'), ctx.login('vannam'), ctx.login('ngocson')]);
});
after(async () => { await ctx.ketThuc(); });
const thongBao = async (tk) => (await ctx.api(tk, 'GET', '/thong-bao')).d.items;

describe('Đơn hàng: chốt, phân công, tiến độ', () => {
  it('TC-DH-01: Chốt đơn thiếu thông tin bắt buộc → 400 liệt kê phần thiếu', async () => {
    const r = await ctx.api(sale, 'POST', '/don-hang', { khach_hang_id: 1, hinh_thuc: 'vat_tu', vat_tu: [], chot: true });
    assert.equal(r.s, 400);
    assert.match(r.d.message, /còn thiếu/);
  });

  it('TC-DH-02: Chốt đơn → tự giao cho Vận hành ít việc nhất + Vận hành nhận thông báo', async () => {
    const don = await taoDonChot(ctx, sale);
    const ct = (await ctx.api(admin, 'GET', `/don-hang/${don.id}`)).d;
    assert.equal(ct.vanhanh_phu_trach_id, 4);
    assert.equal(ct.lich_su_phan_cong.length, 1);
    assert.ok((await thongBao(vh)).some((t) => t.tieu_de.includes(`phụ trách đơn ${don.ma_don}`)));
  });

  it('TC-DH-03: Có Vận hành mới (0 đơn) → đơn tiếp theo giao cho người đó', async () => {
    const tao = await ctx.api(admin, 'POST', '/nguoi-dung', { ho_ten: 'Ngô Thị Thảo', username: 'thithao', vai_tro: 'van_hanh' });
    const don = await taoDonChot(ctx, sale);
    const ct = (await ctx.api(admin, 'GET', `/don-hang/${don.id}`)).d;
    assert.equal(ct.vanhanh_phu_trach_id, tao.d.id);
    const vhB = await ctx.login('thithao', tao.d.mat_khau_tam);
    // Van hanh chi thay don minh phu trach
    const ds = (await ctx.api(vhB, 'GET', '/don-hang?limit=100')).d;
    assert.ok(ds.items.every((d) => d.van_hanh === 'Ngô Thị Thảo'));
    assert.equal((await ctx.api(vh, 'GET', `/don-hang/${don.id}`)).s, 403, 'Vận hành khác không xem được');
    assert.equal((await ctx.api(vh, 'PATCH', `/don-hang/${don.id}/phuong-an`, { phuong_an_van_chuyen: 'x' })).s, 403, 'Vận hành khác không thao tác được');
    // Admin chuyen phu trach: bat buoc ly do
    assert.equal((await ctx.api(admin, 'PUT', `/don-hang/${don.id}/phu-trach`, { van_hanh_id: 4 })).s, 400);
    const chuyen = await ctx.api(admin, 'PUT', `/don-hang/${don.id}/phu-trach`, { van_hanh_id: 4, ly_do: 'Vận hành B nghỉ phép' });
    assert.equal(chuyen.s, 200);
    assert.equal((await ctx.api(vhB, 'GET', `/don-hang/${don.id}`)).s, 403, 'người cũ mất quyền ngay');
    await ctx.api(admin, 'PUT', `/nguoi-dung/${tao.d.id}`, { trang_thai: 'ngung_hoat_dong' });
  });

  it('TC-DH-04: Sale chỉ thấy đơn của mình', async () => {
    const don = await taoDonChot(ctx, sale);
    assert.equal((await ctx.api(saleB, 'GET', `/don-hang/${don.id}`)).s, 403);
    const ds = (await ctx.api(saleB, 'GET', '/don-hang?limit=100')).d.items;
    assert.ok(!ds.some((d) => d.id === don.id));
  });

  it('TC-DH-05: Rời "Lên phương án" khi chưa có phương án → 400; có rồi → qua bước, Sale nhận thông báo tiến độ', async () => {
    const don = await taoDonChot(ctx, sale);
    const thieu = await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'tiep' });
    assert.equal(thieu.s, 400);
    const r = await quaLenPhuongAn(ctx, vh, don.id);
    assert.equal(r.s, 200);
    assert.equal(r.d.giai_doan, 'mua_hang');
    assert.ok((await thongBao(sale)).some((t) => t.tieu_de.includes(`${don.ma_don} chuyển sang «Mua hàng»`)));
  });

  it('TC-DH-06: Lùi bước bắt buộc ghi lý do', async () => {
    const don = await taoDonChot(ctx, sale);
    await quaLenPhuongAn(ctx, vh, don.id);
    assert.equal((await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'lui' })).s, 400);
    const r = await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'lui', ghi_chu: 'Sửa lại phương án' });
    assert.equal(r.d.giai_doan, 'len_phuong_an');
  });

  it('TC-DH-07: Đơn hoàn thiện phải "Xác nhận khối lượng" mới sang Mua hàng; đổi số lượng → tổng đổi + Sale được báo', async () => {
    const don = await taoDonChot(ctx, sale, { hinh_thuc: 'hoan_thien' });
    const r1 = await quaLenPhuongAn(ctx, vh, don.id);
    assert.equal(r1.d.giai_doan, 'boc_khoi_luong');
    assert.equal((await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'tiep' })).s, 400, 'chưa xác nhận khối lượng');
    const ct = (await ctx.api(vh, 'GET', `/don-hang/${don.id}`)).d;
    const dong = ct.vat_tu.map((v, i) => ({ id: v.id, so_luong_can: i === 0 ? Number(v.so_luong_can) + 2 : v.so_luong_can }));
    const boc = await ctx.api(vh, 'PUT', `/don-hang/${don.id}/boc-khoi-luong`, { dong });
    assert.equal(boc.s, 200);
    assert.equal(boc.d.thay_doi.length, 1);
    assert.ok(boc.d.tong_sau > boc.d.tong_truoc);
    assert.ok((await thongBao(sale)).some((t) => t.tieu_de.includes('khối lượng thực đo thay đổi')));
    assert.equal((await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'tiep' })).d.giai_doan, 'mua_hang');
  });

  it('TC-DH-08: Huỷ đơn bắt buộc lý do; Sale không huỷ được', async () => {
    const don = await taoDonChot(ctx, sale);
    assert.equal((await ctx.api(sale, 'POST', `/don-hang/${don.id}/huy`, { ly_do: 'x' })).s, 403);
    assert.equal((await ctx.api(vh, 'POST', `/don-hang/${don.id}/huy`, {})).s, 400);
    const r = await ctx.api(vh, 'POST', `/don-hang/${don.id}/huy`, { ly_do: 'Khách đổi ý' });
    assert.equal(r.d.giai_doan, 'huy');
    assert.ok((await thongBao(sale)).some((t) => t.tieu_de.includes(`${don.ma_don} đã bị huỷ`)));
  });

  it('TC-DH-09: Sale gửi yêu cầu sửa → Vận hành phụ trách nhận; xử lý xong → Sale nhận', async () => {
    const don = await taoDonChot(ctx, sale);
    const yc = await ctx.api(sale, 'POST', `/don-hang/${don.id}/yeu-cau-sua`, { noi_dung: 'Đổi màu sàn' });
    assert.equal(yc.s, 201);
    assert.ok((await thongBao(vh)).some((t) => t.tieu_de.includes(`yêu cầu sửa đơn ${don.ma_don}`)));
    await ctx.api(vh, 'PATCH', `/don-hang/${don.id}/yeu-cau-sua/${yc.d.id}/xu-ly`);
    assert.ok((await thongBao(sale)).some((t) => t.tieu_de.includes(`đã xử lý yêu cầu sửa đơn ${don.ma_don}`)));
  });

  it('TC-DH-10: Chốt đồng thời nhiều đơn vẫn chia đều cho Vận hành (khoá tư vấn)', async () => {
    const tao = await ctx.api(admin, 'POST', '/nguoi-dung', { ho_ten: 'Dương Minh Khoa', username: 'minhkhoa', vai_tro: 'van_hanh' });
    const truoc = (await ctx.api(admin, 'GET', '/danh-muc/van-hanh')).d;
    await Promise.all(Array.from({ length: 6 }, () => taoDonChot(ctx, sale)));
    const sau = (await ctx.api(admin, 'GET', '/danh-muc/van-hanh')).d;
    const tang = sau.reduce((t, v) => t + v.so_don_dang_mo - (truoc.find((x) => x.id === v.id)?.so_don_dang_mo || 0), 0);
    assert.equal(tang, 6);
    const c = sau.find((v) => v.id === tao.d.id);
    assert.ok(c.so_don_dang_mo >= 3, `Vận hành mới phải nhận phần lớn đơn (nhận ${c.so_don_dang_mo})`);
  });
});
