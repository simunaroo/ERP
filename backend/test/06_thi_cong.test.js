import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau, homNay, muaDuHang, quaLenPhuongAn, taoDonChot } from './helpers/moi_truong.js';

let ctx; let sale; let vh; let don; let gd;
const giaiDoan = async () => (await ctx.api(vh, 'GET', `/don-hang/${don.id}`)).d.giai_doan;

before(async () => {
  ctx = await batDau();
  [sale, vh] = await Promise.all([ctx.login('doanha'), ctx.login('hanha')]);
  // Don hoan thien, coc du 80% de qua dang ky giao hang khong can bo qua tam ung.
  don = await taoDonChot(ctx, sale, { hinh_thuc: 'hoan_thien', tien_coc: 3500000 });
  await quaLenPhuongAn(ctx, vh, don.id);
  const ct = (await ctx.api(vh, 'GET', `/don-hang/${don.id}`)).d;
  await ctx.api(vh, 'PUT', `/don-hang/${don.id}/boc-khoi-luong`, { dong: ct.vat_tu.map((v) => ({ id: v.id, so_luong_can: v.so_luong_can })) });
  await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'tiep' });
  await muaDuHang(ctx, vh, don.id);
});
after(async () => { await ctx.ketThuc(); });

describe('Thi công → nghiệm thu → quyết toán (đơn hoàn thiện)', () => {
  it('TC-TC-01: Đủ hàng + đủ tạm ứng → đăng ký giao hàng', async () => {
    const r = await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'tiep' });
    assert.equal(r.s, 200, r.d?.message);
    assert.equal(r.d.giai_doan, 'giao_hang');
  });

  it('TC-TC-02: Lập giai đoạn: ngày trong quá khứ / khối lượng 0 → 400; hợp lệ → tạo được', async () => {
    const goc = { don_hang_id: don.id, ten_giai_doan: 'Lát sàn', doi_tho_id: 1, kl_du_kien: 10, gia_cong: 50000, ngay_du_kien: homNay() };
    assert.equal((await ctx.api(vh, 'POST', '/thi-cong', { ...goc, ngay_du_kien: '2020-01-01' })).s, 400);
    assert.equal((await ctx.api(vh, 'POST', '/thi-cong', { ...goc, kl_du_kien: 0 })).s, 400);
    const r = await ctx.api(vh, 'POST', '/thi-cong', goc);
    assert.ok(r.s < 300, r.d?.message);
    gd = r.d.id ?? r.d.giai_doan?.[0]?.id ?? (await ctx.sql('SELECT id FROM thi_cong WHERE don_hang_id = $1', [don.id]))[0].id;
  });

  it('TC-TC-03: Thợ bắt đầu giai đoạn đầu → đơn tự sang Thi công; báo xong giai đoạn cuối → tự sang Nghiệm thu', async () => {
    await ctx.api(vh, 'POST', `/thi-cong/${gd}/bat-dau`);
    assert.equal(await giaiDoan(), 'thi_cong');
    await ctx.api(vh, 'POST', `/thi-cong/${gd}/bao-xong`);
    assert.equal(await giaiDoan(), 'nghiem_thu');
  });

  it('TC-TC-04: Lưu số lượng thực tế nghiệm thu trả lại dữ liệu đơn (hồi quy lỗi "Không tìm thấy đơn hàng")', async () => {
    const nt = (await ctx.api(vh, 'GET', `/thi-cong/nghiem-thu/${don.id}`)).d;
    const r = await ctx.api(vh, 'PUT', `/thi-cong/nghiem-thu/${don.id}`, {
      dong: nt.dong.map((d) => ({ id: d.id, so_luong_thuc_te: d.so_luong_can })),
      giai_doan: nt.giai_doan.map((x) => ({ id: x.id, kl_thuc_te: Number(x.kl_du_kien) - 1 })),
    });
    assert.equal(r.s, 200, r.d?.message);
    assert.equal(r.d.don.id, don.id);
  });

  it('TC-TC-05: Xác nhận nghiệm thu → tự sang Quyết toán; chốt quyết toán → Hoàn tất, ghi công thợ phải trả', async () => {
    const x = await ctx.api(vh, 'POST', `/thi-cong/nghiem-thu/${don.id}/xac-nhan`);
    assert.equal(x.s, 200, x.d?.message);
    assert.equal(await giaiDoan(), 'quyet_toan');
    const c = await ctx.api(vh, 'POST', `/thi-cong/quyet-toan/${don.id}/chot`);
    assert.equal(c.s, 200, c.d?.message);
    assert.equal(await giaiDoan(), 'hoan_tat');
    const tho = await ctx.sql(`SELECT so_tien FROM giao_dich_tho WHERE don_hang_id = $1 AND loai = 'phai_tra'`, [don.id]);
    assert.equal(Number(tho[0].so_tien), 9 * 50000, 'công thợ = KL thực tế × giá công');
  });

  it('TC-TC-06: Đơn đã hoàn tất không chuyển bước / huỷ được nữa', async () => {
    assert.equal((await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'lui', ghi_chu: 'x' })).s, 409);
    assert.equal((await ctx.api(vh, 'POST', `/don-hang/${don.id}/huy`, { ly_do: 'x' })).s, 409);
  });
});
