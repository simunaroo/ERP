import { AppError } from '../utils/AppError.js';

// Ma loi PostgreSQL -> HTTP: vi pham UNIQUE / khoa ngoai / CHECK / ENUM la loi du lieu dau vao, khong phai loi server.
const PG_ERRORS = {
  '23505': [409, 'Dữ liệu bị trùng'],
  '23503': [400, 'Dữ liệu tham chiếu không tồn tại'],
  '23514': [400, 'Dữ liệu không thoả ràng buộc'],
  '22P02': [400, 'Giá trị không hợp lệ'],
};

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (PG_ERRORS[err.code]) {
    const [status, message] = PG_ERRORS[err.code];
    return res.status(status).json({ message });
  }
  console.error(err);
  res.status(500).json({ message: 'Lỗi máy chủ' });
}
