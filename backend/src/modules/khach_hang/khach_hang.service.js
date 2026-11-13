import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './khach_hang.repository.js';
import { lichSuGiao } from '../nhap_so/nhap_so.service.js';

export const TRANG_THAI_CHAM_SOC = ['moi', 'khong_nghe_may', 'thue_bao', 'hen_goi_lai', 'quan_tam', 'chot', 'khong_quan_tam', 'sai_so'];
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

// San pham quan tam gui len: mang id loai san pham (khong trung, phai co trong danh muc).
async function chuanHoaSanPham(dsId) {
  if (dsId === undefined || dsId === null) return [];
  if (!Array.isArray(dsId)) throw new AppError(400, 'Sản phẩm quan tâm không hợp lệ');
  const ids = [...new Set(dsId.map(Number))];
  if (ids.some((n) => !Number.isInteger(n) || n <= 0)) throw new AppError(400, 'Sản phẩm quan tâm không hợp lệ');
  if (ids.length && (await repo.sanPhamKhongCo(ids)).length) throw new AppError(400, 'Sản phẩm không có trong danh mục');
  return ids;
}

export async function danhSach(user, { trang_thai, q, san_pham, page, limit }) {
  if (trang_thai && !TRANG_THAI_CHAM_SOC.includes(trang_thai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  const sanPhamId = san_pham ? Number(san_pham) : null;
  if (san_pham && !(Number.isInteger(sanPhamId) && sanPhamId > 0)) throw new AppError(400, 'Sản phẩm không hợp lệ');
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const soDong = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const { items, tong } = await repo.findAll({
    saleId: user.vai_tro === 'sale' ? user.id : null,
    trangThai: trang_thai, tuKhoa: q?.trim() || null, sanPhamId, limit: soDong, offset: (trang - 1) * soDong,
  });
  return { items, tong, page: trang, limit: soDong, soTrang: Math.max(1, Math.ceil(tong / soDong)) };
}

export async function chiTiet(user, id) {
  const kh = await layKhachDuocPhep(user, id);
  const [lichSu, donHang, giaoSo] = await Promise.all([repo.findLichSu(id), repo.findDonHang(id), lichSuGiao(id)]);
  return { ...kh, lich_su: lichSu, don_hang: donHang, giao_so: giaoSo };
}

export async function taoKhach(user, { ten, sdt, dia_chi, nhom_khach_hang = 'nha_dan', san_pham_ids }) {
  if (!ten?.trim()) throw new AppError(400, 'Vui lòng nhập tên khách hàng');
  if (!NHOM_KHACH.includes(nhom_khach_hang)) throw new AppError(400, 'Nhóm khách hàng không hợp lệ');
  const soDt = (sdt || '').replace(/\D/g, '');
  if (soDt && !/^0\d{9,10}$/.test(soDt)) throw new AppError(400, 'Số điện thoại không hợp lệ');
  const sanPham = await chuanHoaSanPham(san_pham_ids);
  return withTransaction(async (client) => {
    const kh = await repo.create(client, { ten: ten.trim(), sdt: soDt || null, dia_chi: dia_chi?.trim() || null, nhom_khach_hang, sale_phu_trach_id: user.id });
    await repo.datSanPham(client, kh.id, sanPham);
    return kh;
  });
}

// Sale (khach minh phu trach) / Admin tick lai danh sach san pham khach quan tam.
export async function capNhatSanPham(user, id, { san_pham_ids }) {
  await layKhachDuocPhep(user, id);
  const sanPham = await chuanHoaSanPham(san_pham_ids);
  await withTransaction((client) => repo.datSanPham(client, id, sanPham));
  return (await repo.findById(id)).san_pham;
}

export async function ghiChamSoc(user, id, { trang_thai, noi_dung, hen_goi_lai_luc }) {
  if (!TRANG_THAI_CHAM_SOC.includes(trang_thai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  // "Moi" chi do he thong gan luc nhap so; da lien he roi thi khong quay ve "Moi".
  if (trang_thai === 'moi') throw new AppError(400, 'Hãy chọn kết quả lần liên hệ (không nghe máy, quan tâm, hẹn gọi lại...)');
  let hen = null;
  if (trang_thai === 'hen_goi_lai') {
    hen = new Date(hen_goi_lai_luc || '');
    if (Number.isNaN(hen.getTime())) throw new AppError(400, 'Vui lòng chọn thời điểm hẹn gọi lại');
    if (hen < new Date(Date.now() - 60 * 60 * 1000)) throw new AppError(400, 'Thời điểm hẹn gọi lại phải ở tương lai');
  }
  const noiDung = noi_dung?.trim() || null;
  if (['khong_quan_tam', 'sai_so'].includes(trang_thai) && !noiDung) throw new AppError(400, 'Vui lòng ghi chú lý do (khách nói gì / số sai thế nào)');
  await layKhachDuocPhep(user, id);
  // Cap nhat trang thai va ghi lich su trong cung transaction: khong bao gio co trang thai ma thieu lich su.
  return withTransaction((client) => repo.ghiChamSoc(client, {
    khachHangId: id, saleId: user.id, trangThai: trang_thai, noiDung, henGoiLaiLuc: hen,
  }));
}
