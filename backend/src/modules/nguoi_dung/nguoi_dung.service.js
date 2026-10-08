import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './nguoi_dung.repository.js';
import { kiemTraMatKhauManh } from '../auth/auth.service.js';

const VAI_TRO = ['sale', 'van_hanh', 'ke_toan', 'admin'];
const TRANG_THAI = ['active', 'ngung_hoat_dong'];
const chu = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// Mat khau tam ngau nhien (hien 1 lan cho Admin; nguoi dung tu doi sau khi dang nhap).
// Bo ky tu de nham (0/O, 1/l/I) vi Admin thuong doc lai cho nguoi dung.
function matKhauTam() {
  const bang = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let mk = '';
  while (!/\d/.test(mk) || !/[A-Za-z]/.test(mk)) {
    mk = Array.from(crypto.randomBytes(10), (b) => bang[b % bang.length]).join('');
  }
  return mk;
}

export const danhSach = () => repo.findAll();

export async function tao(body) {
  const hoTen = chu(body.ho_ten);
  const username = chu(body.username)?.toLowerCase();
  if (!hoTen) throw new AppError(400, 'Nhập họ tên');
  if (!username || !/^[a-z0-9_.]{3,30}$/.test(username)) throw new AppError(400, 'Tên đăng nhập 3–30 ký tự: chữ thường không dấu, số, "_" hoặc "."');
  if (!VAI_TRO.includes(body.vai_tro)) throw new AppError(400, 'Vai trò không hợp lệ');
  const tuSinh = !body.mat_khau;
  const matKhau = tuSinh ? matKhauTam() : body.mat_khau;
  if (!tuSinh) kiemTraMatKhauManh(matKhau);
  // Trung username -> loi UNIQUE 23505 -> errorHandler tra 409.
  const user = await repo.tao({ ho_ten: hoTen, username, vai_tro: body.vai_tro, hash: await bcrypt.hash(matKhau, 10) });
  return { ...user, mat_khau_tam: tuSinh ? matKhau : undefined };
}

export async function capNhat(admin, id, body) {
  return withTransaction(async (client) => {
    const u = await repo.findById(client, id);
    if (!u) throw new AppError(404, 'Không tìm thấy người dùng');
    const vaiTro = body.vai_tro ?? u.vai_tro;
    const trangThai = body.trang_thai ?? u.trang_thai;
    if (!VAI_TRO.includes(vaiTro) || !TRANG_THAI.includes(trangThai)) throw new AppError(400, 'Vai trò / trạng thái không hợp lệ');
    const hoTen = body.ho_ten === undefined ? u.ho_ten : chu(body.ho_ten);
    if (!hoTen) throw new AppError(400, 'Nhập họ tên');
    // Tu bao ve: Admin khong tu khoa / tu ha quyen chinh minh.
    if (id === admin.id && (trangThai !== 'active' || vaiTro !== 'admin')) throw new AppError(409, 'Không thể tự khoá hoặc tự đổi vai trò của chính mình');
    // Luon con it nhat 1 Admin hoat dong.
    const boAdmin = u.vai_tro === 'admin' && u.trang_thai === 'active' && (vaiTro !== 'admin' || trangThai !== 'active');
    if (boAdmin && (await repo.demAdminHoatDong(client)) <= 1) throw new AppError(409, 'Hệ thống phải còn ít nhất một Admin đang hoạt động');
    // Telegram username (khong '@'): gan de duyet/chi trong nhom Telegram duoc ghi dung nguoi. '' -> bo gan. Trung -> 409 (UNIQUE).
    let telegram = u.telegram_username;
    if (body.telegram_username !== undefined) {
      telegram = chu(String(body.telegram_username ?? '').replace(/^@/, ''));
      if (telegram && !/^[A-Za-z0-9_]{5,32}$/.test(telegram)) throw new AppError(400, 'Username Telegram 5–32 ký tự: chữ, số, "_"');
    }
    const matKhauMoi = body.dat_lai_mat_khau === true ? matKhauTam() : null;
    const tangPhienBan = vaiTro !== u.vai_tro || trangThai !== u.trang_thai || matKhauMoi !== null;
    const kq = await repo.capNhat(client, id, {
      ho_ten: hoTen, vai_tro: vaiTro, trang_thai: trangThai, hash: matKhauMoi && (await bcrypt.hash(matKhauMoi, 10)), tangPhienBan, telegram_username: telegram,
    });
    return { ...kq, mat_khau_tam: matKhauMoi || undefined };
  });
}
