import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './nha_cung_cap.repository.js';

const TRANG_THAI = ['active', 'ngung_hoat_dong'];
const chu = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const homNay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD gio VN
const ngayHopLe = (v, ten) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '') || Number.isNaN(Date.parse(v))) throw new AppError(400, `${ten} không hợp lệ`);
  return v;
};
const truMotNgay = (ymd) => new Date(Date.parse(`${ymd}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
const dmy = (ymd) => ymd.split('-').reverse().join('/');

function chuanHoaNcc(data) {
  const ten = chu(data.ten);
  if (!ten) throw new AppError(400, 'Vui lòng nhập tên nhà cung cấp');
  if (ten.length > 200) throw new AppError(400, 'Tên nhà cung cấp quá dài');
  const mst = chu(data.ma_so_thue);
  // MST doanh nghiep VN: 10 so, chi nhanh them "-xxx".
  if (mst && !/^\d{10}(-\d{3})?$/.test(mst)) throw new AppError(400, 'Mã số thuế gồm 10 chữ số (chi nhánh: 10 số + "-" + 3 số)');
  return { ten, dia_chi: chu(data.dia_chi), ma_so_thue: mst };
}

async function layNcc(id) {
  const ncc = await repo.findById(id);
  if (!ncc) throw new AppError(404, 'Không tìm thấy nhà cung cấp');
  return ncc;
}

// So tai khoan la du lieu nhay cam: chi Ke toan/Admin (nguoi lam thanh toan) thay day du.
const anStk = (so) => `••••${so.slice(-4)}`;

export async function danhSach({ q, trang_thai, vat_tu_id }) {
  if (trang_thai && !TRANG_THAI.includes(trang_thai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  return repo.findAll({ tuKhoa: chu(q), trangThai: trang_thai || null, vatTuId: vat_tu_id ? Number(vat_tu_id) : null });
}

export async function chiTiet(user, id) {
  const ncc = await layNcc(id);
  const [stk, bangGia] = await Promise.all([repo.findStk(id), repo.findBangGia(id)]);
  const xemDu = ['ke_toan', 'admin'].includes(user.vai_tro);
  return { ...ncc, stk: xemDu ? stk : stk.map((s) => ({ ...s, so_tk: anStk(s.so_tk) })), bang_gia: bangGia };
}

export const tao = (data) => repo.create(chuanHoaNcc(data));

export async function sua(id, data) {
  await layNcc(id);
  return repo.update(id, chuanHoaNcc(data));
}

// Khong xoa NCC (da co de xuat mua, cong no tham chieu) -> chi doi trang thai "ngung hop tac" (xoa mem).
export async function doiTrangThai(id, trangThai) {
  if (!TRANG_THAI.includes(trangThai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  await layNcc(id);
  return repo.datTrangThai(id, trangThai);
}

export async function themStk(id, data) {
  await layNcc(id);
  const soTk = String(data.so_tk || '').replace(/\s/g, '');
  if (!/^\d{6,20}$/.test(soTk)) throw new AppError(400, 'Số tài khoản gồm 6–20 chữ số');
  const nganHang = chu(data.ten_ngan_hang);
  const chuTk = chu(data.chu_tk);
  if (!nganHang || !chuTk) throw new AppError(400, 'Vui lòng nhập ngân hàng và tên chủ tài khoản');
  return repo.themStk(id, { so_tk: soTk, ten_ngan_hang: nganHang, chu_tk: chuTk.toUpperCase() });
}

export async function xoaStk(id, stkId) {
  if (!(await repo.xoaStk(id, stkId))) throw new AppError(404, 'Không tìm thấy tài khoản');
}

// Cap nhat gia = DONG gia dang ap dung (het hieu luc truoc ngay moi 1 ngay) + THEM dong gia moi.
// Gia cu khong bi sua/xoa -> tra lai duoc "ngay X mua cua NCC nay gia bao nhieu".
export async function capNhatGia(id, { vat_tu_id, don_gia, ngay_hieu_luc }) {
  const ncc = await layNcc(id);
  if (ncc.trang_thai !== 'active') throw new AppError(409, 'Nhà cung cấp đã ngừng hợp tác');
  const vt = await repo.vatTuMuaNgoai(Number(vat_tu_id));
  if (!vt) throw new AppError(400, 'Vật tư không tồn tại');
  if (vt.trang_thai !== 'active') throw new AppError(400, `"${vt.ten}" đã ngừng kinh doanh`);
  if (vt.nguon_goc !== 'mua_ngoai') throw new AppError(400, `"${vt.ten}" do công ty tự sản xuất, không có giá nhà cung cấp`);
  const gia = Number(don_gia);
  if (!Number.isFinite(gia) || gia <= 0) throw new AppError(400, 'Đơn giá phải lớn hơn 0');
  const ngay = ngayHopLe(ngay_hieu_luc || homNay(), 'Ngày hiệu lực');

  return withTransaction(async (client) => {
    const dangMo = await repo.giaDangMo(client, id, vt.id);
    if (dangMo) {
      if (ngay <= dangMo.ngay_hieu_luc) {
        throw new AppError(400, `Ngày hiệu lực phải sau ${dmy(dangMo.ngay_hieu_luc)} (ngày bắt đầu của giá hiện tại)`);
      }
      if (Number(dangMo.don_gia) === gia) throw new AppError(400, 'Giá mới trùng giá đang áp dụng');
      await repo.dongGia(client, dangMo.id, truMotNgay(ngay));
    }
    return repo.themGia(client, { nccId: id, vatTuId: vt.id, donGia: gia, ngayHieuLuc: ngay });
  });
}

// NCC thoi cung cap mot mat hang: dong gia dang mo tai ngay chi dinh.
export async function ngungCungCap(id, vatTuId, { ngay }) {
  await layNcc(id);
  const ngayNgung = ngayHopLe(ngay || homNay(), 'Ngày ngừng cung cấp');
  return withTransaction(async (client) => {
    const dangMo = await repo.giaDangMo(client, id, vatTuId);
    if (!dangMo) throw new AppError(404, 'Mặt hàng này không có giá đang áp dụng');
    if (ngayNgung < dangMo.ngay_hieu_luc) throw new AppError(400, `Ngày ngừng không được trước ${dmy(dangMo.ngay_hieu_luc)}`);
    await repo.dongGia(client, dangMo.id, ngayNgung);
  });
}

// Bang so sanh: moi vat tu mua ngoai -> cac NCC co gia tai ngay, xep re -> dat; danh dau re nhat.
export async function soSanhGia({ ngay }) {
  const tai = ngayHopLe(ngay || homNay(), 'Ngày');
  const rows = await repo.giaTaiNgay(tai);
  const theoVatTu = new Map();
  for (const r of rows) {
    if (!theoVatTu.has(r.vat_tu_id)) {
      theoVatTu.set(r.vat_tu_id, { vat_tu_id: r.vat_tu_id, vat_tu: r.vat_tu, don_vi_tinh: r.don_vi_tinh, loai: r.loai, gia: [] });
    }
    if (r.ncc_id) theoVatTu.get(r.vat_tu_id).gia.push({ ncc_id: r.ncc_id, ncc: r.ncc, don_gia: Number(r.don_gia), ngay_hieu_luc: r.ngay_hieu_luc });
  }
  return {
    ngay: tai,
    vat_tu: [...theoVatTu.values()].map((v) => {
      const re = v.gia[0]?.don_gia;
      const dat = v.gia.at(-1)?.don_gia;
      return { ...v, re_nhat: re ?? null, chenh_lech_pct: re ? Math.round(((dat - re) / re) * 100) : null };
    }),
  };
}
