import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './khach_hang.repository.js';

export const TRANG_THAI_CHAM_SOC = ['moi', 'dang_tu_van', 'da_bao_gia', 'chot', 'khong_mua'];
const NHOM_KHACH = ['nha_dan', 'nha_thau', 'doi_tac', 'khac'];

// Sale chi lam viec voi khach minh phu trach; Admin xem duoc tat ca.
async function layKhachDuocPhep(user, id) {
  const kh = await repo.findById(id);
  if (!kh) throw new AppError(404, 'Không tìm thấy khách hàng');
  if (user.vai_tro === 'sale' && kh.sale_phu_trach_id !== user.id) {
    throw new AppError(403, 'Bạn không phụ trách khách hàng này');
  }
  return kh;
}

export async function danhSach(user, { trang_thai, q, page, limit }) {
  if (trang_thai && !TRANG_THAI_CHAM_SOC.includes(trang_thai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const soDong = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const { items, tong } = await repo.findAll({
    saleId: user.vai_tro === 'sale' ? user.id : null,
    trangThai: trang_thai, tuKhoa: q?.trim() || null, limit: soDong, offset: (trang - 1) * soDong,
  });
  return { items, tong, page: trang, limit: soDong, soTrang: Math.max(1, Math.ceil(tong / soDong)) };
}

export async function chiTiet(user, id) {
  const kh = await layKhachDuocPhep(user, id);
  const [lichSu, donHang] = await Promise.all([repo.findLichSu(id), repo.findDonHang(id)]);
  return { ...kh, lich_su: lichSu, don_hang: donHang };
}

export async function taoKhach(user, { ten, sdt, dia_chi, nhom_khach_hang = 'nha_dan' }) {
  if (!ten?.trim()) throw new AppError(400, 'Vui lòng nhập tên khách hàng');
  if (!NHOM_KHACH.includes(nhom_khach_hang)) throw new AppError(400, 'Nhóm khách hàng không hợp lệ');
  const soDt = (sdt || '').replace(/\D/g, '');
  if (soDt && !/^0\d{9,10}$/.test(soDt)) throw new AppError(400, 'Số điện thoại không hợp lệ');
  return repo.create({ ten: ten.trim(), sdt: soDt || null, dia_chi: dia_chi?.trim() || null, nhom_khach_hang, sale_phu_trach_id: user.id });
}

export async function ghiChamSoc(user, id, { trang_thai, noi_dung }) {
  if (!TRANG_THAI_CHAM_SOC.includes(trang_thai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  await layKhachDuocPhep(user, id);
  // Cap nhat trang thai va ghi lich su trong cung transaction: khong bao gio co trang thai ma thieu lich su.
  return withTransaction((client) => repo.ghiChamSoc(client, {
    khachHangId: id, saleId: user.id, trangThai: trang_thai, noiDung: noi_dung?.trim() || null,
  }));
}
