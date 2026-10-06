import { AppError } from '../../utils/AppError.js';
import { dieuKhoanThanhToan } from '../don_hang/don_hang.service.js';
import * as repo from './bao_gia.repository.js';

// Token do he thong sinh: 24 byte base64url = 32 ky tu. Sai dinh dang thi tra 404 luon, khong cham DB.
const DANG_TOKEN = /^[A-Za-z0-9_-]{32}$/;

export async function xemBaoGia(token) {
  if (!DANG_TOKEN.test(token)) throw new AppError(404, 'Báo giá không tồn tại hoặc đã bị thu hồi');
  const don = await repo.findByToken(token);
  if (!don) throw new AppError(404, 'Báo giá không tồn tại hoặc đã bị thu hồi');
  const { id, ...congKhai } = don;
  return {
    ...congKhai,
    dieu_khoan_thanh_toan: dieuKhoanThanhToan(don.ty_le_tam_ung, don.hinh_thuc),
    vat_tu: await repo.findDong(id),
  };
}
