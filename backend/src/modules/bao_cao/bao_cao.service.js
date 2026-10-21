import { query } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as cauHinh from '../cau_hinh/cau_hinh.service.js';

const NGAY = /^\d{4}-\d{2}-\d{2}$/;
const so = (v) => Math.round(Number(v) || 0);

// Mac dinh: tu dau thang nay den hom nay (gio VN).
function khoangNgay({ tu, den }) {
  const homNay = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const t = tu || `${homNay.slice(0, 8)}01`;
  const d = den || homNay;
  if (!NGAY.test(t) || !NGAY.test(d) || t > d) throw new AppError(400, 'Khoảng ngày không hợp lệ');
  return [t, d];
}

const CHI_PHI = ['chi_ncc', 'chi_ncc_uoc_tinh', 'gia_von_tu_sx', 'mua_bo_sung', 'cong_tho'];
const KHOAN = ['doanh_thu', ...CHI_PHI];

function cong(ds) {
  const c = { so_don: ds.length, lai_gop: 0, so_don_lo: 0, ...Object.fromEntries(KHOAN.map((k) => [k, 0])) };
  for (const x of ds) {
    for (const k of [...KHOAN, 'lai_gop']) c[k] += x[k];
    if (x.lai_gop < 0) c.so_don_lo += 1;
  }
  c.bien_pct = c.doanh_thu ? Math.round((c.lai_gop / c.doanh_thu) * 1000) / 10 : null;
  return c;
}

// Lai/lo gop theo don (don da chot, chua huy, ngay chot trong khoang):
//   Doanh thu  = tong don (view v_don_hang_tien: SL thuc te neu da nghiem thu, + phat sinh, - chiet khau)
//   Chi NCC    = SL dat x gia chot x (1 + VAT) cac dong mua hang da chon NCC
//   Chi NCC uoc tinh = dong chua chon NCC: SL x gia NCC re nhat dang hieu luc (don tam tinh)
//   Gia von hang tu SX (cua) = gia ban x ty le cau hinh 'ty_le_gia_von_tu_sx' (xuong chua co so lieu gia thanh)
//   Mua bo sung= phan cong ty chiu (tru phan quy trach nhiem cho NCC / khach)
//   Cong tho   = gia cong x KL (thuc te neu da nghiem thu, khong thi du kien)
// Don chua quyet toan la so TAM TINH.
async function tinhLaiLo({ tu, den, sale_id, hinh_thuc }) {
  const [t, d] = khoangNgay({ tu, den });
  if (hinh_thuc && !['hoan_thien', 'vat_tu'].includes(hinh_thuc)) throw new AppError(400, 'Hình thức không hợp lệ');
  const tyLeTuSx = (await cauHinh.lay('ty_le_gia_von_tu_sx', 60)) / 100;
  const { rows } = await query(
    `SELECT dh.id, dh.ma_don, dh.ngay_chot, dh.giai_doan, dh.hinh_thuc, s.ho_ten AS sale, k.ten AS khach,
            t.tong_don AS doanh_thu,
            COALESCE((SELECT sum(v.so_luong_can * m.gia_chot * (1 + m.vat_pct / 100))
                        FROM don_hang_vat_tu v JOIN mua_hang_dong m ON m.don_hang_vat_tu_id = v.id
                       WHERE v.don_hang_id = dh.id AND m.gia_chot IS NOT NULL AND m.trang_thai <> 'huy'), 0) AS chi_ncc,
            COALESCE((SELECT sum(tn.so_tien) FROM mua_bo_sung b JOIN mua_bo_sung_trach_nhiem tn ON tn.mua_bo_sung_id = b.id
                       WHERE b.don_hang_id = dh.id AND b.trang_thai = 'da_mua' AND tn.nguon NOT IN ('ncc', 'khach_hang')), 0) AS mua_bo_sung,
            COALESCE((SELECT sum(tc.gia_cong * COALESCE(tc.kl_thuc_te, tc.kl_du_kien, 0)) FROM thi_cong tc WHERE tc.don_hang_id = dh.id), 0) AS cong_tho,
            COALESCE((SELECT sum(v.so_luong_can * (SELECT min(b.don_gia) FROM ncc_bang_gia b WHERE b.vat_tu_id = v.vat_tu_id
                                   AND b.ngay_hieu_luc <= CURRENT_DATE AND (b.ngay_het_hieu_luc IS NULL OR b.ngay_het_hieu_luc >= CURRENT_DATE)))
                        FROM don_hang_vat_tu v JOIN mua_hang_dong m ON m.don_hang_vat_tu_id = v.id
                       WHERE v.don_hang_id = dh.id AND m.gia_chot IS NULL AND m.trang_thai <> 'huy'), 0) AS chi_ncc_uoc_tinh,
            COALESCE((SELECT sum(COALESCE(v.so_luong_thuc_te, v.so_luong_can) * v.don_gia) * $5
                        FROM don_hang_vat_tu v JOIN vat_tu vt ON vt.id = v.vat_tu_id JOIN loai_vat_tu l ON l.id = vt.loai_vat_tu_id
                       WHERE v.don_hang_id = dh.id AND l.nguon_goc = 'tu_san_xuat'), 0) AS gia_von_tu_sx
       FROM don_hang dh JOIN v_don_hang_tien t ON t.don_hang_id = dh.id
       JOIN users s ON s.id = dh.sale_id JOIN khach_hang k ON k.id = dh.khach_hang_id
      WHERE dh.trang_thai NOT IN ('nhap', 'huy') AND dh.giai_doan <> 'huy' AND dh.ngay_chot BETWEEN $1 AND $2
        AND ($3::int IS NULL OR dh.sale_id = $3) AND ($4::text IS NULL OR dh.hinh_thuc::text = $4)
      ORDER BY dh.ngay_chot DESC, dh.id DESC`,
    [t, d, sale_id ? Number(sale_id) : null, hinh_thuc || null, tyLeTuSx],
  );
  const items = rows.map((r) => {
    const x = { ...r };
    for (const k of KHOAN) x[k] = so(r[k]);
    x.lai_gop = x.doanh_thu - CHI_PHI.reduce((a, k) => a + x[k], 0);
    x.bien_pct = x.doanh_thu ? Math.round((x.lai_gop / x.doanh_thu) * 1000) / 10 : null;
    x.tam_tinh = !['quyet_toan', 'hoan_tat'].includes(r.giai_doan);
    return x;
  });
  const nhom = (khoa) => Object.values(items.reduce((m, x) => { (m[khoa(x)] ||= []).push(x); return m; }, {}));
  return {
    tu: t, den: d, items,
    tong: cong(items),
    theo_sale: nhom((x) => x.sale).map((ds) => ({ sale: ds[0].sale, ...cong(ds) })).sort((a, b) => b.lai_gop - a.lai_gop),
    theo_hinh_thuc: nhom((x) => x.hinh_thuc).map((ds) => ({ hinh_thuc: ds[0].hinh_thuc, ...cong(ds) })),
  };
}

export async function laiLo(q) {
  const kq = await tinhLaiLo(q);
  let ds = kq.items;
  if (q.chi_lo === '1') ds = ds.filter((x) => x.lai_gop < 0);
  if (q.sap_xep === 'lai_tang') ds = [...ds].sort((a, b) => a.lai_gop - b.lai_gop);
  if (q.sap_xep === 'bien_tang') ds = [...ds].sort((a, b) => (a.bien_pct ?? 0) - (b.bien_pct ?? 0));
  const trang = Math.max(1, parseInt(q.page, 10) || 1);
  const soDong = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  return {
    ...kq, items: ds.slice((trang - 1) * soDong, trang * soDong),
    tong_loc: ds.length, page: trang, soTrang: Math.max(1, Math.ceil(ds.length / soDong)),
  };
}

export async function laiLoExcel(q) {
  const kq = await tinhLaiLo(q);
  const ds = q.chi_lo === '1' ? kq.items.filter((x) => x.lai_gop < 0) : kq.items;
  return {
    tenFile: `lai-lo-theo-don_${kq.tu}_${kq.den}.xlsx`,
    tieuDe: 'BÁO CÁO LÃI/LỖ GỘP THEO ĐƠN HÀNG',
    moTa: `Đơn chốt từ ${kq.tu} đến ${kq.den}. Đơn chưa quyết toán là số tạm tính; giá vốn hàng tự sản xuất ước tính theo % cấu hình.`,
    cot: [
      { key: 'ma_don', nhan: 'Mã đơn', rong: 14 }, { key: 'ngay_chot', nhan: 'Ngày chốt', kieu: 'ngay', rong: 12 },
      { key: 'khach', nhan: 'Khách hàng', rong: 24 }, { key: 'sale', nhan: 'Sale', rong: 18 },
      { key: 'hinh_thuc_ten', nhan: 'Hình thức', rong: 12 }, { key: 'trang_thai_so', nhan: 'Số liệu', rong: 11 },
      { key: 'doanh_thu', nhan: 'Doanh thu', kieu: 'tien' }, { key: 'chi_ncc', nhan: 'Chi NCC', kieu: 'tien' },
      { key: 'chi_ncc_uoc_tinh', nhan: 'Chi NCC ước tính (chưa chọn NCC)', kieu: 'tien' }, { key: 'gia_von_tu_sx', nhan: 'Giá vốn hàng tự SX (ước tính)', kieu: 'tien' },
      { key: 'mua_bo_sung', nhan: 'Mua bổ sung (Cty chịu)', kieu: 'tien' }, { key: 'cong_tho', nhan: 'Công thợ', kieu: 'tien' },
      { key: 'lai_gop', nhan: 'Lãi gộp', kieu: 'tien' }, { key: 'bien_pct', nhan: 'Biên (%)', kieu: 'pct', rong: 10 },
    ],
    dong: ds.map((x) => ({
      ...x, hinh_thuc_ten: x.hinh_thuc === 'hoan_thien' ? 'Hoàn thiện' : 'Vật tư', trang_thai_so: x.tam_tinh ? 'Tạm tính' : 'Đã quyết toán',
    })),
    tong: { ma_don: `Tổng ${ds.length} đơn`, ...cong(ds) },
  };
}
