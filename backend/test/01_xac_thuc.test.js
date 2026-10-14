import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau } from './helpers/moi_truong.js';

let ctx;
before(async () => { ctx = await batDau(); });
after(async () => { await ctx.ketThuc(); });

describe('Xác thực & phân quyền phiên', () => {
  it('TC-AUTH-01: Đăng nhập đúng trả token và vai trò', async () => {
    const r = await ctx.api(null, 'POST', '/auth/login', { username: 'ngocson', password: 'ngocson123456' });
    assert.equal(r.s, 200);
    assert.ok(r.d.token);
    assert.equal(r.d.user.vai_tro, 'admin');
  });

  it('TC-AUTH-02: Sai mật khẩu bị từ chối (401), không lộ tài khoản có tồn tại hay không', async () => {
    const a = await ctx.api(null, 'POST', '/auth/login', { username: 'ngocson', password: 'sai' });
    const b = await ctx.api(null, 'POST', '/auth/login', { username: 'khong_ton_tai', password: 'sai' });
    assert.equal(a.s, 401);
    assert.equal(b.s, 401);
    assert.equal(a.d.message, b.d.message);
  });

  it('TC-AUTH-03: Gọi API không có token → 401', async () => {
    assert.equal((await ctx.api(null, 'GET', '/don-hang')).s, 401);
  });

  it('TC-AUTH-04: Admin khoá tài khoản → token đang dùng hết hiệu lực ngay', async () => {
    const admin = await ctx.login('ngocson');
    const tk = await ctx.login('doanhb');
    assert.equal((await ctx.api(tk, 'GET', '/auth/me')).s, 200);
    await ctx.api(admin, 'PUT', '/nguoi-dung/3', { trang_thai: 'ngung_hoat_dong' });
    assert.equal((await ctx.api(tk, 'GET', '/auth/me')).s, 401);
    assert.equal((await ctx.api(null, 'POST', '/auth/login', { username: 'doanhb', password: 'doanhb123456' })).s, 403);
    await ctx.api(admin, 'PUT', '/nguoi-dung/3', { trang_thai: 'active' });
  });

  it('TC-AUTH-05: Đổi vai trò → token cũ hết hiệu lực (vai trò lấy từ CSDL, không tin token)', async () => {
    const admin = await ctx.login('ngocson');
    const tk = await ctx.login('doanhb');
    await ctx.api(admin, 'PUT', '/nguoi-dung/3', { vai_tro: 'ke_toan' });
    assert.equal((await ctx.api(tk, 'GET', '/auth/me')).s, 401);
    await ctx.api(admin, 'PUT', '/nguoi-dung/3', { vai_tro: 'sale' });
  });

  it('TC-AUTH-06: Đổi mật khẩu → token cũ hết hiệu lực, nhận token mới', async () => {
    const tk = await ctx.login('toana');
    const yeu = await ctx.api(tk, 'POST', '/auth/doi-mat-khau', { mat_khau_cu: 'toana123456', mat_khau_moi: 'abc' });
    assert.equal(yeu.s, 400, 'mật khẩu yếu phải bị từ chối');
    const r = await ctx.api(tk, 'POST', '/auth/doi-mat-khau', { mat_khau_cu: 'toana123456', mat_khau_moi: 'MatKhauMoi2026' });
    assert.equal(r.s, 200);
    assert.equal((await ctx.api(tk, 'GET', '/auth/me')).s, 401);
    assert.equal((await ctx.api(r.d.token, 'GET', '/auth/me')).s, 200);
    await ctx.api(r.d.token, 'POST', '/auth/doi-mat-khau', { mat_khau_cu: 'MatKhauMoi2026', mat_khau_moi: 'toana123456' });
  });

  it('TC-AUTH-07: Không tự khoá chính mình, luôn còn ít nhất 1 Admin', async () => {
    const admin = await ctx.login('ngocson');
    assert.equal((await ctx.api(admin, 'PUT', '/nguoi-dung/1', { trang_thai: 'ngung_hoat_dong' })).s, 409);
  });

  it('TC-AUTH-08: Sai mật khẩu 5 lần → tạm chặn đăng nhập (429)', async () => {
    for (let i = 0; i < 5; i++) await ctx.api(null, 'POST', '/auth/login', { username: 'doanhb', password: 'sai' });
    const r = await ctx.api(null, 'POST', '/auth/login', { username: 'doanhb', password: 'doanhb123456' });
    assert.equal(r.s, 429);
  });
});
