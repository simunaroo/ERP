import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/AppError.js';
import * as authRepo from './auth.repository.js';

export async function dangNhap(username, matKhau) {
  if (!username || !matKhau) {
    throw new AppError(400, 'Vui lòng nhập tên đăng nhập và mật khẩu');
  }
  const user = await authRepo.findByUsername(username);
  // Cung mot thong bao cho "sai username" va "sai mat khau" de khong lo username nao ton tai.
  if (!user || !(await bcrypt.compare(matKhau, user.password_hash))) {
    throw new AppError(401, 'Sai tên đăng nhập hoặc mật khẩu');
  }
  if (user.trang_thai !== 'active') {
    throw new AppError(403, 'Tài khoản đã bị khoá');
  }
  const token = jwt.sign(
    { id: user.id, vai_tro: user.vai_tro, ho_ten: user.ho_ten },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '8h' },
  );
  const { password_hash, ...userAnToan } = user;
  return { token, user: userAnToan };
}

export async function layThongTinToi(id) {
  const user = await authRepo.findById(id);
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');
  return user;
}
