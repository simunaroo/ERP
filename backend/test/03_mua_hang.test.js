import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ANH_BILL, batDau, quaLenPhuongAn, taoDonChot, tinCuoi } from './helpers/moi_truong.js';

let ctx; let sale; let vh; let keToan; let admin; let don; let ct; let d1; let d2; let nccA; let nccB;
const tai = async () => { ct = (await ctx.api(vh, 'GET', `/mua-hang/don/${don.id}`)).d; return ct; };
const dong = (id) => ct.dong.find((x) => x.id === id);

before(async () => {
  ctx = await batDau();
  [sale, vh, keToan, admin] = await Promise.all([ctx.login('thilan'), ctx.login('vannam'), ctx.login('thihong'), ctx.login('ngocson')]);
  don = await taoDonChot(ctx, sale);
  await quaLenPhuongAn(ctx, vh, don.id);
  await tai();
  [d1, d2] = ct.dong;
  nccA = d1.gia_ncc[0].ncc_id;
  nccB = d2.gia_ncc.find((g) => g.ncc_id !== nccA).ncc_id;
});
after(async () => { await ctx.ketThuc(); });

describe('Mua hàng: chọn NCC → đặt hàng → NCC phản hồi → cọc / quyết toán', () => {
  it('TC-MH-01: Chọn NCC → dòng tự "Đã chọn NCC"; bỏ NCC → "Chưa chọn NCC" (không chọn trạng thái tay)', async () => {
    await ctx.api(vh, 'PUT', `/mua-hang/dong/${d1.id}`, { ncc_id: nccA, trang_thai: 'san_hang' });
    await tai();
    assert.equal(dong(d1.id).trang_thai, 'dang_hoi');
    await ctx.api(vh, 'PUT', `/mua-hang/dong/${d1.id}`, { ncc_id: null });
    await tai();
    assert.equal(dong(d1.id).trang_thai, 'cho_xu_ly');
    await ctx.api(vh, 'PUT', `/mua-hang/dong/${d1.id}`, { ncc_id: nccA });
    await ctx.api(vh, 'PUT', `/mua-hang/dong/${d2.id}`, { ncc_id: nccB });
  });

  it('TC-MH-02: Đặt hàng → đơn đặt hàng gửi nhóm Telegram NCC (2 nút), nội dung không chứa tên khách', async () => {
    const r = await ctx.api(vh, 'POST', `/mua-hang/don/${don.id}/dat-hang`, { ncc_id: nccA });
    assert.equal(r.s, 201);
    assert.match(r.d.noi_dung, new RegExp(`ĐƠN ĐẶT HÀNG ĐH-${r.d.id}`));
    assert.ok(r.d.noi_dung.includes(don.ma_don));
    assert.ok(!r.d.noi_dung.includes('Nguyễn Văn Hùng'), 'không lộ tên khách cho NCC');
    assert.equal(r.d.telegram, 'da_gui');
    const tin = tinCuoi('sendMessage', -100);
    assert.ok(JSON.stringify(tin.body.reply_markup).includes(`dh:${r.d.id}:xuat`));
    await tai();
    assert.equal(dong(d1.id).trang_thai, 'da_dat_hang');
  });

  it('TC-MH-03: Đã gửi đặt hàng thì không đổi NCC / không đặt lại được (409)', async () => {
    assert.equal((await ctx.api(vh, 'PUT', `/mua-hang/dong/${d1.id}`, { ncc_id: d1.gia_ncc[1].ncc_id })).s, 409);
    assert.equal((await ctx.api(vh, 'POST', `/mua-hang/don/${don.id}/dat-hang`, { ncc_id: nccA })).s, 409);
  });

  it('TC-MH-04: NCC cho xuất hàng → vật tư Sẵn hàng + tự lập đề xuất quyết toán (ảnh QR gửi nhóm duyệt chi)', async () => {
    const dh = ct.ncc.find((n) => n.ncc_id === nccA).dat_hang[0];
    const r = await ctx.api(vh, 'POST', `/mua-hang/dat-hang/${dh.id}/phan-hoi`, { loai: 'xuat' });
    assert.equal(r.s, 200);
    assert.equal(r.d.de_xuat.loai_chi, 'quyet_toan');
    assert.ok(r.d.de_xuat.qr?.startsWith('https://img.vietqr.io/'), 'đề xuất kèm QR');
    assert.equal(tinCuoi('sendPhoto', -200).body.photo, r.d.de_xuat.qr);
    await tai();
    assert.equal(dong(d1.id).trang_thai, 'san_hang');
    assert.equal((await ctx.api(vh, 'POST', `/mua-hang/dat-hang/${dh.id}/phan-hoi`, { loai: 'coc', so_tien_coc: 1000 })).s, 409, 'không phản hồi lại');
  });

  it('TC-MH-05: Lùi "Sẵn hàng" khi quyết toán chưa duyệt → xoá quyết toán; huỷ đặt hàng → về "Đã chọn NCC"', async () => {
    const lui = await ctx.api(vh, 'POST', `/mua-hang/don/${don.id}/lui-san-hang`, { ncc_id: nccA });
    assert.equal(lui.s, 200);
    assert.equal(lui.d.da_xoa_de_xuat.length, 1);
    await tai();
    const dh = ct.ncc.find((n) => n.ncc_id === nccA).dat_hang[0];
    assert.equal(dh.trang_thai, 'cho_phan_hoi');
    assert.equal((await ctx.api(vh, 'POST', `/mua-hang/dat-hang/${dh.id}/huy`)).s, 200);
    await tai();
    assert.equal(dong(d1.id).trang_thai, 'dang_hoi');
  });

  it('TC-MH-06: NCC yêu cầu cọc ≥ tiền hàng → 400; hợp lệ → "Chờ cọc" + đề xuất cọc, Kế toán được báo', async () => {
    const dh = (await ctx.api(vh, 'POST', `/mua-hang/don/${don.id}/dat-hang`, { ncc_id: nccB })).d;
    assert.equal((await ctx.api(vh, 'POST', `/mua-hang/dat-hang/${dh.id}/phan-hoi`, { loai: 'coc', so_tien_coc: dh.tong_tien })).s, 400);
    const coc = Math.round(dh.tong_tien * 0.3);
    const r = await ctx.api(vh, 'POST', `/mua-hang/dat-hang/${dh.id}/phan-hoi`, { loai: 'coc', so_tien_coc: coc });
    assert.equal(r.d.de_xuat.loai_chi, 'coc');
    assert.equal(Number(r.d.de_xuat.so_tien), coc);
    await tai();
    assert.equal(dong(d2.id).trang_thai, 'cho_coc');
    const tb = (await ctx.api(keToan, 'GET', '/thong-bao')).d.items;
    assert.ok(tb.some((t) => t.tieu_de.startsWith('NCC yêu cầu cọc')));
  });

  it('TC-MH-07: Cọc đã duyệt → không huỷ đặt hàng; Kế toán chi kèm bill → Sẵn hàng + quyết toán = tiền hàng − cọc', async () => {
    const nB = ct.ncc.find((n) => n.ncc_id === nccB);
    const dh = nB.dat_hang[0];
    await ctx.api(admin, 'POST', `/cong-no/de-xuat-chi/${dh.de_xuat_chi_id}/duyet`, { hanh_dong: 'duyet' });
    assert.equal((await ctx.api(vh, 'POST', `/mua-hang/dat-hang/${dh.id}/huy`)).s, 409);
    const chi = await ctx.api(keToan, 'POST', `/cong-no/de-xuat-chi/${dh.de_xuat_chi_id}/da-chi`, { bill: ANH_BILL });
    assert.equal(chi.s, 200);
    await tai();
    assert.equal(dong(d2.id).trang_thai, 'san_hang');
    const n = ct.ncc.find((x) => x.ncc_id === nccB);
    const qt = n.de_xuat.find((c) => c.loai_chi === 'quyet_toan');
    assert.equal(Number(qt.so_tien), Math.round(n.tien_hang) - Number(dh.so_tien_coc));
    assert.equal((await ctx.api(vh, 'POST', `/mua-hang/don/${don.id}/lui-san-hang`, { ncc_id: nccB })).s, 409, 'đã cọc thì không lùi');
  });

  it('TC-MH-08: Sale không thao tác mua hàng (403)', async () => {
    assert.equal((await ctx.api(sale, 'POST', `/mua-hang/don/${don.id}/dat-hang`, { ncc_id: nccA })).s, 403);
    assert.equal((await ctx.api(sale, 'GET', `/mua-hang/don/${don.id}`)).s, 403);
  });
});
