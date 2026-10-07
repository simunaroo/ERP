import { AppError } from '../../utils/AppError.js';
import * as repo from './danh_muc.repository.js';

const chu = (v) => (typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ') : null);

export async function taoLoaiVatTu(b) {
  const ten = chu(b.ten);
  if (!ten) throw new AppError(400, 'Nhập tên loại vật tư');
  if (!['tu_san_xuat', 'mua_ngoai'].includes(b.nguon_goc)) throw new AppError(400, 'Chọn nguồn gốc: tự sản xuất hoặc mua ngoài');
  return repo.taoLoaiVatTu(ten, b.nguon_goc); // trung ten -> 409 (UNIQUE)
}

export async function luuVatTu(id, b) {
  const cu = id ? await repo.findVatTu(id) : null;
  if (id && !cu) throw new AppError(404, 'Không tìm thấy vật tư');
  const ten = chu(b.ten ?? cu?.ten);
  const donVi = chu(b.don_vi_tinh ?? cu?.don_vi_tinh);
  const loaiId = Number(b.loai_vat_tu_id ?? cu?.loai_vat_tu_id);
  if (!ten) throw new AppError(400, 'Nhập tên vật tư');
  if (!donVi) throw new AppError(400, 'Nhập đơn vị tính');
  if (!(await repo.loaiVatTu()).some((l) => l.id === loaiId)) throw new AppError(400, 'Loại vật tư không hợp lệ');
  // Doi loai (co the doi nguon goc tu SX <-> mua ngoai) khi da co don dung se lam sai mua hang -> chan.
  if (cu && loaiId !== cu.loai_vat_tu_id && cu.so_dong_don > 0) throw new AppError(409, 'Vật tư đã dùng trong đơn — không đổi loại được (hãy tạo vật tư mới)');
  const trangThai = b.trang_thai ?? cu?.trang_thai ?? 'active';
  if (!['active', 'ngung_hoat_dong'].includes(trangThai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  // Trung ten (khong phan biet hoa thuong) -> UNIQUE INDEX ux_vat_tu_ten -> 409.
  return repo.luuVatTu(id, { ten, don_vi_tinh: donVi, loai_vat_tu_id: loaiId, quy_cach: chu(b.quy_cach ?? cu?.quy_cach ?? ''), trang_thai: trangThai });
}
