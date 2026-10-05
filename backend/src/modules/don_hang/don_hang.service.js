import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './don_hang.repository.js';

const TRANG_THAI_DON = ['moi', 'dang_xu_ly', 'hoan_tat'];

export async function danhSach(user, { trang_thai, q, page, limit }) {
  if (trang_thai && !TRANG_THAI_DON.includes(trang_thai)) {
    throw new AppError(400, 'Trạng thái không hợp lệ');
  }
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const soDong = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  // Sale chi thay don cua minh; cac vai tro khac thay toan bo.
  const saleId = user.vai_tro === 'sale' ? user.id : null;
  const { items, tong } = await repo.findAll({
    saleId, trangThai: trang_thai, tuKhoa: q?.trim() || null, limit: soDong, offset: (trang - 1) * soDong,
  });
  return { items, tong, page: trang, limit: soDong, soTrang: Math.max(1, Math.ceil(tong / soDong)) };
}

export async function chiTiet(user, id) {
  const donHang = await repo.findById(id);
  if (!donHang) throw new AppError(404, 'Không tìm thấy đơn hàng');
  if (user.vai_tro === 'sale' && donHang.sale_id !== user.id) {
    throw new AppError(403, 'Bạn không phụ trách đơn hàng này');
  }
  const [vatTu, yeuCauSua] = await Promise.all([repo.findVatTu(id), repo.findYeuCauSua(id)]);
  return { ...donHang, vat_tu: vatTu, yeu_cau_sua: yeuCauSua };
}

export async function taoDonHang(user, data) {
  const { khach_hang_id, dia_chi_cong_trinh, vat_tu = [] } = data;
  if (!khach_hang_id) throw new AppError(400, 'Vui lòng chọn khách hàng');
  if (!dia_chi_cong_trinh?.trim()) throw new AppError(400, 'Vui lòng nhập địa chỉ công trình');
  if (!(await repo.khachHangThuocSale(khach_hang_id, user.id))) {
    throw new AppError(403, 'Khách hàng không thuộc danh sách bạn phụ trách');
  }
  for (const it of vat_tu) {
    if (!it.vat_tu_id || !(Number(it.so_luong_can) > 0)) {
      throw new AppError(400, 'Mỗi dòng vật tư cần chọn vật tư và số lượng lớn hơn 0');
    }
  }

  return withTransaction(async (client) => {
    const ma_don = await repo.sinhMaDon(client);
    const donHang = await repo.create(client, {
      ma_don, khach_hang_id, sale_id: user.id, dia_chi_cong_trinh: dia_chi_cong_trinh.trim(),
    });
    await repo.addVatTu(client, donHang.id, vat_tu);
    return donHang;
  });
}

export async function capNhatPhuongAn(user, id, data) {
  const donHang = await repo.updatePhuongAn(id, user.id, data);
  if (!donHang) throw new AppError(404, 'Không tìm thấy đơn hàng');
  return donHang;
}

export async function guiYeuCauSua(user, id, noiDung) {
  if (!noiDung?.trim()) throw new AppError(400, 'Vui lòng nhập nội dung yêu cầu');
  const donHang = await repo.findById(id);
  if (!donHang) throw new AppError(404, 'Không tìm thấy đơn hàng');
  if (donHang.sale_id !== user.id) throw new AppError(403, 'Bạn không phụ trách đơn hàng này');
  return repo.createYeuCauSua(id, user.id, noiDung.trim());
}

export async function xuLyYeuCauSua(donHangId, yeuCauId) {
  const yeuCau = await repo.danhDauDaXuLy(donHangId, yeuCauId);
  if (!yeuCau) throw new AppError(409, 'Yêu cầu không tồn tại hoặc đã được xử lý');
  return yeuCau;
}
