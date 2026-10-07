import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

// JWT ky dung -> roi doi chieu voi CSDL: tai khoan con hoat dong va phien_ban_token khop.
// Nho vay khoa tai khoan / doi vai tro / doi mat khau co hieu luc NGAY, khong doi token het han (8h).
// Doi lai: moi request them 1 truy van theo khoa chinh (rat nhe).
export async function xacThuc(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError(401, 'Thiếu token đăng nhập');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'Token không hợp lệ hoặc đã hết hạn');
  }
  const { rows } = await query('SELECT id, ho_ten, vai_tro, trang_thai, phien_ban_token FROM users WHERE id = $1', [payload.id]);
  const u = rows[0];
  if (!u || u.trang_thai !== 'active') throw new AppError(401, 'Tài khoản đã bị khoá');
  if (u.phien_ban_token !== (payload.pv ?? 0)) throw new AppError(401, 'Phiên đăng nhập đã hết hiệu lực, vui lòng đăng nhập lại');
  req.user = { id: u.id, ho_ten: u.ho_ten, vai_tro: u.vai_tro }; // vai tro lay tu CSDL (moi nhat), khong tin token
  next();
}

export function phanQuyen(...vaiTroChoPhep) {
  return (req, res, next) => {
    if (!vaiTroChoPhep.includes(req.user?.vai_tro)) {
      return next(new AppError(403, 'Bạn không có quyền thực hiện thao tác này'));
    }
    next();
  };
}
