import { query } from '../../config/db.js';

const so = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v === null ? null : Number(v)]));

// KPI + bieu do: Sale chi thay don cua minh ($1 = sale_id), Van hanh chi thay don minh phu trach ($2), vai tro khac thay toan cong ty (NULL).
async function kpi(saleId, vhId) {
  const { rows } = await query(
    `SELECT
       COALESCE(sum(t.tong_don) FILTER (WHERE date_trunc('month', dh.ngay_chot) = date_trunc('month', CURRENT_DATE)), 0) AS doanh_thu_thang,
       COALESCE(sum(t.tong_don) FILTER (WHERE date_trunc('month', dh.ngay_chot) = date_trunc('month', CURRENT_DATE - interval '1 month')
                                          AND dh.ngay_chot <= CURRENT_DATE - interval '1 month'), 0) AS doanh_thu_cung_ky_thang_truoc,
       count(*) FILTER (WHERE date_trunc('month', dh.ngay_chot) = date_trunc('month', CURRENT_DATE)) AS so_don_thang,
       count(*) FILTER (WHERE dh.giai_doan NOT IN ('hoan_tat', 'huy')) AS dang_xu_ly
     FROM don_hang dh JOIN v_don_hang_tien t ON t.don_hang_id = dh.id
    WHERE dh.trang_thai NOT IN ('nhap', 'huy') AND ($1::int IS NULL OR dh.sale_id = $1) AND ($2::int IS NULL OR dh.vanhanh_phu_trach_id = $2)`,
    [saleId, vhId],
  );
  return so(rows[0]);
}

async function doanhThu6Thang(saleId, vhId) {
  const { rows } = await query(
    `SELECT to_char(th, 'YYYY-MM') AS thang,
            COALESCE((SELECT sum(t.tong_don) FROM don_hang dh JOIN v_don_hang_tien t ON t.don_hang_id = dh.id
                       WHERE dh.trang_thai NOT IN ('nhap', 'huy') AND date_trunc('month', dh.ngay_chot) = th
                         AND ($1::int IS NULL OR dh.sale_id = $1) AND ($2::int IS NULL OR dh.vanhanh_phu_trach_id = $2)), 0) AS doanh_thu,
            (SELECT count(*) FROM don_hang dh WHERE dh.trang_thai NOT IN ('nhap', 'huy') AND date_trunc('month', dh.ngay_chot) = th
               AND ($1::int IS NULL OR dh.sale_id = $1) AND ($2::int IS NULL OR dh.vanhanh_phu_trach_id = $2))::int AS so_don
       FROM generate_series(date_trunc('month', CURRENT_DATE) - interval '5 month', date_trunc('month', CURRENT_DATE), interval '1 month') th
      ORDER BY th`,
    [saleId, vhId],
  );
  return rows.map((r) => ({ thang: r.thang, doanh_thu: Number(r.doanh_thu), so_don: r.so_don }));
}

async function theoGiaiDoan(saleId, vhId) {
  const { rows } = await query(
    `SELECT giai_doan, count(*)::int AS so FROM don_hang
      WHERE trang_thai NOT IN ('nhap') AND giai_doan NOT IN ('hoan_tat', 'huy') AND ($1::int IS NULL OR sale_id = $1) AND ($2::int IS NULL OR vanhanh_phu_trach_id = $2)
      GROUP BY giai_doan`,
    [saleId, vhId],
  );
  return Object.fromEntries(rows.map((r) => [r.giai_doan, r.so]));
}

async function congNoNcc() {
  const { rows } = await query(
    `SELECT COALESCE(sum(GREATEST(0, th - dc)), 0) AS con_phai_tra FROM (
       SELECT ncc_id,
              COALESCE(sum(gia_tri_hang) FILTER (WHERE loai_chi IN ('quyet_toan', 'chi_bo_sung') AND trang_thai IN ('da_duyet', 'da_thanh_toan')), 0) AS th,
              COALESCE(sum(so_tien) FILTER (WHERE trang_thai = 'da_thanh_toan'), 0) AS dc
         FROM de_xuat_chi WHERE ncc_id IS NOT NULL GROUP BY ncc_id) x`,
  );
  return Number(rows[0].con_phai_tra);
}

// Moi viec: so luong + duong dan toi man xu ly. Chi tra viec co so > 0.
const VIEC = {
  sale: [
    ['Đơn nháp chưa chốt', '/don-hang?trang_thai=nhap',
      `SELECT count(*) FROM don_hang WHERE trang_thai = 'nhap' AND sale_id = $1`],
    ['Khách đang tư vấn/báo giá, quá 7 ngày chưa liên hệ', '/khach-hang?trang_thai=dang_tu_van',
      `SELECT count(*) FROM khach_hang k WHERE k.sale_phu_trach_id = $1 AND k.trang_thai_cham_soc IN ('dang_tu_van', 'da_bao_gia')
         AND COALESCE((SELECT max(created_at) FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id), k.created_at) < now() - interval '7 days'`],
    ['Yêu cầu sửa đơn đang chờ Vận hành', '/don-hang',
      `SELECT count(*) FROM don_hang_yeu_cau_sua y JOIN don_hang d ON d.id = y.don_hang_id WHERE y.trang_thai = 'cho_xu_ly' AND d.sale_id = $1`],
  ],
  van_hanh: [
    ['Đơn mới chờ lên phương án', '/don-hang?giai_doan=len_phuong_an',
      `SELECT count(*) FROM don_hang WHERE giai_doan = 'len_phuong_an' AND vanhanh_phu_trach_id = $1`],
    ['Đơn đủ hàng, chờ đăng ký giao hàng', '/mua-hang?loc=san_sang',
      `SELECT count(*) FROM don_hang d WHERE d.giai_doan = 'mua_hang' AND d.vanhanh_phu_trach_id = $1 AND EXISTS (SELECT 1 FROM don_hang_vat_tu v JOIN mua_hang_dong m ON m.don_hang_vat_tu_id = v.id WHERE v.don_hang_id = d.id)
         AND NOT EXISTS (SELECT 1 FROM don_hang_vat_tu v JOIN mua_hang_dong m ON m.don_hang_vat_tu_id = v.id
                          WHERE v.don_hang_id = d.id AND m.trang_thai NOT IN ('san_hang', 'da_lay_hang', 'da_giao_hang', 'huy'))`],
    ['Đơn hoàn thiện chưa phân công thợ', '/thi-cong',
      `SELECT count(*) FROM don_hang d WHERE d.vanhanh_phu_trach_id = $1 AND d.hinh_thuc = 'hoan_thien' AND d.giai_doan IN ('mua_hang', 'giao_hang', 'thi_cong')
         AND NOT EXISTS (SELECT 1 FROM thi_cong t WHERE t.don_hang_id = d.id)`],
    ['Giai đoạn đến hạn mà chưa bắt đầu thi công', '/thi-cong',
      `SELECT count(*) FROM thi_cong t JOIN don_hang d ON d.id = t.don_hang_id WHERE t.trang_thai = 'lap_lich' AND t.ngay_du_kien <= CURRENT_DATE AND d.vanhanh_phu_trach_id = $1`],
    ['Đơn chờ nghiệm thu', '/don-hang?giai_doan=nghiem_thu', `SELECT count(*) FROM don_hang WHERE giai_doan = 'nghiem_thu' AND vanhanh_phu_trach_id = $1`],
    ['Đơn chờ chốt quyết toán', '/don-hang?giai_doan=quyet_toan', `SELECT count(*) FROM don_hang WHERE giai_doan = 'quyet_toan' AND vanhanh_phu_trach_id = $1`],
    ['Yêu cầu sửa đơn chưa xử lý', '/don-hang', `SELECT count(*) FROM don_hang_yeu_cau_sua y JOIN don_hang d ON d.id = y.don_hang_id WHERE y.trang_thai = 'cho_xu_ly' AND d.vanhanh_phu_trach_id = $1`],
  ],
  ke_toan: [
    ['Dòng vật tư chưa đặt hàng (đơn đang mua)', '/mua-hang?loc=dang_chuan_bi',
      `SELECT count(*) FROM mua_hang_dong m JOIN don_hang_vat_tu v ON v.id = m.don_hang_vat_tu_id JOIN don_hang d ON d.id = v.don_hang_id
        WHERE d.giai_doan = 'mua_hang' AND m.trang_thai IN ('cho_xu_ly', 'dang_hoi')`],
    ['Dòng đã sẵn hàng chưa lập quyết toán NCC', '/mua-hang',
      `SELECT count(*) FROM mua_hang_dong m JOIN don_hang_vat_tu v ON v.id = m.don_hang_vat_tu_id JOIN don_hang d ON d.id = v.don_hang_id
        WHERE d.giai_doan <> 'huy' AND m.trang_thai IN ('san_hang', 'da_lay_hang', 'da_giao_hang')
          AND NOT EXISTS (SELECT 1 FROM de_xuat_chi_dong x JOIN de_xuat_chi c ON c.id = x.de_xuat_chi_id WHERE x.mua_hang_dong_id = m.id AND c.trang_thai <> 'thu_hoi')`],
    ['Đề xuất chi bị từ chối cần sửa', '/cong-no?trang_thai=tu_choi', `SELECT count(*) FROM de_xuat_chi WHERE trang_thai = 'tu_choi'`],
    ['Đề xuất đã duyệt, chờ chuyển khoản', '/cong-no?trang_thai=da_duyet', `SELECT count(*) FROM de_xuat_chi WHERE trang_thai = 'da_duyet'`],
    ['Đội thợ còn công chưa lập đề xuất trả', '/cong-no/tho',
      `SELECT count(*) FROM (SELECT g.doi_tho_id, g.don_hang_id FROM giao_dich_tho g GROUP BY 1, 2
          HAVING sum(CASE g.loai WHEN 'phai_tra' THEN g.so_tien ELSE -g.so_tien END) > 0 AND bool_or(g.loai = 'phai_tra')) x
        WHERE NOT EXISTS (SELECT 1 FROM de_xuat_chi c WHERE c.doi_tho_id = x.doi_tho_id AND c.don_hang_id = x.don_hang_id AND c.trang_thai IN ('cho_duyet', 'da_duyet'))`],
  ],
  admin: [
    ['Đề xuất chi chờ bạn duyệt', '/cong-no?trang_thai=cho_duyet', `SELECT count(*) FROM de_xuat_chi WHERE trang_thai = 'cho_duyet'`],
    ['Đơn chờ chốt quyết toán', '/thi-cong/quyet-toan', `SELECT count(*) FROM don_hang WHERE giai_doan = 'quyet_toan'`],
    ['Đơn chưa có Vận hành phụ trách', '/don-hang?van_hanh_id=chua', `SELECT count(*) FROM don_hang WHERE trang_thai <> 'nhap' AND giai_doan NOT IN ('hoan_tat', 'huy') AND vanhanh_phu_trach_id IS NULL`],
  ],
};

async function viecCanLam(user) {
  const ds = VIEC[user.vai_tro] || [];
  const kq = await Promise.all(ds.map(async ([nhan, link, sql]) => {
    const { rows } = await query(sql, sql.includes('$1') ? [user.id] : []);
    return { nhan, link, so: Number(rows[0].count) };
  }));
  return kq;
}

export async function tongQuan(user) {
  const saleId = user.vai_tro === 'sale' ? user.id : null;
  const vhId = user.vai_tro === 'van_hanh' ? user.id : null;
  const xemTien = ['admin', 'ke_toan'].includes(user.vai_tro);
  const [k, bieuDo, gd, viec, cnNcc, choDuyet] = await Promise.all([
    kpi(saleId, vhId), doanhThu6Thang(saleId, vhId), theoGiaiDoan(saleId, vhId), viecCanLam(user),
    xemTien ? congNoNcc() : null,
    xemTien ? query(`SELECT count(*)::int so, COALESCE(sum(so_tien), 0) tien FROM de_xuat_chi WHERE trang_thai = 'cho_duyet'`).then((r) => so(r.rows[0])) : null,
  ]);
  return { pham_vi: saleId || vhId ? 'cua_toi' : 'cong_ty', kpi: { ...k, cong_no_ncc: cnNcc, cho_duyet: choDuyet }, doanh_thu_6_thang: bieuDo, theo_giai_doan: gd, viec };
}
