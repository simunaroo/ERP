import crypto from 'crypto';
import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './don_hang.repository.js';
import * as thongBao from '../thong_bao/thong_bao.service.js';
import { vatTuDaNgung } from '../danh_muc/danh_muc.repository.js';
import { BUOC, HUY_DUOC, NHAN, buocKe, vaiTroPhuTrach } from './giai_doan.js';

const TRANG_THAI_DON = ['nhap', 'moi', 'dang_xu_ly', 'hoan_tat', 'huy'];
const GIAI_DOAN = [...BUOC.hoan_thien, 'hoan_tat', 'huy'];
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

const NHOM_KHACH = ['nha_dan', 'nha_thau', 'doi_tac', 'khac'];
const soOrNull = (v, ten) => {
  if (v === '' || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new AppError(400, `${ten} không hợp lệ`);
  return n;
};

export async function danhSach(user, query) {
  const { trang_thai, hinh_thuc, q, page, limit } = query;
  if (trang_thai && !TRANG_THAI_DON.includes(trang_thai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  if (hinh_thuc && !HINH_THUC.includes(hinh_thuc)) throw new AppError(400, 'Hình thức không hợp lệ');
  if (query.sap_xep && !repo.KHOA_SAP_XEP.includes(query.sap_xep)) throw new AppError(400, 'Kiểu sắp xếp không hợp lệ');
  if (query.con_no && !['con', 'het'].includes(query.con_no)) throw new AppError(400, 'Bộ lọc công nợ không hợp lệ');
  let saleLoc = null;
  if (query.sale_id) {
    saleLoc = Number(query.sale_id);
    if (!Number.isInteger(saleLoc) || saleLoc <= 0) throw new AppError(400, 'Sale không hợp lệ');
  }
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const soDong = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const laSale = user.vai_tro === 'sale';
  // Sale thay don cua minh (ke ca nhap); vai tro khac khong thay don nhap.
  const { items, tong } = await repo.findAll({
    // Sale luon bi gioi han ve don cua minh, bo qua sale_id gui len (khong tin client).
    saleId: laSale ? user.id : saleLoc, anNhap: !laSale, trangThai: trang_thai, hinhThuc: hinh_thuc,
    giaiDoan: motTrong(query.giai_doan, GIAI_DOAN, 'Giai đoạn'),
    // Van hanh luon bi gioi han ve don minh phu trach, bo qua van_hanh_id gui len.
    vanHanhId: vanHanhCua(user) ?? (query.van_hanh_id === 'chua' ? 'chua' : (Number(query.van_hanh_id) || null)),
    tuKhoa: q?.trim() || null,
    nhomKhach: motTrong(query.nhom_khach, NHOM_KHACH, 'Nhóm khách'),
    tinhThanh: chuOrNull(query.tinh_thanh),
    nghiemThu: motTrong(query.nghiem_thu, NGHIEM_THU, 'Điều khoản nghiệm thu'),
    chotTu: ngayHopLe(query.chot_tu, 'Ngày chốt từ'), chotDen: ngayHopLe(query.chot_den, 'Ngày chốt đến'),
    lapDatTu: ngayHopLe(query.lap_dat_tu, 'Ngày lắp đặt từ'), lapDatDen: ngayHopLe(query.lap_dat_den, 'Ngày lắp đặt đến'),
    tongTu: soOrNull(query.tong_tu, 'Tổng đơn từ'), tongDen: soOrNull(query.tong_den, 'Tổng đơn đến'),
    conNo: query.con_no || null, sapXep: query.sap_xep || 'moi_nhat',
    limit: soDong, offset: (trang - 1) * soDong,
  });
  return { items, tong, page: trang, limit: soDong, soTrang: Math.max(1, Math.ceil(tong / soDong)) };
}

export async function chiTiet(user, id) {
  const don = await repo.findById(id);
  // Don nhap chi chu don thay duoc; tra 404 (khong phai 403) de khong lo su ton tai cua don.
  if (!don || (don.trang_thai === 'nhap' && don.sale_id !== user.id)) throw new AppError(404, 'Không tìm thấy đơn hàng');
  if (user.vai_tro === 'sale' && don.sale_id !== user.id) throw new AppError(403, 'Bạn không phụ trách đơn hàng này');
  if (user.vai_tro === 'van_hanh' && don.vanhanh_phu_trach_id !== user.id) throw new AppError(403, 'Bạn không phụ trách đơn hàng này');
  const [vatTu, yeuCauSua, lichSu, phanCong] = await Promise.all([repo.findVatTu(id), repo.findYeuCauSua(id), repo.findLichSuGiaiDoan(id), repo.lichSuPhanCong(id)]);
  return {
    ...don, dieu_khoan_thanh_toan: dieuKhoanThanhToan(don.ty_le_tam_ung, don.hinh_thuc),
    vat_tu: vatTu, yeu_cau_sua: yeuCauSua, lich_su_giai_doan: lichSu, lich_su_phan_cong: phanCong,
  };
}

// Luc chot: giao cho Van hanh it don dang mo nhat (chia deu tai). Khong co Van hanh nao -> de trong, Admin phan sau.
async function phanCongTuDong(client, donHangId) {
  const vh = await repo.chonVanHanhItViec(client);
  if (!vh) return;
  await repo.ganVanHanh(client, donHangId, { tu: null, den: vh, nguoiId: null, lyDo: 'Tự động: Vận hành ít đơn đang xử lý nhất' });
  await thongBao.giaoDon(client, donHangId, { den: vh });
}

// Admin chuyen don sang Van hanh khac (nghi phep, qua tai...). Phien cua nguoi cu van dung duoc, nhung tu gio khong thao tac duoc don nay.
export async function doiPhuTrach(user, id, { van_hanh_id, ly_do }) {
  const den = Number(van_hanh_id);
  const lyDo = chuOrNull(ly_do);
  if (!lyDo) throw new AppError(400, 'Vui lòng ghi lý do chuyển phụ trách');
  await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT id, trang_thai, vanhanh_phu_trach_id FROM don_hang WHERE id = $1 FOR UPDATE', [id]);
    const don = rows[0];
    if (!don || don.trang_thai === 'nhap') throw new AppError(404, 'Không tìm thấy đơn hàng');
    const vh = (await client.query(`SELECT id FROM users WHERE id = $1 AND vai_tro = 'van_hanh' AND trang_thai = 'active'`, [den])).rows[0];
    if (!vh) throw new AppError(400, 'Người nhận phải là Vận hành đang hoạt động');
    if (don.vanhanh_phu_trach_id === den) throw new AppError(400, 'Đơn đã do người này phụ trách');
    await repo.ganVanHanh(client, id, { tu: don.vanhanh_phu_trach_id, den, nguoiId: user.id, lyDo });
    await thongBao.giaoDon(client, id, { den, tu: don.vanhanh_phu_trach_id, nguoiGayId: user.id, lyDo });
  });
  return chiTiet(user, id);
}

export async function taoDonHang(user, data) {
  if (!data.khach_hang_id) throw new AppError(400, 'Vui lòng chọn khách hàng');
  if (!(await repo.khachHangThuocSale(data.khach_hang_id, user.id))) {
    throw new AppError(403, 'Khách hàng không thuộc danh sách bạn phụ trách');
  }
  const don = chuanHoaDon(data);
  if (data.chot) kiemTraDuDeChot(don);
  const ngung = await vatTuDaNgung(don.vat_tu.map((v) => v.vat_tu_id));
  if (ngung.length) throw new AppError(400, `Vật tư đã ngừng kinh doanh: ${ngung.join(', ')}`);

  return withTransaction(async (client) => {
    const ma_don = await repo.sinhMaDon(client);
    const moi = await repo.create(client, {
      ...don, ma_don, khach_hang_id: Number(data.khach_hang_id), sale_id: user.id,
      trang_thai: data.chot ? 'moi' : 'nhap', giai_doan: data.chot ? 'len_phuong_an' : null,
      ngay_chot: data.chot ? new Date().toISOString().slice(0, 10) : null,
    });
    await repo.thayVatTu(client, moi.id, don.vat_tu);
    if (data.chot) await repo.ghiLichSuGiaiDoan(client, { donHangId: moi.id, tu: null, den: 'len_phuong_an', nguoiId: user.id, ghiChu: 'Chốt đơn' });
    if (data.chot) await phanCongTuDong(client, moi.id);
    return moi;
  });
}

export async function suaDonNhap(user, id, data) {
  const hienTai = await layDonCuaToi(user, id);
  if (hienTai.trang_thai !== 'nhap') throw new AppError(409, 'Đơn đã chốt, không sửa trực tiếp được — hãy gửi yêu cầu chỉnh sửa cho Vận hành');
  const don = chuanHoaDon(data);
  if (data.chot) kiemTraDuDeChot(don);
  const ngung = await vatTuDaNgung(don.vat_tu.map((v) => v.vat_tu_id));
  if (ngung.length) throw new AppError(400, `Vật tư đã ngừng kinh doanh: ${ngung.join(', ')}`);
  await withTransaction(async (client) => {
    await repo.update(client, id, don);
    await repo.thayVatTu(client, id, don.vat_tu);
    if (data.chot) {
      if (!(await repo.chot(client, id))) throw new AppError(409, 'Đơn đã được chốt trước đó');
      await repo.ghiLichSuGiaiDoan(client, { donHangId: id, tu: null, den: 'len_phuong_an', nguoiId: user.id, ghiChu: 'Chốt đơn' });
      await phanCongTuDong(client, id);
    }
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
  await damBaoPhuTrach(user, id);
  const donHang = await repo.updatePhuongAn(id, user.id, data);
  if (!donHang) throw new AppError(404, 'Không tìm thấy đơn hàng');
  return donHang;
}

export async function guiYeuCauSua(user, id, noiDung) {
  if (!noiDung?.trim()) throw new AppError(400, 'Vui lòng nhập nội dung yêu cầu');
  const don = await layDonCuaToi(user, id);
  if (don.trang_thai === 'nhap') throw new AppError(400, 'Đơn nháp có thể sửa trực tiếp, không cần gửi yêu cầu');
  if (don.trang_thai === 'huy') throw new AppError(400, 'Đơn đã huỷ');
  return withTransaction(async (client) => {
    const yc = await repo.createYeuCauSua(id, user.id, noiDung.trim(), client);
    await thongBao.gui(client, {
      nguoiIds: [don.vanhanh_phu_trach_id], nguoiGayId: user.id, loai: 'yeu_cau_sua',
      tieuDe: `${user.ho_ten} yêu cầu sửa đơn ${don.ma_don}`, noiDung: noiDung.trim(), link: `/don-hang/${id}`,
    });
    return yc;
  });
}

// Dieu kien de roi khoi mot buoc (kiem tra o Service, khong tin giao dien) - theo luong ERP.
async function kiemTraRoiBuoc(client, don) {
  const gd = don.giai_doan;
  if (gd === 'len_phuong_an') {
    const thieu = [];
    if (!don.phuong_an_van_chuyen) thieu.push('phương án vận chuyển');
    if (don.hinh_thuc === 'hoan_thien' && !don.phuong_an_thi_cong) thieu.push('phương án thi công');
    if (thieu.length) throw new AppError(400, `Chưa thể chuyển bước, còn thiếu: ${thieu.join(', ')}`);
  }
  if (!['mua_hang', 'thi_cong', 'nghiem_thu', 'quyet_toan'].includes(gd)) return;
  const dk = await repo.dieuKienRoiBuoc(client, don.id);
  // Mua hang xong = 100% vat tu mua ngoai da san hang -> Van hanh "dang ky giao hang".
  if (gd === 'mua_hang' && dk.dong_chua_san > 0) throw new AppError(400, `Còn ${dk.dong_chua_san} dòng vật tư chưa sẵn hàng — chưa đăng ký giao hàng được`);
  if (gd === 'thi_cong' && (dk.so_giai_doan === 0 || dk.giai_doan_chua_xong > 0)) {
    throw new AppError(400, 'Mọi giai đoạn thi công phải báo xong trước khi sang Nghiệm thu');
  }
  if (gd === 'nghiem_thu' && !don.nghiem_thu_luc) throw new AppError(400, 'Hãy nhập số lượng thực tế và bấm "Xác nhận nghiệm thu"');
  if (gd === 'quyet_toan') throw new AppError(400, 'Dùng nút "Chốt quyết toán" để kết thúc đơn');
}

// Van hanh chi XEM va THAO TAC don minh phu trach (giong Sale chi thay don cua minh). Admin, Ke toan khong bi gioi han.
// Don chua phan cong: Van hanh khong thay — Admin phan truoc.
export async function damBaoPhuTrach(user, donHangId, client) {
  if (user.vai_tro !== 'van_hanh') return;
  const phuTrach = await repo.phuTrachCua(donHangId, client);
  if (phuTrach === undefined) throw new AppError(404, 'Không tìm thấy đơn hàng');
  if (phuTrach !== user.id) throw new AppError(403, 'Bạn không phụ trách đơn hàng này');
}

// Pham vi danh sach: Van hanh -> id cua minh, vai tro khac -> null (khong loc).
export const vanHanhCua = (user) => (user.vai_tro === 'van_hanh' ? user.id : null);

function kiemTraQuyen(user, giaiDoan) {
  const canVaiTro = vaiTroPhuTrach(giaiDoan);
  if (user.vai_tro !== 'admin' && user.vai_tro !== canVaiTro) {
    throw new AppError(403, `Bước "${NHAN[giaiDoan]}" do ${canVaiTro === 'ke_toan' ? 'Kế toán' : 'Vận hành'} xử lý`);
  }
}

async function luuChuyenBuoc(user, don, den, trangThai, ghiChu, kiemTra = false) {
  await withTransaction(async (client) => {
    if (kiemTra) await kiemTraRoiBuoc(client, don);
    const ok = await repo.chuyenGiaiDoan(client, don.id, {
      tu: don.giai_doan, den, trangThai, vanHanhId: user.vai_tro === 'van_hanh' ? user.id : null,
    });
    if (!ok) throw new AppError(409, 'Đơn vừa được người khác cập nhật tiến độ, vui lòng tải lại trang');
    await repo.ghiLichSuGiaiDoan(client, { donHangId: don.id, tu: don.giai_doan, den, nguoiId: user.id, ghiChu });
    if (don.giai_doan === 'giao_hang' && !['mua_hang', 'huy'].includes(den)) await repo.danhDauDaGiao(client, don.id);
    await thongBao.tienDoDon(client, don.id, den, { nguoiGayId: user.id, ghiChu });
  });
  return chiTiet(user, don.id);
}

// huong: 'tiep' = hoan thanh buoc hien tai; 'lui' = tra ve buoc truoc (bat buoc ghi ly do).
export async function chuyenGiaiDoan(user, id, { huong, ghi_chu }) {
  if (!['tiep', 'lui'].includes(huong)) throw new AppError(400, 'Hướng chuyển không hợp lệ');
  const don = await repo.findById(id);
  if (!don || don.trang_thai === 'nhap') throw new AppError(404, 'Không tìm thấy đơn hàng');
  if (['hoan_tat', 'huy'].includes(don.giai_doan)) throw new AppError(409, `Đơn đã ${NHAN[don.giai_doan].toLowerCase()}, không chuyển bước được`);
  kiemTraQuyen(user, don.giai_doan);
  await damBaoPhuTrach(user, id);
  const ghiChu = chuOrNull(ghi_chu);
  const den = buocKe(don.hinh_thuc, don.giai_doan, huong);
  if (!den) throw new AppError(400, 'Đơn đang ở bước đầu tiên, không lùi được nữa');
  if (huong === 'lui' && !ghiChu) throw new AppError(400, 'Vui lòng ghi lý do lùi bước');
  return luuChuyenBuoc(user, don, den, den === 'hoan_tat' ? 'hoan_tat' : 'dang_xu_ly', ghiChu, huong === 'tiep');
}

// Module khac (Mua hang, Thi cong) tu day tien do don trong CUNG transaction cua no:
// vd "nhan du hang" va "chuyen sang Giao hang" cung thanh cong hoac cung that bai.
// Don khong con o buoc `tu` (nguoi khac da chuyen) -> bo qua, tra false.
export async function tuDongChuyenBuoc(client, { donHangId, tu, den, nguoiId, ghiChu }) {
  const ok = await repo.chuyenGiaiDoan(client, donHangId, {
    tu, den, trangThai: den === 'hoan_tat' ? 'hoan_tat' : 'dang_xu_ly', vanHanhId: null,
  });
  if (ok) {
    await repo.ghiLichSuGiaiDoan(client, { donHangId, tu, den, nguoiId, ghiChu });
    if (tu === 'giao_hang' && !['mua_hang', 'huy'].includes(den)) await repo.danhDauDaGiao(client, donHangId);
    await thongBao.tienDoDon(client, donHangId, den, { nguoiGayId: nguoiId, ghiChu });
  }
  return ok;
}

export async function huyDon(user, id, { ly_do }) {
  const don = await repo.findById(id);
  if (!don || don.trang_thai === 'nhap') throw new AppError(404, 'Không tìm thấy đơn hàng');
  if (!HUY_DUOC.includes(don.giai_doan)) throw new AppError(409, 'Chỉ huỷ được đơn trước khi giao hàng');
  await damBaoPhuTrach(user, id);
  const lyDo = chuOrNull(ly_do);
  if (!lyDo) throw new AppError(400, 'Vui lòng ghi lý do huỷ đơn');
  return luuChuyenBuoc(user, don, 'huy', 'huy', lyDo);
}

export async function xuLyYeuCauSua(user, donHangId, yeuCauId) {
  await damBaoPhuTrach(user, donHangId);
  return withTransaction(async (client) => {
    const yeuCau = await repo.danhDauDaXuLy(donHangId, yeuCauId, client);
    if (!yeuCau) throw new AppError(409, 'Yêu cầu không tồn tại hoặc đã được xử lý');
    const { rows } = await client.query('SELECT ma_don FROM don_hang WHERE id = $1', [donHangId]);
    await thongBao.gui(client, {
      nguoiIds: [yeuCau.sale_id], nguoiGayId: user.id, loai: 'yeu_cau_sua_xong',
      tieuDe: `Vận hành đã xử lý yêu cầu sửa đơn ${rows[0].ma_don}`, noiDung: yeuCau.noi_dung, link: `/don-hang/${donHangId}`,
    });
    return yeuCau;
  });
}
