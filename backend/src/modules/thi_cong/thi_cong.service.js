import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './thi_cong.repository.js';
import { damBaoPhuTrach, tuDongChuyenBuoc, vanHanhCua } from '../don_hang/don_hang.service.js';
import { findById as timDon } from '../don_hang/don_hang.repository.js';

const homNay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const congNgay = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const chu = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const laNgay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v));
const soKhongAm = (v, ten) => {
  const n = Number(v);
  if (v === '' || v === null || v === undefined || !Number.isFinite(n) || n < 0) throw new AppError(400, `${ten} không hợp lệ`);
  return n;
};
const LOAI_PS = ['phat_sinh', 'phu_thu', 'giam_tru', 'thu_ho'];
const HAO_HUT_TOI_DA = 10; // % - giong ERP: canh bao khi hao hut vuot 10%

// ---------- Doi tho ----------
function chuanHoaDoiTho(d) {
  const ten = chu(d.ten);
  if (!ten) throw new AppError(400, 'Vui lòng nhập tên đội thợ');
  const sdt = chu(d.sdt)?.replace(/[\s.]/g, '') || null;
  if (sdt && !/^0\d{9}$/.test(sdt)) throw new AppError(400, 'Số điện thoại gồm 10 số, bắt đầu bằng 0');
  const soTk = chu(d.so_tk)?.replace(/\s/g, '') || null;
  if (soTk && !/^\d{6,20}$/.test(soTk)) throw new AppError(400, 'Số tài khoản gồm 6–20 chữ số');
  return { ten, sdt, nang_luc: chu(d.nang_luc), so_tk: soTk, ten_ngan_hang: chu(d.ten_ngan_hang), chu_tk: chu(d.chu_tk)?.toUpperCase() || null };
}
export const dsDoiTho = (q) => repo.dsDoiTho({ chiHoatDong: q.hoat_dong === '1' });
export const taoDoiTho = (d) => repo.luuDoiTho(null, chuanHoaDoiTho(d));
export async function suaDoiTho(id, d) {
  const cu = await repo.findDoiTho(id);
  if (!cu) throw new AppError(404, 'Không tìm thấy đội thợ');
  const trangThai = d.trang_thai || cu.trang_thai;
  if (!['active', 'ngung_hoat_dong'].includes(trangThai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  return repo.luuDoiTho(id, { ...chuanHoaDoiTho({ ...cu, ...d }), trang_thai: trangThai });
}

// ---------- Lich + giai doan ----------
export async function lich(user, q) {
  const tu = laNgay(q.tu) ? q.tu : homNay();
  const den = laNgay(q.den) ? q.den : congNgay(tu, 13);
  if (tu > den) throw new AppError(400, 'Khoảng ngày không hợp lệ');
  const vh = vanHanhCua(user);
  const [viec, canLap] = await Promise.all([repo.lich({ tu, den, vanHanhId: vh }), repo.canLapLich(vh)]);
  return { tu, den, viec, can_lap_lich: canLap };
}

export async function theoDon(user, donHangId) {
  if (user.vai_tro === 'sale') {
    const don = await timDon(donHangId);
    if (!don || don.sale_id !== user.id) throw new AppError(404, 'Không tìm thấy đơn hàng');
  }
  await damBaoPhuTrach(user, donHangId);
  const [giaiDoan, phatSinh] = await Promise.all([repo.theoDon(donHangId), repo.phatSinhCua(donHangId)]);
  return { giai_doan: giaiDoan, phat_sinh: phatSinh };
}

function chuanHoaGiaiDoan(b) {
  const ten = chu(b.ten_giai_doan);
  if (!ten) throw new AppError(400, 'Nhập tên giai đoạn (VD: Lát sàn, Ốp tường)');
  if (!laNgay(b.ngay_du_kien) || b.ngay_du_kien < homNay()) throw new AppError(400, 'Ngày dự kiến phải từ hôm nay trở đi');
  const kl = soKhongAm(b.kl_du_kien, 'Khối lượng dự kiến');
  if (!(kl > 0)) throw new AppError(400, 'Khối lượng dự kiến phải lớn hơn 0');
  return {
    ten, donVi: chu(b.don_vi_cong) || 'm²', giaCong: soKhongAm(b.gia_cong, 'Giá công'), klDuKien: kl,
    doiThoId: Number(b.doi_tho_id), ngayDuKien: b.ngay_du_kien, ghiChu: chu(b.ghi_chu),
  };
}

async function kiemTraDoiTho(client, doiThoId, ngay, boQuaId, xacNhanTrung) {
  const dt = await repo.findDoiTho(doiThoId);
  if (!dt) throw new AppError(400, 'Đội thợ không tồn tại');
  if (dt.trang_thai !== 'active') throw new AppError(400, 'Đội thợ đã ngừng hoạt động');
  const trung = await repo.trungLich(client, doiThoId, ngay, boQuaId);
  if (trung.length && !xacNhanTrung) throw new AppError(409, `"${dt.ten}" đã có lịch ngày này (${trung.map((t) => t.ma_don).join(', ')}). Vẫn xếp thêm?`);
}

// Phan tho cho 1 giai doan (giong ERP: dang ky tim tho tu khi dang mua hang de kip lich).
export async function lapGiaiDoan(user, b) {
  const g = chuanHoaGiaiDoan(b);
  return withTransaction(async (client) => {
    const don = await repo.khoaDon(client, Number(b.don_hang_id));
    if (!don) throw new AppError(404, 'Không tìm thấy đơn hàng');
    await damBaoPhuTrach(user, don.id, client);
    if (don.hinh_thuc !== 'hoan_thien') throw new AppError(400, 'Đơn Vật tư không có thi công');
    if (!['mua_hang', 'giao_hang', 'thi_cong'].includes(don.giai_doan)) throw new AppError(409, 'Chỉ phân thợ khi đơn từ bước Mua hàng tới Thi công');
    await kiemTraDoiTho(client, g.doiThoId, g.ngayDuKien, null, b.xac_nhan_trung_lich === true);
    const id = await repo.tao(client, { ...g, donHangId: don.id, nguoiId: user.id });
    return repo.findById(id, client);
  });
}

export async function suaGiaiDoan(user, id, b) {
  const g = chuanHoaGiaiDoan(b);
  await withTransaction(async (client) => {
    const tc = await repo.findById(id, client);
    if (!tc) throw new AppError(404, 'Không tìm thấy giai đoạn thi công');
    await damBaoPhuTrach(user, tc.don_hang_id, client);
    await kiemTraDoiTho(client, g.doiThoId, g.ngayDuKien, id, b.xac_nhan_trung_lich === true);
    if (!(await repo.sua(client, id, g))) throw new AppError(409, 'Chỉ sửa được giai đoạn chưa bắt đầu');
  });
  return repo.findById(id);
}

// Bat dau: don phai co hang (buoc Giao hang tro di); giai doan dau tien bat dau -> don sang Thi cong.
export async function batDau(user, id) {
  return withTransaction(async (client) => {
    const tc = await repo.findById(id, client);
    if (!tc) throw new AppError(404, 'Không tìm thấy giai đoạn thi công');
    const don = await repo.khoaDon(client, tc.don_hang_id);
    await damBaoPhuTrach(user, don.id, client);
    if (!['giao_hang', 'thi_cong'].includes(don.giai_doan)) throw new AppError(409, 'Đơn chưa giao hàng nên chưa thể bắt đầu thi công');
    if (!(await repo.batDau(client, id))) throw new AppError(409, 'Chỉ bắt đầu được giai đoạn chưa thi công');
    const chuyen = await tuDongChuyenBuoc(client, { donHangId: don.id, tu: 'giao_hang', den: 'thi_cong', nguoiId: user.id, ghiChu: 'Tự động: thợ bắt đầu thi công' });
    return { ...(await repo.findById(id, client)), don_tu_chuyen_buoc: chuyen };
  });
}

// Bao xong 1 giai doan; giai doan cuoi cung xong -> don sang Nghiem thu.
export async function baoXong(user, id) {
  return withTransaction(async (client) => {
    const tc = await repo.findById(id, client);
    if (!tc) throw new AppError(404, 'Không tìm thấy giai đoạn thi công');
    await damBaoPhuTrach(user, tc.don_hang_id, client);
    const kq = await repo.baoXong(client, id);
    if (!kq) throw new AppError(409, 'Chỉ báo xong được giai đoạn đang thi công');
    await repo.khoaDon(client, kq.don_hang_id);
    const chuyen = (await repo.demChuaXong(client, kq.don_hang_id)) === 0
      && (await tuDongChuyenBuoc(client, { donHangId: kq.don_hang_id, tu: 'thi_cong', den: 'nghiem_thu', nguoiId: user.id, ghiChu: 'Tự động: mọi giai đoạn đã thi công xong' }));
    return { ...(await repo.findById(id, client)), don_tu_chuyen_buoc: chuyen };
  });
}

// ---------- Nghiem thu: SL thuc te tung dong vat tu + KL thuc te tung giai doan ----------
function haoHut(d) {
  // Hao hut = (SL da mua - SL thuc te dung) / SL thuc te; chi y nghia voi hang mua ngoai.
  const tt = d.so_luong_thuc_te === null ? null : Number(d.so_luong_thuc_te);
  if (tt === null || !(tt > 0) || d.nguon_goc !== 'mua_ngoai') return null;
  return Math.round(((Number(d.so_luong_can) - tt) / tt) * 1000) / 10;
}

export async function xemNghiemThu(user, donHangId) {
  await damBaoPhuTrach(user, donHangId);
  return withTransaction(async (client) => {
    const don = await repo.tienDon(client, donHangId);
    if (!don) throw new AppError(404, 'Không tìm thấy đơn hàng');
    const [dong, giaiDoan] = await Promise.all([repo.dongVatTu(client, donHangId), repo.theoDon(donHangId, client)]);
    const ds = dong.map((d) => {
      const hh = haoHut(d);
      return { ...d, hao_hut_pct: hh, canh_bao_hao_hut: hh !== null && hh > HAO_HUT_TOI_DA };
    });
    return { don, dong: ds, giai_doan: giaiDoan, phat_sinh: await repo.phatSinhCua(donHangId) };
  });
}

export async function luuNghiemThu(user, donHangId, { dong = [], giai_doan = [] }) {
  await withTransaction(async (client) => {
    const don = await repo.khoaDon(client, donHangId);
    if (!don) throw new AppError(404, 'Không tìm thấy đơn hàng');
    await damBaoPhuTrach(user, donHangId, client);
    if (!['thi_cong', 'nghiem_thu'].includes(don.giai_doan) || don.nghiem_thu_luc) throw new AppError(409, 'Chỉ nhập nghiệm thu khi đơn đang thi công/nghiệm thu và chưa xác nhận');
    const sl = dong.map((x) => [Number(x.id), x.so_luong_thuc_te === '' || x.so_luong_thuc_te === null ? null : soKhongAm(x.so_luong_thuc_te, 'Số lượng thực tế')]);
    const kl = giai_doan.map((x) => [Number(x.id), x.kl_thuc_te === '' || x.kl_thuc_te === null ? null : soKhongAm(x.kl_thuc_te, 'Khối lượng thực tế')]);
    if (!(await repo.luuSoLuongThucTe(client, donHangId, sl)) || !(await repo.luuKhoiLuongThucTe(client, donHangId, kl))) {
      throw new AppError(400, 'Có dòng không thuộc đơn này');
    }
  });
  return xemNghiemThu(user, donHangId);
}

// Xac nhan nghiem thu: du SL thuc te moi dong + KL thuc te > 0 moi giai doan (da bao xong) -> don sang Quyet toan.
export async function xacNhanNghiemThu(user, donHangId) {
  return withTransaction(async (client) => {
    const don = await repo.khoaDon(client, donHangId);
    if (!don) throw new AppError(404, 'Không tìm thấy đơn hàng');
    await damBaoPhuTrach(user, donHangId, client);
    if (don.giai_doan !== 'nghiem_thu') throw new AppError(409, 'Đơn không ở bước Nghiệm thu');
    const [dong, gd] = await Promise.all([repo.dongVatTu(client, donHangId), repo.theoDon(donHangId, client)]);
    const thieuSl = dong.filter((d) => d.so_luong_thuc_te === null);
    if (thieuSl.length) throw new AppError(400, `Còn ${thieuSl.length} dòng vật tư chưa nhập số lượng thực tế (0 là hợp lệ)`);
    const thieuKl = gd.filter((g) => !(Number(g.kl_thuc_te) > 0) || !g.ngay_hoan_thanh);
    if (thieuKl.length) throw new AppError(400, `Giai đoạn ${thieuKl.map((g) => g.ten_giai_doan).join(', ')} chưa báo xong hoặc chưa có khối lượng thực tế`);
    await repo.chotNghiemThu(client, donHangId, user.id);
    await tuDongChuyenBuoc(client, { donHangId, tu: 'nghiem_thu', den: 'quyet_toan', nguoiId: user.id, ghiChu: 'Tự động: đã xác nhận nghiệm thu' });
    const canhBao = dong.map((d) => ({ ...d, hh: haoHut(d) })).filter((d) => d.hh !== null && d.hh > HAO_HUT_TOI_DA)
      .map((d) => `${d.vat_tu}: hao hụt ${d.hh}% (> ${HAO_HUT_TOI_DA}%)`);
    return { ok: true, canh_bao_hao_hut: canhBao };
  });
}

// ---------- Phat sinh thi cong ----------
export async function themPhatSinh(user, b) {
  if (!LOAI_PS.includes(b.loai)) throw new AppError(400, 'Loại phát sinh không hợp lệ');
  const soTien = Number(b.so_tien);
  if (!Number.isFinite(soTien) || soTien <= 0) throw new AppError(400, 'Số tiền phải lớn hơn 0');
  const lyDo = chu(b.ly_do);
  if (!lyDo) throw new AppError(400, 'Vui lòng ghi lý do');
  return withTransaction(async (client) => {
    const don = await repo.khoaDon(client, Number(b.don_hang_id));
    if (!don) throw new AppError(404, 'Không tìm thấy đơn hàng');
    await damBaoPhuTrach(user, don.id, client);
    if (!['thi_cong', 'nghiem_thu', 'quyet_toan'].includes(don.giai_doan) || don.quyet_toan_luc) {
      throw new AppError(409, 'Chỉ ghi phát sinh khi đang thi công/nghiệm thu, trước khi chốt quyết toán');
    }
    let tc = null;
    if (b.thi_cong_id) {
      tc = await repo.findById(Number(b.thi_cong_id), client);
      if (!tc || tc.don_hang_id !== don.id) throw new AppError(400, 'Giai đoạn không thuộc đơn này');
    }
    if (b.loai === 'thu_ho' && !tc) throw new AppError(400, 'Thợ thu hộ: chọn giai đoạn (đội thợ) đã thu tiền');
    const ps = await repo.themPhatSinh(client, { donHangId: don.id, thiCongId: tc?.id ?? null, loai: b.loai, soTien, lyDo, nguoiId: user.id });
    // Tho thu tien khach -> tru vao cong tho (so tho), dong thoi tinh la khach da tra (VIEW tru vao con phai thu).
    if (b.loai === 'thu_ho') await repo.ghiThuHo(client, { thoId: tc.doi_tho_id, donHangId: don.id, thiCongId: tc.id, soTien, psId: ps.id, lyDo });
    return ps;
  });
}

export async function xoaPhatSinh(user, id) {
  await withTransaction(async (client) => {
    const ps = await repo.findPhatSinh(client, id);
    if (!ps) throw new AppError(404, 'Không tìm thấy phát sinh');
    await damBaoPhuTrach(user, ps.don_hang_id, client);
    const don = await repo.khoaDon(client, ps.don_hang_id);
    if (don.quyet_toan_luc) throw new AppError(409, 'Đơn đã chốt quyết toán');
    await repo.xoaPhatSinh(client, id);
  });
}

// ---------- Quyet toan (Van hanh / dieu phoi chot, giong ERP) ----------
export const dsChoQuyetToan = (user) => repo.dsChoQuyetToan(vanHanhCua(user));

export async function xemQuyetToan(user, donHangId) {
  await damBaoPhuTrach(user, donHangId);
  return withTransaction(async (client) => {
    const don = await repo.tienDon(client, donHangId);
    if (!don) throw new AppError(404, 'Không tìm thấy đơn hàng');
    const [dong, gd] = await Promise.all([repo.dongVatTu(client, donHangId), repo.theoDon(donHangId, client)]);
    return { don, dong, giai_doan: gd, phat_sinh: await repo.phatSinhCua(donHangId) };
  });
}

// Chot: tong phai thu khach = SL thuc te x gia (- chiet khau) + phi VC + phu thu + phat sinh rong; ghi cong tho phai tra; don hoan tat.
// Co y KHONG xet tien da thu (giong ERP: viec thu tien thuoc cong no khach).
export async function chotQuyetToan(user, donHangId) {
  return withTransaction(async (client) => {
    const don = await repo.khoaDon(client, donHangId);
    if (!don) throw new AppError(404, 'Không tìm thấy đơn hàng');
    await damBaoPhuTrach(user, donHangId, client);
    if (don.giai_doan !== 'quyet_toan') throw new AppError(409, 'Đơn không ở bước Quyết toán');
    if (don.hinh_thuc === 'hoan_thien' && !don.nghiem_thu_luc) throw new AppError(400, 'Đơn chưa xác nhận nghiệm thu');
    if (don.hinh_thuc === 'vat_tu') await repo.dienSoLuongThucTeMacDinh(client, donHangId); // giao du hang = nghiem thu
    const tien = await repo.tienDon(client, donHangId);
    await repo.chotQuyetToan(client, donHangId, user.id, Number(tien.tong_don));
    await repo.ghiPhaiTraTho(client, donHangId);
    await tuDongChuyenBuoc(client, { donHangId, tu: 'quyet_toan', den: 'hoan_tat', nguoiId: user.id, ghiChu: `Chốt quyết toán: ${Math.round(tien.tong_don).toLocaleString('vi-VN')} đ` });
    return repo.tienDon(client, donHangId);
  });
}
