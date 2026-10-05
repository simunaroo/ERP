import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

export function xacThuc(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Thiếu token đăng nhập'));
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new AppError(401, 'Token không hợp lệ hoặc đã hết hạn'));
  }
}

export function phanQuyen(...vaiTroChoPhep) {
  return (req, res, next) => {
    if (!vaiTroChoPhep.includes(req.user?.vai_tro)) {
      return next(new AppError(403, 'Bạn không có quyền thực hiện thao tác này'));
    }
    next();
  };
}
