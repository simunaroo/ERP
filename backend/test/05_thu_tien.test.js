import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ANH_BILL, batDau, homNay, muaDuHang, quaLenPhuongAn, taoDonChot } from './helpers/moi_truong.js';

let ctx; let sale; let saleB; let vh; let keToan; let admin; let don;
const tomTat = async (tk = sale) => (await ctx.api(tk, 'GET', `/thu-tien/don/${don.id}`)).d;
const thongBao = async (tk) => (await ctx.api(tk, 'GET', '/thong-bao')).d.items;

before(async () => {
  ctx = await batDau();
  [sale, saleB, vh, keToan, admin] = await Promise.all([ctx.login('thilan'), ctx.login('vanhung'), ctx.login('vannam'), ctx.login('thihong'), ctx.login('ngocson')]);
  // Don vat tu (tam ung 100%), coc 1.000.000 d, mua du hang -> dung o "san sang giao hang".
  don = await taoDonChot(ctx, sale, { tien_coc: 1000000, ty_le_tam_ung: 100 });
  await quaLenPhuongAn(ctx, vh, don.id);
  await muaDuHang(ctx, vh, don.id);
});
after(async () => { await ctx.ketThuc(); });

describe('Thu tiền khách & công nợ phải thu', () => {
  it('TC-TT-01: Tổng hợp: đã thu = cọc; cần tạm ứng theo %; QR thu tiền đúng số tiền còn thiếu + nội dung mã đơn', async () => {
    const r = await tomTat();
    assert.equal(r.tom_tat.da_thu, 1000000);
    assert.equal(r.tom_tat.can_tam_ung, r.tom_tat.tong_don);
    assert.equal(r.tom_tat.du_tam_ung, false);
    assert.equal(r.tom_tat.goi_y.so_tien, r.tom_tat.tong_don - 1000000);
    assert.ok(r.qr.includes(`amount=${r.tom_tat.goi_y.so_tien}`));
    assert.equal(r.noi_dung_ck, `${don.ma_don} THANH TOAN`);
  });

  it('TC-TT-02: Chưa đủ tạm ứng → không đăng ký giao hàng được; "vẫn giao" phải ghi lý do', async () => {
    const a = await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'tiep' });
    assert.equal(a.s, 400);
    assert.match(a.d.message, /cần tạm ứng/);
    const b = await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'tiep', bo_qua_tam_ung: true });
    assert.equal(b.s, 400);
    assert.match(b.d.message, /ghi lý do/);
  });

  it('TC-TT-03: Ghi nhận thanh toán không hợp lệ bị chặn (CK thiếu bill, vượt số còn nợ, ngày tương lai, Sale khác)', async () => {
    const goc = { don_hang_id: don.id, loai: 'tam_ung', so_tien: 1000, hinh_thuc: 'chuyen_khoan', ngay_thu: homNay() };
    assert.equal((await ctx.api(sale, 'POST', '/thu-tien', goc)).s, 400, 'thiếu bill');
    assert.equal((await ctx.api(sale, 'POST', '/thu-tien', { ...goc, bill: ANH_BILL, so_tien: 999999999 })).s, 400, 'vượt số còn nợ');
    assert.equal((await ctx.api(sale, 'POST', '/thu-tien', { ...goc, bill: ANH_BILL, ngay_thu: '2099-01-01' })).s, 400, 'ngày tương lai');
    assert.equal((await ctx.api(saleB, 'POST', '/thu-tien', { ...goc, bill: ANH_BILL })).s, 403, 'Sale khác');
    assert.equal((await ctx.api(saleB, 'GET', `/thu-tien/don/${don.id}`)).s, 403);
  });

  let phieu;
  it('TC-TT-04: Sale ghi nhận khách chuyển khoản → chờ Kế toán xác nhận, CHƯA tính là đã thu; Kế toán được báo', async () => {
    const t = (await tomTat()).tom_tat;
    const r = await ctx.api(sale, 'POST', '/thu-tien', { don_hang_id: don.id, loai: 'tam_ung', so_tien: t.goi_y.so_tien, hinh_thuc: 'chuyen_khoan', bill: ANH_BILL });
    assert.equal(r.s, 201);
    assert.equal(r.d.trang_thai, 'cho_xac_nhan');
    phieu = r.d.id;
    const sau = (await tomTat()).tom_tat;
    assert.equal(sau.da_thu, 1000000);
    assert.equal(sau.cho_xac_nhan, t.goi_y.so_tien);
    assert.ok((await thongBao(keToan)).some((x) => x.tieu_de.startsWith('Xác nhận tiền về')));
    assert.equal((await ctx.api(sale, 'POST', `/thu-tien/${phieu}/xac-nhan`)).s, 403, 'Sale không tự xác nhận');
  });

  it('TC-TT-05: Ảnh bill chỉ người có quyền xem (Sale của đơn, Kế toán); Sale khác → 403', async () => {
    assert.equal((await ctx.api(saleB, 'GET', `/thu-tien/${phieu}/bill`)).s, 403);
    const r = await ctx.api(keToan, 'GET', `/thu-tien/${phieu}/bill`);
    assert.equal(r.s, 200);
  });

  it('TC-TT-06: Kế toán từ chối phải có lý do; xác nhận → đã thu tăng, đủ tạm ứng, đăng ký giao hàng được', async () => {
    assert.equal((await ctx.api(keToan, 'POST', `/thu-tien/${phieu}/tu-choi`, {})).s, 400);
    const r = await ctx.api(keToan, 'POST', `/thu-tien/${phieu}/xac-nhan`);
    assert.equal(r.s, 200);
    assert.equal(r.d.tom_tat.du_tam_ung, true);
    assert.ok((await thongBao(sale)).some((x) => x.tieu_de.startsWith('Kế toán xác nhận đã nhận')));
    assert.equal((await ctx.api(keToan, 'POST', `/thu-tien/${phieu}/xac-nhan`)).s, 409, 'không xác nhận 2 lần');
    const gd = await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'tiep' });
    assert.equal(gd.d.giai_doan, 'giao_hang');
  });

  it('TC-TT-07: Kế toán từ chối → người ghi nhận được báo kèm lý do; tiền không được tính', async () => {
    // Don vua tra du o TC-TT-06 -> ghi them se vuot so con no (dung la phai chan) -> dung don moi con no.
    assert.equal((await ctx.api(sale, 'POST', '/thu-tien', { don_hang_id: don.id, loai: 'khac', so_tien: 1000, hinh_thuc: 'tien_mat' })).s, 400);
    const dNo = await taoDonChot(ctx, sale);
    const r = await ctx.api(sale, 'POST', '/thu-tien', { don_hang_id: dNo.id, loai: 'khac', so_tien: 1000, hinh_thuc: 'tien_mat' });
    assert.equal(r.s, 201);
    const daThu = async () => (await ctx.api(sale, 'GET', `/thu-tien/don/${dNo.id}`)).d.tom_tat.da_thu;
    const truoc = await daThu();
    await ctx.api(keToan, 'POST', `/thu-tien/${r.d.id}/tu-choi`, { ly_do: 'Chưa nhận được tiền mặt' });
    assert.equal(await daThu(), truoc);
    const tb = (await thongBao(sale)).find((x) => x.tieu_de.startsWith('Kế toán chưa thấy tiền về'));
    assert.equal(tb.noi_dung, 'Chưa nhận được tiền mặt');
  });

  it('TC-TT-08: Đơn khác: "vẫn giao hàng" có lý do → qua bước, ghi lịch sử, báo Admin + Kế toán', async () => {
    const d2 = await taoDonChot(ctx, sale, { ty_le_tam_ung: 100 });
    await quaLenPhuongAn(ctx, vh, d2.id);
    await muaDuHang(ctx, vh, d2.id);
    const r = await ctx.api(vh, 'POST', `/don-hang/${d2.id}/giai-doan`, { huong: 'tiep', bo_qua_tam_ung: true, ghi_chu: 'Khách quen, cam kết chuyển khi nhận hàng' });
    assert.equal(r.s, 200);
    assert.equal(r.d.giai_doan, 'giao_hang');
    assert.match(r.d.lich_su_giai_doan.at(-1).ghi_chu, /chưa đủ tạm ứng.*Khách quen/);
    assert.ok((await thongBao(admin)).some((x) => x.tieu_de.includes('khách chưa đủ tạm ứng')));
  });

  it('TC-TT-09: Hoàn tất mà khách còn nợ → hiện ở "Đến hạn"; Kế toán nhập tiền mặt (xác nhận ngay) → hết nợ', async () => {
    await ctx.api(vh, 'POST', `/don-hang/${don.id}/giai-doan`, { huong: 'tiep' }); // giao hang -> quyet toan
    await ctx.api(vh, 'POST', `/thi-cong/quyet-toan/${don.id}/chot`); // -> hoan tat
    // tang tong don bang phi phat sinh? Don da thu du -> tao no gia: dung don d3 rieng
    const d3 = await taoDonChot(ctx, sale, { ty_le_tam_ung: 0 });
    await quaLenPhuongAn(ctx, vh, d3.id);
    await muaDuHang(ctx, vh, d3.id);
    await ctx.api(vh, 'POST', `/don-hang/${d3.id}/giai-doan`, { huong: 'tiep' });
    await ctx.api(vh, 'POST', `/don-hang/${d3.id}/giai-doan`, { huong: 'tiep' });
    const chot = await ctx.api(vh, 'POST', `/thi-cong/quyet-toan/${d3.id}/chot`);
    assert.equal(chot.s, 200, chot.d?.message);
    const no = (await ctx.api(keToan, 'GET', '/thu-tien/cong-no?loc=den_han')).d;
    const dong = no.items.find((x) => x.id === d3.id);
    assert.ok(dong && dong.den_han, 'đơn hoàn tất còn nợ phải nằm trong danh sách đến hạn');
    assert.ok(!no.items.some((x) => x.id === don.id), 'đơn đã thu đủ không nằm trong công nợ');
    const r = await ctx.api(keToan, 'POST', '/thu-tien', { don_hang_id: d3.id, loai: 'quyet_toan', so_tien: dong.con_phai_thu, hinh_thuc: 'tien_mat' });
    assert.equal(r.d.trang_thai, 'da_xac_nhan');
    const sau = (await ctx.api(keToan, 'GET', '/thu-tien/cong-no?loc=den_han')).d;
    assert.ok(!sau.items.some((x) => x.id === d3.id));
  });

  it('TC-TT-10: Chỉ Kế toán/Admin xem danh sách công nợ và phiếu chờ xác nhận', async () => {
    assert.equal((await ctx.api(sale, 'GET', '/thu-tien/cong-no')).s, 403);
    assert.equal((await ctx.api(vh, 'GET', '/thu-tien/cho-xac-nhan')).s, 403);
    assert.equal((await ctx.api(admin, 'GET', '/thu-tien/cho-xac-nhan')).s, 200);
  });
});
