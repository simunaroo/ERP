import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau } from './helpers/moi_truong.js';

let ctx; let admin;
before(async () => {
  ctx = await batDau();
  admin = await ctx.login('ngocson'); // Admin: mac dinh bat 2FA -> helper tu cai + nhap ma
});
after(async () => { await ctx.ketThuc(); });

const dangNhap = (u) => ctx.api(null, 'POST', '/auth/login', { username: u, password: `${u}123456` });
const datVaiTro = (vaiTro, body) => ctx.api(admin, 'PUT', `/nguoi-dung/xac-thuc/${vaiTro}`, body);

describe('Bật/tắt xác thực 2 lớp theo vai trò (Admin)', () => {
  it('TC-XT-01: Mặc định giữ như cũ: Admin, Kế toán bật; Sale, Vận hành tắt; có thống kê số tài khoản đã cài', async () => {
    const r = await ctx.api(admin, 'GET', '/nguoi-dung/xac-thuc');
    assert.equal(r.s, 200);
    const theo = Object.fromEntries(r.d.vai_tro.map((v) => [v.vai_tro, v]));
    assert.deepEqual(r.d.vai_tro.map((v) => [v.vai_tro, v.bat_2fa]), [['admin', true], ['ke_toan', true], ['van_hanh', false], ['sale', false]]);
    assert.ok(theo.admin.so_da_cai >= 1, 'Admin vừa cài khi đăng nhập');
    assert.equal(r.d.tat_toan_he_thong, false);
  });

  it('TC-XT-02: Bật cho Sale → Sale đăng nhập phải cài 2FA; "đăng xuất ngay" làm token cũ của Sale chưa cài hết hiệu lực', async () => {
    const tokenCu = await ctx.login('vanhung'); // Sale, dang tat -> dang nhap 1 buoc
    assert.equal((await ctx.api(tokenCu, 'GET', '/auth/me')).s, 200);
    const r = await datVaiTro('sale', { bat_2fa: true, dang_xuat_ngay: true });
    assert.equal(r.s, 200, r.d?.message);
    assert.ok(r.d.so_dang_xuat >= 2, 'đăng xuất mọi Sale chưa cài');
    assert.equal((await ctx.api(tokenCu, 'GET', '/auth/me')).s, 401);
    const dn = await dangNhap('thilan');
    assert.equal(dn.d.buoc, 'cai_2fa');
    assert.equal(dn.d.token, undefined);
    // Bat/tat duoc ghi nhat ky, kem nguoi thao tac
    const nk = await ctx.sql(`SELECT nguoi_id FROM nhat_ky_thay_doi WHERE bang = 'xac_thuc_vai_tro' AND hanh_dong = 'UPDATE'`);
    assert.equal(nk.length, 1);
    assert.ok(nk[0].nguoi_id);
  });

  it('TC-XT-03: Tắt cho Kế toán đã cài → đăng nhập chỉ bằng mật khẩu; bật lại → nhập mã ngay (không phải quét QR lại)', async () => {
    await ctx.login('thihong'); // Ke toan cai 2FA lan dau
    assert.equal((await dangNhap('thihong')).d.buoc, 'nhap_ma_2fa');
    assert.equal((await datVaiTro('ke_toan', { bat_2fa: false })).s, 200);
    const tat = await dangNhap('thihong');
    assert.ok(tat.d.token, 'không hỏi mã khi vai trò tắt');
    assert.equal((await ctx.sql(`SELECT totp_khoa IS NOT NULL AS co FROM users WHERE username = 'thihong'`))[0].co, true, 'khoá đã cài vẫn giữ');
    assert.equal((await datVaiTro('ke_toan', { bat_2fa: true })).s, 200);
    assert.equal((await dangNhap('thihong')).d.buoc, 'nhap_ma_2fa');
  });

  it('TC-XT-04: Đầu vào sai → 400; không phải Admin → 403; lưu lại cùng giá trị không sinh nhật ký thừa', async () => {
    assert.equal((await datVaiTro('giam_doc', { bat_2fa: true })).s, 400);
    assert.equal((await datVaiTro('sale', { bat_2fa: 'co' })).s, 400);
    const ketoan = await ctx.login('thihong');
    assert.equal((await ctx.api(ketoan, 'PUT', '/nguoi-dung/xac-thuc/admin', { bat_2fa: false })).s, 403);
    assert.equal((await ctx.api(ketoan, 'GET', '/nguoi-dung/xac-thuc')).s, 403);
    const truoc = (await ctx.sql(`SELECT count(*)::int AS n FROM nhat_ky_thay_doi WHERE bang = 'xac_thuc_vai_tro'`))[0].n;
    await datVaiTro('ke_toan', { bat_2fa: true });
    assert.equal((await ctx.sql(`SELECT count(*)::int AS n FROM nhat_ky_thay_doi WHERE bang = 'xac_thuc_vai_tro'`))[0].n, truoc);
  });
});
