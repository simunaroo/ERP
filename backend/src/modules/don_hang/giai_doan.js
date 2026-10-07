// May trang thai tien do don hang. "Chot don" la buoc 0 (ngay_chot), cac buoc sau luu o don_hang.giai_doan.
// Don Vat tu bo qua cac buoc chi danh cho Hoan thien (boc khoi luong, thi cong, nghiem thu).
export const BUOC = {
  hoan_thien: ['len_phuong_an', 'boc_khoi_luong', 'mua_hang', 'giao_hang', 'thi_cong', 'nghiem_thu', 'quyet_toan'],
  vat_tu: ['len_phuong_an', 'mua_hang', 'giao_hang', 'quyet_toan'],
};

export const NHAN = {
  len_phuong_an: 'Lên phương án', boc_khoi_luong: 'Bóc khối lượng', mua_hang: 'Mua hàng', giao_hang: 'Giao hàng',
  thi_cong: 'Thi công', nghiem_thu: 'Nghiệm thu', quyet_toan: 'Quyết toán', hoan_tat: 'Hoàn tất', huy: 'Huỷ',
};

// Chi huy duoc truoc khi giao hang: hang da den cong trinh thi phai xu ly bang quyet toan/phat sinh.
export const HUY_DUOC = ['len_phuong_an', 'boc_khoi_luong', 'mua_hang'];

// Ai duoc chuyen don RA KHOI buoc nay: giong ERP, Van hanh (dieu phoi) xu ly moi buoc ke ca chot quyet toan.
// Admin luon duoc. Ke toan lam viec voi tien (de xuat chi, cong no), khong day tien do don.
export const vaiTroPhuTrach = () => 'van_hanh';

export function buocKe(hinhThuc, giaiDoan, huong) {
  const ds = BUOC[hinhThuc];
  const i = ds.indexOf(giaiDoan);
  if (i < 0) return null;
  if (huong === 'tiep') return i === ds.length - 1 ? 'hoan_tat' : ds[i + 1];
  return i === 0 ? null : ds[i - 1];
}
