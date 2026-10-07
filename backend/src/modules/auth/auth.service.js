import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/AppError.js';
import * as authRepo from './auth.repository.js';

export const kyToken = (user) => jwt.sign(
  { id: user.id, vai_tro: user.vai_tro, ho_ten: user.ho_ten, pv: user.phien_ban_token ?? 0 },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES || '8h' },
);

// Chan do mat khau: sai 5 lan / 15 phut theo (username + IP) thi tam khoa dang nhap.
// Luu trong bo nho tien trinh: du cho 1 server; chay nhieu server thi chuyen sang Redis.
const SAI_TOI_DA = 5;
const CUA_SO_MS = 15 * 60 * 1000;
const lanSai = new Map();
function kiemTraKhoaTam(khoa) {
  const x = lanSai.get(khoa);
  if (x && x.den > Date.now() && x.so >= SAI_TOI_DA) {
    throw new AppError(429, `Đăng nhập sai quá nhiều lần, thử lại sau ${Math.ceil((x.den - Date.now()) / 60000)} phút`);
  }
}
function ghiSai(khoa) {
  const x = lanSai.get(khoa);
  lanSai.set(khoa, x && x.den > Date.now() ? { so: x.so + 1, den: x.den } : { so: 1, den: Date.now() + CUA_SO_MS });
  if (lanSai.size > 10000) lanSai.delete(lanSai.keys().next().value);
}

export async function dangNhap(username, matKhau, ip = '') {
  if (!username || !matKhau) throw new AppError(400, 'Vui lòng nhập tên đăng nhập và mật khẩu');
  const ten = String(username).trim().toLowerCase();
  const khoa = `${ten}|${ip}`;
  kiemTraKhoaTam(khoa);
  const user = await authRepo.findByUsername(ten);
  // Cung mot thong bao cho "sai username" va "sai mat khau" de khong lo username nao ton tai.
  if (!user || !(await bcrypt.compare(matKhau, user.password_hash))) {
    ghiSai(khoa);
    throw new AppError(401, 'Sai tên đăng nhập hoặc mật khẩu');
  }
  lanSai.delete(khoa);
  if (user.trang_thai !== 'active') throw new AppError(403, 'Tài khoản đã bị khoá');
  const { password_hash, phien_ban_token, ...userAnToan } = user;
  return { token: kyToken(user), user: userAnToan };
}

export async function layThongTinToi(id) {
  const user = await authRepo.findById(id);
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');
  return user;
}

export function kiemTraMatKhauManh(mk) {
  if (typeof mk !== 'string' || mk.length < 8) throw new AppError(400, 'Mật khẩu tối thiểu 8 ký tự');
  if (!/[A-Za-z]/.test(mk) || !/\d/.test(mk)) throw new AppError(400, 'Mật khẩu phải có cả chữ và số');
}

// Tu doi mat khau: phai dung mat khau cu; xong tra token moi (token cu tren may khac het hieu luc).
export async function doiMatKhau(userId, { mat_khau_cu, mat_khau_moi }) {
  const hash = await authRepo.layHash(userId);
  if (!hash || !(await bcrypt.compare(mat_khau_cu || '', hash))) throw new AppError(400, 'Mật khẩu hiện tại không đúng');
  kiemTraMatKhauManh(mat_khau_moi);
  if (mat_khau_moi === mat_khau_cu) throw new AppError(400, 'Mật khẩu mới phải khác mật khẩu cũ');
  const user = await authRepo.doiMatKhau(userId, await bcrypt.hash(mat_khau_moi, 10));
  const { phien_ban_token, ...userAnToan } = user;
  return { token: kyToken(user), user: userAnToan };
}
