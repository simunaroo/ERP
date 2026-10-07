import { query } from '../../config/db.js';

// ---------- Doi tho ----------
export async function dsDoiTho({ chiHoatDong } = {}) {
  const { rows } = await query(
    `SELECT dt.id, dt.ten, dt.sdt, dt.nang_luc, dt.so_tk, dt.ten_ngan_hang, dt.chu_tk, dt.trang_thai,
            count(tc.id) FILTER (WHERE tc.trang_thai <> 'da_nghiem_thu')::int AS viec_dang_mo,
            count(tc.id) FILTER (WHERE tc.trang_thai = 'da_nghiem_thu')::int AS viec_da_xong
       FROM doi_tho dt LEFT JOIN thi_cong tc ON tc.doi_tho_id = dt.id
      WHERE ($1::bool IS NOT TRUE OR dt.trang_thai = 'active')
      GROUP BY dt.id ORDER BY dt.trang_thai, dt.ten`,
    [chiHoatDong ?? null],
  );
  return rows;
}

export async function findDoiTho(id) {
  const { rows } = await query('SELECT * FROM doi_tho WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function luuDoiTho(id, d) {
  const cot = [d.ten, d.sdt, d.nang_luc, d.so_tk, d.ten_ngan_hang, d.chu_tk];
  const { rows } = id
    ? await query(`UPDATE doi_tho SET ten = $2, sdt = $3, nang_luc = $4, so_tk = $5, ten_ngan_hang = $6, chu_tk = $7, trang_thai = $8
                    WHERE id = $1 RETURNING *`, [id, ...cot, d.trang_thai])
    : await query('INSERT INTO doi_tho (ten, sdt, nang_luc, so_tk, ten_ngan_hang, chu_tk) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', cot);
  return rows[0] || null;
}

// ---------- Giai doan thi cong ----------
const COT = `tc.id, tc.don_hang_id, dh.ma_don, dh.giai_doan, dh.dia_chi_cong_trinh, dh.phuong_xa, dh.tinh_thanh, dh.phuong_an_thi_cong,
       kh.ten AS khach_hang, kh.sdt AS khach_hang_sdt, tc.doi_tho_id, dt.ten AS doi_tho, dt.sdt AS doi_tho_sdt, u.ho_ten AS nguoi_phu_trach,
       tc.ten_giai_doan, tc.don_vi_cong, tc.gia_cong, tc.kl_du_kien, tc.kl_thuc_te,
       tc.ngay_du_kien, tc.ngay_thuc_hien, tc.ngay_hoan_thanh, tc.trang_thai, tc.ghi_chu`;
const TU = `FROM thi_cong tc
       JOIN don_hang dh ON dh.id = tc.don_hang_id
       JOIN khach_hang kh ON kh.id = dh.khach_hang_id
       JOIN doi_tho dt ON dt.id = tc.doi_tho_id
       JOIN users u ON u.id = tc.nguoi_phu_trach_id`;

export async function lich({ tu, den, vanHanhId = null }) {
  const { rows } = await query(
    `SELECT ${COT} ${TU}
      WHERE tc.trang_thai <> 'da_nghiem_thu' AND (tc.ngay_du_kien BETWEEN $1 AND $2 OR tc.trang_thai = 'dang_thi_cong')
        AND ($3::int IS NULL OR dh.vanhanh_phu_trach_id = $3)
      ORDER BY tc.ngay_du_kien, tc.id`,
    [tu, den, vanHanhId],
  );
  return rows;
}

// Don Hoan thien tu Mua hang toi Thi cong chua co giai doan nao -> can tim tho, xep lich.
export async function canLapLich(vanHanhId = null) {
  const { rows } = await query(
    `SELECT dh.id AS don_hang_id, dh.ma_don, dh.giai_doan, dh.ngay_yc_lap_dat, dh.tinh_thanh, dh.dia_chi_cong_trinh, kh.ten AS khach_hang
       FROM don_hang dh JOIN khach_hang kh ON kh.id = dh.khach_hang_id
      WHERE dh.hinh_thuc = 'hoan_thien' AND dh.giai_doan IN ('mua_hang', 'giao_hang', 'thi_cong')
        AND NOT EXISTS (SELECT 1 FROM thi_cong tc WHERE tc.don_hang_id = dh.id)
        AND ($1::int IS NULL OR dh.vanhanh_phu_trach_id = $1)
      ORDER BY dh.ngay_yc_lap_dat NULLS LAST, dh.id`,
    [vanHanhId],
  );
  return rows;
}

export async function findById(id, client = { query }) {
  const { rows } = await client.query(`SELECT ${COT} ${TU} WHERE tc.id = $1`, [id]);
  return rows[0] || null;
}

export async function theoDon(donHangId, client = { query }) {
  const { rows } = await client.query(`SELECT ${COT} ${TU} WHERE tc.don_hang_id = $1 ORDER BY tc.id`, [donHangId]);
  return rows;
}

export async function trungLich(client, doiThoId, ngay, boQuaId) {
  const { rows } = await client.query(
    `SELECT tc.id, dh.ma_don FROM thi_cong tc JOIN don_hang dh ON dh.id = tc.don_hang_id
      WHERE tc.doi_tho_id = $1 AND tc.ngay_du_kien = $2 AND tc.trang_thai <> 'da_nghiem_thu' AND tc.id <> $3`,
    [doiThoId, ngay, boQuaId ?? 0],
  );
  return rows;
}

export async function khoaDon(client, donHangId) {
  const { rows } = await client.query(
    `SELECT id, ma_don, hinh_thuc, giai_doan, dieu_khoan_nghiem_thu, nghiem_thu_luc, quyet_toan_luc FROM don_hang WHERE id = $1 FOR UPDATE`,
    [donHangId],
  );
  return rows[0] || null;
}

export async function tao(client, d) {
  const { rows } = await client.query(
    `INSERT INTO thi_cong (don_hang_id, doi_tho_id, nguoi_phu_trach_id, ten_giai_doan, don_vi_cong, gia_cong, kl_du_kien, ngay_du_kien, ghi_chu)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [d.donHangId, d.doiThoId, d.nguoiId, d.ten, d.donVi, d.giaCong, d.klDuKien, d.ngayDuKien, d.ghiChu],
  );
  return rows[0].id;
}

export async function sua(client, id, d) {
  const { rows } = await client.query(
    `UPDATE thi_cong SET doi_tho_id = $2, ngay_du_kien = $3, gia_cong = $4, kl_du_kien = $5, ten_giai_doan = $6, don_vi_cong = $7
      WHERE id = $1 AND trang_thai = 'lap_lich' RETURNING id`,
    [id, d.doiThoId, d.ngayDuKien, d.giaCong, d.klDuKien, d.ten, d.donVi],
  );
  return rows.length > 0;
}

export async function batDau(client, id) {
  const { rows } = await client.query(
    `UPDATE thi_cong SET trang_thai = 'dang_thi_cong', ngay_thuc_hien = CURRENT_DATE WHERE id = $1 AND trang_thai = 'lap_lich' RETURNING don_hang_id`, [id]);
  return rows[0] || null;
}

export async function baoXong(client, id) {
  const { rows } = await client.query(
    `UPDATE thi_cong SET ngay_hoan_thanh = CURRENT_DATE
      WHERE id = $1 AND trang_thai = 'dang_thi_cong' AND ngay_hoan_thanh IS NULL RETURNING don_hang_id`, [id]);
  return rows[0] || null;
}

export async function demChuaXong(client, donHangId) {
  const { rows } = await client.query('SELECT count(*) FILTER (WHERE ngay_hoan_thanh IS NULL)::int AS chua FROM thi_cong WHERE don_hang_id = $1', [donHangId]);
  return rows[0].chua;
}

// ---------- Nghiem thu ----------
export async function dongVatTu(client, donHangId) {
  const { rows } = await client.query(
    `SELECT dvt.id, vt.ten AS vat_tu, vt.don_vi_tinh, l.ten AS loai, l.nguon_goc, dvt.so_luong_can, dvt.so_luong_thuc_te, dvt.don_gia
       FROM don_hang_vat_tu dvt JOIN vat_tu vt ON vt.id = dvt.vat_tu_id JOIN loai_vat_tu l ON l.id = vt.loai_vat_tu_id
      WHERE dvt.don_hang_id = $1 ORDER BY dvt.id`,
    [donHangId],
  );
  return rows;
}

export async function luuSoLuongThucTe(client, donHangId, dong) {
  for (const [id, sl] of dong) {
    const { rowCount } = await client.query('UPDATE don_hang_vat_tu SET so_luong_thuc_te = $3 WHERE id = $1 AND don_hang_id = $2', [id, donHangId, sl]);
    if (!rowCount) return false;
  }
  return true;
}

export async function luuKhoiLuongThucTe(client, donHangId, gd) {
  for (const [id, kl] of gd) {
    const { rowCount } = await client.query('UPDATE thi_cong SET kl_thuc_te = $3 WHERE id = $1 AND don_hang_id = $2', [id, donHangId, kl]);
    if (!rowCount) return false;
  }
  return true;
}

export async function chotNghiemThu(client, donHangId, userId) {
  await client.query(`UPDATE thi_cong SET trang_thai = 'da_nghiem_thu' WHERE don_hang_id = $1`, [donHangId]);
  await client.query('UPDATE don_hang SET nghiem_thu_luc = now(), nguoi_nghiem_thu_id = $2 WHERE id = $1', [donHangId, userId]);
}

// ---------- Phat sinh ----------
export async function phatSinhCua(donHangId) {
  const { rows } = await query(
    `SELECT p.*, u.ho_ten AS nguoi_tao, tc.ten_giai_doan, dt.ten AS doi_tho
       FROM phat_sinh_thi_cong p JOIN users u ON u.id = p.nguoi_tao_id
       LEFT JOIN thi_cong tc ON tc.id = p.thi_cong_id LEFT JOIN doi_tho dt ON dt.id = tc.doi_tho_id
      WHERE p.don_hang_id = $1 ORDER BY p.id`,
    [donHangId],
  );
  return rows;
}

export async function themPhatSinh(client, d) {
  const { rows } = await client.query(
    `INSERT INTO phat_sinh_thi_cong (don_hang_id, thi_cong_id, loai, so_tien, ly_do, nguoi_tao_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [d.donHangId, d.thiCongId, d.loai, d.soTien, d.lyDo, d.nguoiId],
  );
  return rows[0];
}

export async function ghiThuHo(client, { thoId, donHangId, thiCongId, soTien, psId, lyDo }) {
  await client.query(
    `INSERT INTO giao_dich_tho (doi_tho_id, don_hang_id, thi_cong_id, loai, so_tien, phat_sinh_id, ghi_chu) VALUES ($1, $2, $3, 'thu_ho', $4, $5, $6)`,
    [thoId, donHangId, thiCongId, soTien, psId, `Thợ thu hộ khách: ${lyDo}`],
  );
}

export async function findPhatSinh(client, id) {
  const { rows } = await client.query('SELECT * FROM phat_sinh_thi_cong WHERE id = $1 FOR UPDATE', [id]);
  return rows[0] || null;
}

export async function xoaPhatSinh(client, id) {
  await client.query('DELETE FROM phat_sinh_thi_cong WHERE id = $1', [id]); // so tho thu_ho xoa theo (ON DELETE CASCADE)
}

// ---------- Quyet toan ----------
export async function dsChoQuyetToan(vanHanhId = null) {
  const { rows } = await query(
    `SELECT dh.id AS don_hang_id, dh.ma_don, dh.hinh_thuc, dh.nghiem_thu_luc, kh.ten AS khach_hang, t.tong_don, t.con_phai_thu, t.phat_sinh_rong
       FROM don_hang dh JOIN khach_hang kh ON kh.id = dh.khach_hang_id JOIN v_don_hang_tien t ON t.don_hang_id = dh.id
      WHERE dh.giai_doan = 'quyet_toan' AND ($1::int IS NULL OR dh.vanhanh_phu_trach_id = $1)
      ORDER BY dh.nghiem_thu_luc NULLS LAST, dh.id`,
    [vanHanhId],
  );
  return rows;
}

export async function tienDon(client, donHangId) {
  const { rows } = await client.query(
    `SELECT dh.id, dh.ma_don, dh.hinh_thuc, dh.giai_doan, dh.chiet_khau_pct, dh.phi_van_chuyen, dh.phu_thu, dh.tien_coc,
            dh.nghiem_thu_luc, dh.quyet_toan_luc, dh.gia_tri_quyet_toan, kh.ten AS khach_hang,
            t.tong_vat_tu, t.tien_chiet_khau, t.tong_don, t.con_phai_thu, t.phat_sinh_rong, t.tho_thu_ho
       FROM don_hang dh JOIN khach_hang kh ON kh.id = dh.khach_hang_id JOIN v_don_hang_tien t ON t.don_hang_id = dh.id
      WHERE dh.id = $1`,
    [donHangId],
  );
  return rows[0] || null;
}

export async function dienSoLuongThucTeMacDinh(client, donHangId) {
  await client.query('UPDATE don_hang_vat_tu SET so_luong_thuc_te = so_luong_can WHERE don_hang_id = $1 AND so_luong_thuc_te IS NULL', [donHangId]);
}

export async function chotQuyetToan(client, donHangId, userId, giaTri) {
  await client.query(
    `UPDATE don_hang SET gia_tri_quyet_toan = $3, quyet_toan_luc = now(), nguoi_quyet_toan_id = $2,
            nghiem_thu_luc = COALESCE(nghiem_thu_luc, now()), nguoi_nghiem_thu_id = COALESCE(nguoi_nghiem_thu_id, $2)
      WHERE id = $1`,
    [donHangId, userId, giaTri],
  );
}

// Cong tho phai tra = gia cong x KL thuc te, moi giai doan 1 lan (unique index ux_gdt_phai_tra chan ghi doi).
export async function ghiPhaiTraTho(client, donHangId) {
  await client.query(
    `INSERT INTO giao_dich_tho (doi_tho_id, don_hang_id, thi_cong_id, loai, so_tien, ghi_chu)
     SELECT doi_tho_id, don_hang_id, id, 'phai_tra', round(gia_cong * kl_thuc_te), 'Công ' || ten_giai_doan || ': ' || kl_thuc_te || ' ' || don_vi_cong
       FROM thi_cong WHERE don_hang_id = $1 AND kl_thuc_te > 0 AND gia_cong > 0
     ON CONFLICT DO NOTHING`,
    [donHangId],
  );
}
