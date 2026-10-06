import crypto from 'crypto';
import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './don_hang.repository.js';

const TRANG_THAI_DON = ['nhap', 'moi', 'dang_xu_ly', 'hoan_tat'];
const HINH_THUC = ['hoan_thien', 'vat_tu'];
const NGHIEM_THU = ['vat_tu_tieu_hao', 'so_m2_thi_cong', 'theo_hop_dong'];
const LOAI_THI_CONG = ['op_tran_phang', 'op_tran_giat_cap', 'op_tuong_khong_xuong', 'op_tuong_co_xuong', 'khac'];

// Dieu khoan thanh toan sinh tu MOT con so, thay vi o chu tu do (du lieu that bi go hon 20 kieu cho cung mot y).
export function dieuKhoanThanhToan(tyLe, hinhThuc) {
  if (Number(tyLe) >= 100) return 'Thanh toán 100% giá trị đơn hàng khi nhận hàng.';
  const sau = hinhThuc === 'vat_tu' ? 'sau khi giao đủ hàng' : 'ngay sau khi nghiệm thu';
  if (Number(tyLe) <= 0) return `Thanh toán 100% giá trị đơn hàng ${sau}.`;
  return `Nhận hàng tạm ứng ${tyLe}% giá trị đơn hàng, ${100 - tyLe}% còn lại thanh toán ${sau}.`;
}

const soKhongAm = (v, ten) => {
  const n = v === '' || v === null || v === undefined ? 0 : Number(v);
  if (!Number.isFinite(n) || n < 0) throw new AppError(400, `${ten} không hợp lệ`);
  return n;
};
const phanTram = (v, ten, macDinh) => {
  const n = v === '' || v === null || v === undefined ? macDinh : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new AppError(400, `${ten} phải từ 0 đến 100`);
  return n;
};
const ngayHopLe = (v, ten) => {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new AppError(400, `${ten} không hợp lệ`);
  return v;
};
const chuOrNull = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const motTrong = (v, dsHopLe, ten) => {
  if (v === '' || v === null || v === undefined) return null;
  if (!dsHopLe.includes(v)) throw new AppError(400, `${ten} không hợp lệ`);
  return v;
};
const soNguyenDuong = (v, ten) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, `${ten} phải là số nguyên dương (mm)`);
  return n;
};

function chuanHoaDon(data) {
  const hinhThuc = data.hinh_thuc || 'hoan_thien';
  if (!HINH_THUC.includes(hinhThuc)) throw new AppError(400, 'Hình thức đơn không hợp lệ');
  const vatTu = Array.isArray(data.vat_tu) ? data.vat_tu : [];
  return {
    hinh_thuc: hinhThuc,
    ma_hop_dong: chuOrNull(data.ma_hop_dong),
    ngay_yc_lap_dat: ngayHopLe(data.ngay_yc_lap_dat, 'Ngày yêu cầu lắp đặt'),
    tinh_thanh: chuOrNull(data.tinh_thanh),
    phuong_xa: chuOrNull(data.phuong_xa),
    dia_chi_cong_trinh: chuOrNull(data.dia_chi_cong_trinh),
    phi_van_chuyen: soKhongAm(data.phi_van_chuyen, 'Phí vận chuyển'),
    phu_thu: soKhongAm(data.phu_thu, 'Phụ thu'),
    chiet_khau_pct: phanTram(data.chiet_khau_pct, 'Chiết khấu', 0),
    tien_coc: soKhongAm(data.tien_coc, 'Tiền cọc'),
    ngay_coc: ngayHopLe(data.ngay_coc, 'Ngày cọc'),
    ty_le_tam_ung: Math.round(phanTram(data.ty_le_tam_ung, 'Tỷ lệ tạm ứng', 80)),
    dieu_khoan_nghiem_thu: motTrong(data.dieu_khoan_nghiem_thu, NGHIEM_THU, 'Điều khoản nghiệm thu'),
    ghi_chu_van_chuyen: chuOrNull(data.ghi_chu_van_chuyen),
    vat_tu: vatTu.map((it, i) => {
      if (!it.vat_tu_id) throw new AppError(400, `Dòng vật tư ${i + 1}: chưa chọn vật tư`);
      const sl = Number(it.so_luong_can);
      if (!(sl > 0)) throw new AppError(400, `Dòng vật tư ${i + 1}: số lượng phải lớn hơn 0`);
      return {
        vat_tu_id: Number(it.vat_tu_id), so_luong_can: sl, don_gia: soKhongAm(it.don_gia, `Đơn giá dòng ${i + 1}`), ghi_chu: chuOrNull(it.ghi_chu),
        loai_thi_cong: motTrong(it.loai_thi_cong, LOAI_THI_CONG, `Loại thi công dòng ${i + 1}`),
        dai_mm: soNguyenDuong(it.dai_mm, `Chiều dài dòng ${i + 1}`),
        rong_mm: soNguyenDuong(it.rong_mm, `Chiều rộng dòng ${i + 1}`),
      };
    }),
  };
}

// Dieu kien de chuyen don sang Van hanh: nhap nhap thi duoc thieu, chot thi phai du.
function kiemTraDuDeChot(don) {
  const thieu = [];
  if (!don.tinh_thanh) thieu.push('tỉnh/thành');
  if (!don.dia_chi_cong_trinh) thieu.push('địa chỉ cụ thể');
  if (!don.vat_tu.length) thieu.push('ít nhất một vật tư');
  if (don.vat_tu.some((v) => !(v.don_gia > 0))) thieu.push('đơn giá cho mọi dòng vật tư');
  if (don.hinh_thuc === 'hoan_thien' && !don.ngay_yc_lap_dat) thieu.push('ngày yêu cầu lắp đặt');
  if (!don.dieu_khoan_nghiem_thu) thieu.push('điều khoản nghiệm thu');
  if (thieu.length) throw new AppError(400, `Chưa thể chốt đơn, còn thiếu: ${thieu.join(', ')}`);
}

async function layDonCuaToi(user, id) {
  const don = await repo.findById(id);
  if (!don) throw new AppError(404, 'Không tìm thấy đơn hàng');
  if (don.sale_id !== user.id) throw new AppError(403, 'Bạn không phụ trách đơn hàng này');
  return don;
}

export async function danhSach(user, { trang_thai, hinh_thuc, q, page, limit }) {
  if (trang_thai && !TRANG_THAI_DON.includes(trang_thai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  if (hinh_thuc && !HINH_THUC.includes(hinh_thuc)) throw new AppError(400, 'Hình thức không hợp lệ');
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const soDong = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const laSale = user.vai_tro === 'sale';
  // Sale thay don cua minh (ke ca nhap); vai tro khac khong thay don nhap.
  const { items, tong } = await repo.findAll({
    saleId: laSale ? user.id : null, anNhap: !laSale, trangThai: trang_thai, hinhThuc: hinh_thuc,
    tuKhoa: q?.trim() || null, limit: soDong, offset: (trang - 1) * soDong,
  });
  return { items, tong, page: trang, limit: soDong, soTrang: Math.max(1, Math.ceil(tong / soDong)) };
}

export async function chiTiet(user, id) {
  const don = await repo.findById(id);
  // Don nhap chi chu don thay duoc; tra 404 (khong phai 403) de khong lo su ton tai cua don.
  if (!don || (don.trang_thai === 'nhap' && don.sale_id !== user.id)) throw new AppError(404, 'Không tìm thấy đơn hàng');
  if (user.vai_tro === 'sale' && don.sale_id !== user.id) throw new AppError(403, 'Bạn không phụ trách đơn hàng này');
  const [vatTu, yeuCauSua] = await Promise.all([repo.findVatTu(id), repo.findYeuCauSua(id)]);
  return { ...don, dieu_khoan_thanh_toan: dieuKhoanThanhToan(don.ty_le_tam_ung, don.hinh_thuc), vat_tu: vatTu, yeu_cau_sua: yeuCauSua };
}

export async function taoDonHang(user, data) {
  if (!data.khach_hang_id) throw new AppError(400, 'Vui lòng chọn khách hàng');
  if (!(await repo.khachHangThuocSale(data.khach_hang_id, user.id))) {
    throw new AppError(403, 'Khách hàng không thuộc danh sách bạn phụ trách');
  }
  const don = chuanHoaDon(data);
  if (data.chot) kiemTraDuDeChot(don);

  return withTransaction(async (client) => {
    const ma_don = await repo.sinhMaDon(client);
    const moi = await repo.create(client, {
      ...don, ma_don, khach_hang_id: Number(data.khach_hang_id), sale_id: user.id,
      trang_thai: data.chot ? 'moi' : 'nhap', ngay_chot: data.chot ? new Date().toISOString().slice(0, 10) : null,
    });
    await repo.thayVatTu(client, moi.id, don.vat_tu);
    return moi;
  });
}

export async function suaDonNhap(user, id, data) {
  const hienTai = await layDonCuaToi(user, id);
  if (hienTai.trang_thai !== 'nhap') throw new AppError(409, 'Đơn đã chốt, không sửa trực tiếp được — hãy gửi yêu cầu chỉnh sửa cho Vận hành');
  const don = chuanHoaDon(data);
  if (data.chot) kiemTraDuDeChot(don);
  await withTransaction(async (client) => {
    await repo.update(client, id, don);
    await repo.thayVatTu(client, id, don.vat_tu);
    if (data.chot && !(await repo.chot(client, id))) throw new AppError(409, 'Đơn đã được chốt trước đó');
  });
  // Doc lai SAU khi commit: ket noi khac trong pool khong thay du lieu cua transaction chua commit.
  return repo.findById(id);
}

// Link bao gia: ma ngau nhien 192 bit (khong doan duoc nhu id so tang dan). Tao lai = thu hoi link cu.
export async function taoLinkBaoGia(user, id, { taoMoi = false } = {}) {
  const don = await layDonCuaToi(user, id);
  if (don.bao_gia_token && !taoMoi) return { token: don.bao_gia_token, tao_luc: don.bao_gia_tao_luc };
  const kq = await repo.datBaoGiaToken(id, crypto.randomBytes(24).toString('base64url'));
  return { token: kq.bao_gia_token, tao_luc: kq.bao_gia_tao_luc };
}

export async function xoaDonNhap(user, id) {
  const don = await layDonCuaToi(user, id);
  if (don.trang_thai !== 'nhap') throw new AppError(409, 'Chỉ xoá được đơn nháp');
  await repo.xoaNhap(id);
}

export async function capNhatPhuongAn(user, id, data) {
  const donHang = await repo.updatePhuongAn(id, user.id, data);
  if (!donHang) throw new AppError(404, 'Không tìm thấy đơn hàng');
  return donHang;
}

export async function guiYeuCauSua(user, id, noiDung) {
  if (!noiDung?.trim()) throw new AppError(400, 'Vui lòng nhập nội dung yêu cầu');
  const don = await layDonCuaToi(user, id);
  if (don.trang_thai === 'nhap') throw new AppError(400, 'Đơn nháp có thể sửa trực tiếp, không cần gửi yêu cầu');
  return repo.createYeuCauSua(id, user.id, noiDung.trim());
}

export async function xuLyYeuCauSua(donHangId, yeuCauId) {
  const yeuCau = await repo.danhDauDaXuLy(donHangId, yeuCauId);
  if (!yeuCau) throw new AppError(409, 'Yêu cầu không tồn tại hoặc đã được xử lý');
  return yeuCau;
}
