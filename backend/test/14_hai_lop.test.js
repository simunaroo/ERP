import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau } from './helpers/moi_truong.js';
import { maTai, buocHienTai } from '../src/utils/totp.js';

let ctx;
before(async () => { ctx = await batDau(); });
after(async () => { await ctx.ketThuc(); });

const dangNhap = (u) => ctx.api(null, 'POST', '/auth/login', { username: u, password: `${u}123456` });

describe('Xác thực 2 lớp (TOTP) cho Admin và Kế toán', () => {
  let khoa; let maDuPhong;
  it('TC-2FA-01: Kế toán đăng nhập lần đầu → chưa có token, bắt cài 2FA; "mã tạm" không dùng làm token được', async () => {
    const r = await dangNhap('thihong');
    assert.equal(r.d.buoc, 'cai_2fa');
    assert.equal(r.d.token, undefined);
    const thu = await fetch(`${ctx.goc}/auth/me`, { headers: { Authorization: `Bearer ${r.d.ma_tam}` } });
    assert.equal(thu.status, 401);
  });

  it('TC-2FA-02: Cài 2FA: QR + khoá; mã sai bị từ chối; mã đúng → token + 8 mã dự phòng; khoá lưu mã hoá', async () => {
    const r = await dangNhap('thihong');
    const k = await ctx.api(null, 'POST', '/auth/2fa/khoi-tao', { ma_tam: r.d.ma_tam });
    assert.match(k.d.qr, /^data:image\/png;base64,/);
    khoa = k.d.khoa;
    assert.equal((await ctx.api(null, 'POST', '/auth/2fa/kich-hoat', { ma_tam: k.d.ma_tam, ma: '000000' })).s, 400);
    const ok = await ctx.api(null, 'POST', '/auth/2fa/kich-hoat', { ma_tam: k.d.ma_tam, ma: maTai(khoa, buocHienTai()) });
    assert.equal(ok.s, 200);
    assert.ok(ok.d.token);
    assert.equal(ok.d.ma_du_phong.length, 8);
    maDuPhong = ok.d.ma_du_phong;
    const [u] = await ctx.sql(`SELECT totp_khoa FROM users WHERE username = 'thihong'`);
    assert.ok(!u.totp_khoa.includes(khoa)); // khong luu khoa dang ro
  });

  it('TC-2FA-03: Lần sau phải nhập mã; một mã chỉ dùng được một lần', async () => {
    const r1 = await dangNhap('thihong');
    assert.equal(r1.d.buoc, 'nhap_ma_2fa');
    const ma = maTai(khoa, buocHienTai() + 1); // buoc hien tai da dung luc kich hoat
    assert.equal((await ctx.api(null, 'POST', '/auth/2fa/xac-minh', { ma_tam: r1.d.ma_tam, ma })).s, 200);
    const r2 = await dangNhap('thihong');
    assert.equal((await ctx.api(null, 'POST', '/auth/2fa/xac-minh', { ma_tam: r2.d.ma_tam, ma })).s, 400);
  });

  it('TC-2FA-04: Mất điện thoại: dùng mã dự phòng (chỉ một lần); Admin đặt lại 2FA → phải cài lại', async () => {
    const r = await dangNhap('thihong');
    assert.equal((await ctx.api(null, 'POST', '/auth/2fa/xac-minh', { ma_tam: r.d.ma_tam, ma: maDuPhong[0] })).s, 200);
    const r2 = await dangNhap('thihong');
    assert.equal((await ctx.api(null, 'POST', '/auth/2fa/xac-minh', { ma_tam: r2.d.ma_tam, ma: maDuPhong[0] })).s, 400);
    const admin = await ctx.login('ngocson');
    const [{ id }] = await ctx.sql(`SELECT id FROM users WHERE username = 'thihong'`);
    assert.equal((await ctx.api(admin, 'POST', `/nguoi-dung/${id}/dat-lai-2fa`)).s, 200);
    assert.equal((await dangNhap('thihong')).d.buoc, 'cai_2fa');
  });

  it('TC-2FA-05: Nhập sai mã 5 lần → tạm khoá; Sale và Vận hành đăng nhập một bước', async () => {
    const r = await dangNhap('ngocson'); // Admin da cai 2FA o TC-2FA-04
    assert.equal(r.d.buoc, 'nhap_ma_2fa');
    for (let i = 0; i < 5; i++) await ctx.api(null, 'POST', '/auth/2fa/xac-minh', { ma_tam: r.d.ma_tam, ma: '111111' });
    assert.equal((await ctx.api(null, 'POST', '/auth/2fa/xac-minh', { ma_tam: r.d.ma_tam, ma: await ctx.ma2fa('ngocson') })).s, 429);
    assert.ok((await dangNhap('thilan')).d.token);
    assert.ok((await dangNhap('vannam')).d.token);
  });
});
