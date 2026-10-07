import * as authService from './auth.service.js';

export async function login(req, res) {
  const { username, password } = req.body || {};
  res.json(await authService.dangNhap(username, password, req.ip));
}

export async function me(req, res) {
  res.json(await authService.layThongTinToi(req.user.id));
}

export async function doiMatKhau(req, res) {
  res.json(await authService.doiMatKhau(req.user.id, req.body || {}));
}
