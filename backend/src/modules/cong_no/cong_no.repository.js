import { query } from '../../config/db.js';

const HIEU_LUC = `('cho_duyet', 'da_duyet', 'da_thanh_toan')`; // de xuat con "song" (chua tu choi/thu hoi)

// ---------- Danh sach / chi tiet de xuat chi ----------
const COT = `c.id, c.loai_chi, c.ncc_id, n.ten AS ncc, c.doi_tho_id, dt.ten AS doi_tho, c.don_hang_id, dh.ma_don,
       c.mua_bo_sung_id, c.gia_tri_hang, c.coc_da_tru, c.so_tien, c.trang_thai, c.noi_dung_ck, c.ly_do_tu_choi, c.ghi_chu,
       c.telegram_message_id, c.telegram_chat_id, c.created_at, c.nguoi_tao_id, u.ho_ten AS nguoi_tao,
       (SELECT l.telegram_user FROM de_xuat_chi_duyet_log l WHERE l.de_xuat_chi_id = c.id ORDER BY l.id DESC LIMIT 1) AS nguoi_duyet,
       (SELECT l.thoi_gian FROM de_xuat_chi_duyet_log l WHERE l.de_xuat_chi_id = c.id ORDER BY l.id DESC LIMIT 1) AS thoi_gian_duyet`;
const TU = `FROM de_xuat_chi c
       LEFT JOIN nha_cung_cap n ON n.id = c.ncc_id
       LEFT JOIN doi_tho dt ON dt.id = c.doi_tho_id
       LEFT JOIN don_hang dh ON dh.id = c.don_hang_id
       JOIN users u ON u.id = c.nguoi_tao_id`;

export async function dsDeXuatChi({ trangThai, loaiChi, doiTuong, tuKhoa, limit, offset }) {
  const where = [];
  const params = [];
  const them = (sql, v) => { params.push(v); where.push(sql.replaceAll('?', `$${params.length}`)); };
  if (trangThai) them('c.trang_thai = ?', trangThai);
  if (loaiChi) them('c.loai_chi = ?', loaiChi);
  if (doiTuong === 'ncc') where.push('c.ncc_id IS NOT NULL');
  if (doiTuong === 'tho') where.push('c.doi_tho_id IS NOT NULL');
  if (tuKhoa) them('(dh.ma_don ILIKE ? OR n.ten ILIKE ? OR dt.ten ILIKE ?)', `%${tuKhoa}%`);
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const [{ rows }, { rows: dem }, { rows: theoTt }] = await Promise.all([
    query(`SELECT ${COT} ${TU} ${w} ORDER BY c.created_at DESC, c.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
    query(`SELECT count(*)::int AS tong ${TU} ${w}`, params),
    query('SELECT trang_thai, count(*)::int AS so FROM de_xuat_chi GROUP BY trang_thai'),
  ]);
  return { items: rows, tong: dem[0].tong, dem_trang_thai: Object.fromEntries(theoTt.map((r) => [r.trang_thai, r.so])) };
}

export async function findDxc(id, client = { query }) {
  const { rows } = await client.query(`SELECT ${COT} ${TU} WHERE c.id = $1`, [id]);
  return rows[0] || null;
}

export async function dongCua(id) {
  const { rows } = await query(
    `SELECT d.mua_hang_dong_id, vt.ten AS vat_tu, vt.don_vi_tinh, d.so_luong, d.don_gia, d.vat_pct, d.thanh_tien
       FROM de_xuat_chi_dong d JOIN mua_hang_dong m ON m.id = d.mua_hang_dong_id
       JOIN don_hang_vat_tu v ON v.id = m.don_hang_vat_tu_id JOIN vat_tu vt ON vt.id = v.vat_tu_id
      WHERE d.de_xuat_chi_id = $1 ORDER BY d.id`,
    [id],
  );
  return rows;
}

export async function lichSuDuyet(id) {
  const { rows } = await query('SELECT telegram_user, hanh_dong, ghi_chu, thoi_gian FROM de_xuat_chi_duyet_log WHERE de_xuat_chi_id = $1 ORDER BY id', [id]);
  return rows;
}

export async function phieuCua(id) {
  const { rows } = await query(
    'SELECT p.*, u.ho_ten AS nguoi_tao FROM phieu_thanh_toan p LEFT JOIN users u ON u.id = p.nguoi_tao_id WHERE p.de_xuat_chi_id = $1', [id]);
  return rows[0] || null;
}

// ---------- Du lieu de lap de xuat ----------
export async function khoaDon(client, donHangId) {
  const { rows } = await client.query('SELECT id, ma_don, giai_doan, quyet_toan_luc FROM don_hang WHERE id = $1 FOR UPDATE', [donHangId]);
  return rows[0] || null;
}

// Dong mua cua 1 NCC trong don (khoa FOR UPDATE: 2 nguoi lap quyet toan cung luc khong lay trung dong).
export async function dongCuaNcc(client, donHangId, nccId) {
  const { rows } = await client.query(
    `SELECT m.id, m.trang_thai, m.gia_chot, m.vat_pct, v.so_luong_can,
            EXISTS (SELECT 1 FROM de_xuat_chi_dong x JOIN de_xuat_chi c ON c.id = x.de_xuat_chi_id
                     WHERE x.mua_hang_dong_id = m.id AND c.trang_thai <> 'thu_hoi') AS da_quyet_toan
       FROM mua_hang_dong m JOIN don_hang_vat_tu v ON v.id = m.don_hang_vat_tu_id
      WHERE v.don_hang_id = $1 AND m.ncc_id = $2 AND m.trang_thai <> 'huy'
      ORDER BY m.id FOR UPDATE OF m`,
    [donHangId, nccId],
  );
  return rows;
}

// Coc da duoc duyet/chi cua don x NCC, va phan coc da tru vao cac quyet toan con hieu luc.
export async function cocCua(client, donHangId, nccId, boQuaId = 0) {
  const { rows } = await client.query(
    `SELECT COALESCE(sum(so_tien) FILTER (WHERE loai_chi = 'coc' AND trang_thai IN ('da_duyet', 'da_thanh_toan')), 0) AS coc_duyet,
            COALESCE(sum(so_tien) FILTER (WHERE loai_chi = 'coc' AND trang_thai IN ${HIEU_LUC}), 0) AS coc_hieu_luc,
            COALESCE(sum(coc_da_tru) FILTER (WHERE loai_chi = 'quyet_toan' AND trang_thai IN ${HIEU_LUC} AND id <> $3), 0) AS da_tru
       FROM de_xuat_chi WHERE don_hang_id = $1 AND ncc_id = $2 AND id <> $3`,
    [donHangId, nccId, boQuaId],
  );
  return { cocDuyet: Number(rows[0].coc_duyet), cocHieuLuc: Number(rows[0].coc_hieu_luc), daTru: Number(rows[0].da_tru) };
}

export async function tao(client, d) {
  const { rows } = await client.query(
    `INSERT INTO de_xuat_chi (loai_chi, ncc_id, doi_tho_id, don_hang_id, mua_bo_sung_id, nguoi_tao_id, gia_tri_hang, coc_da_tru, so_tien, ghi_chu)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [d.loai, d.nccId ?? null, d.thoId ?? null, d.donHangId, d.mbsId ?? null, d.nguoiId, d.giaTriHang ?? 0, d.cocTru ?? 0, d.soTien, d.ghiChu ?? null],
  );
  const id = rows[0].id;
  // Noi dung CK do he thong sinh, gan voi ma don + ma lenh chi (doi soat ngan hang theo noi dung nay).
  await client.query(
    `UPDATE de_xuat_chi c SET noi_dung_ck = CASE WHEN c.doi_tho_id IS NULL THEN dh.ma_don || '-11-' || c.id
              ELSE COALESCE((SELECT sdt FROM doi_tho WHERE id = c.doi_tho_id), 'THO') || ' ' || dh.ma_don END
       FROM don_hang dh WHERE dh.id = c.don_hang_id AND c.id = $1`,
    [id],
  );
  return id;
}

export async function themDong(client, dxcId, dong) {
  for (const x of dong) {
    await client.query(
      'INSERT INTO de_xuat_chi_dong (de_xuat_chi_id, mua_hang_dong_id, so_luong, don_gia, vat_pct, thanh_tien) VALUES ($1, $2, $3, $4, $5, $6)',
      [dxcId, x.id, x.so_luong, x.don_gia, x.vat_pct, x.thanh_tien],
    );
  }
}

export async function xoaDong(client, dxcId) {
  await client.query('DELETE FROM de_xuat_chi_dong WHERE de_xuat_chi_id = $1', [dxcId]);
}

export async function khoaDxc(client, id) {
  const { rows } = await client.query('SELECT * FROM de_xuat_chi WHERE id = $1 FOR UPDATE', [id]);
  return rows[0] || null;
}

export async function capNhatSoTien(client, id, { giaTriHang, cocTru, soTien, ghiChu }) {
  await client.query(
    `UPDATE de_xuat_chi SET gia_tri_hang = $2, coc_da_tru = $3, so_tien = $4, ghi_chu = COALESCE($5, ghi_chu),
            trang_thai = 'cho_duyet', ly_do_tu_choi = NULL, telegram_message_id = NULL WHERE id = $1`,
    [id, giaTriHang, cocTru, soTien, ghiChu],
  );
}

export async function doiTrangThai(client, id, tu, den, lyDo = null) {
  const { rows } = await client.query(
    `UPDATE de_xuat_chi SET trang_thai = $3::trang_thai_de_xuat_chi_enum, ly_do_tu_choi = COALESCE($4, ly_do_tu_choi)
      WHERE id = $1 AND trang_thai = $2::trang_thai_de_xuat_chi_enum RETURNING id`,
    [id, tu, den, lyDo],
  );
  return rows.length > 0;
}

export async function ghiLogDuyet(client, { id, nguoiDuyet, nguoiId, hanhDong, ghiChu }) {
  await client.query(
    'INSERT INTO de_xuat_chi_duyet_log (de_xuat_chi_id, telegram_user, nguoi_id, hanh_dong, ghi_chu) VALUES ($1, $2, $3, $4, $5)',
    [id, nguoiDuyet, nguoiId, hanhDong, ghiChu],
  );
}

export async function luuTelegram(id, { message_id, chat_id }) {
  await query('UPDATE de_xuat_chi SET telegram_message_id = $2, telegram_chat_id = $3 WHERE id = $1', [id, message_id, chat_id]);
}

export async function xoa(id) {
  const { rowCount } = await query(`DELETE FROM de_xuat_chi WHERE id = $1 AND trang_thai IN ('cho_duyet', 'tu_choi')`, [id]);
  return rowCount > 0;
}

export async function stkNguoiNhan(client, dxc) {
  const { rows } = dxc.ncc_id
    ? await client.query('SELECT so_tk, ten_ngan_hang, chu_tk FROM ncc_stk WHERE ncc_id = $1 ORDER BY id LIMIT 1', [dxc.ncc_id])
    : await client.query('SELECT so_tk, ten_ngan_hang, chu_tk FROM doi_tho WHERE id = $1 AND so_tk IS NOT NULL', [dxc.doi_tho_id]);
  return rows[0] || null;
}

export async function taoPhieu(client, d) {
  const { rows } = await client.query(
    `INSERT INTO phieu_thanh_toan (de_xuat_chi_id, ma_qr, so_tien, nguoi_tao_id, noi_dung_ck, bill_anh) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [d.id, d.maQr, d.soTien, d.nguoiId, d.noiDung, d.bill],
  );
  return rows[0];
}

// ---------- Mua bo sung / tho ----------
export async function khoaMbs(client, id) {
  const { rows } = await client.query(
    `SELECT b.*, (SELECT COALESCE(sum(so_luong * don_gia), 0) FROM mua_bo_sung_dong WHERE mua_bo_sung_id = b.id) AS tong,
            EXISTS (SELECT 1 FROM de_xuat_chi c WHERE c.mua_bo_sung_id = b.id AND c.trang_thai IN ${HIEU_LUC}) AS da_de_xuat
       FROM mua_bo_sung b WHERE b.id = $1 FOR UPDATE OF b`,
    [id],
  );
  return rows[0] || null;
}

// So du cong tho theo don: phai tra, da tra, tam ung, thu ho + cong du kien (de gioi han ung cong).
export async function soDuThoTheoDon(client, thoId, donHangId) {
  const { rows } = await client.query(
    `SELECT COALESCE(sum(so_tien) FILTER (WHERE loai = 'phai_tra'), 0) AS phai_tra,
            COALESCE(sum(so_tien) FILTER (WHERE loai = 'da_tra'), 0) AS da_tra,
            COALESCE(sum(so_tien) FILTER (WHERE loai = 'tam_ung'), 0) AS tam_ung,
            COALESCE(sum(so_tien) FILTER (WHERE loai = 'thu_ho'), 0) AS thu_ho,
            (SELECT COALESCE(sum(gia_cong * COALESCE(kl_thuc_te, kl_du_kien, 0)), 0) FROM thi_cong WHERE doi_tho_id = $1 AND don_hang_id = $2) AS cong_du_kien,
            (SELECT count(*) FROM thi_cong WHERE doi_tho_id = $1 AND don_hang_id = $2)::int AS so_giai_doan,
            (SELECT COALESCE(sum(so_tien), 0) FROM de_xuat_chi WHERE doi_tho_id = $1 AND don_hang_id = $2
              AND trang_thai IN ('cho_duyet', 'da_duyet')) AS dang_cho
       FROM giao_dich_tho WHERE doi_tho_id = $1 AND don_hang_id = $2`,
    [thoId, donHangId],
  );
  return Object.fromEntries(Object.entries(rows[0]).map(([k, v]) => [k, Number(v)]));
}

export async function ghiGiaoDichTho(client, d) {
  await client.query(
    `INSERT INTO giao_dich_tho (doi_tho_id, don_hang_id, loai, so_tien, de_xuat_chi_id, ghi_chu) VALUES ($1, $2, $3, $4, $5, $6)`,
    [d.thoId, d.donHangId, d.loai, d.soTien, d.dxcId, d.ghiChu],
  );
}

// ---------- Cong no ----------
// Cong no NCC (giong ERP): tien hang = gia tri hang cua de xuat quyet toan / chi bo sung DA DUYET; da chi = tien da chuyen.
export async function congNoNcc() {
  const { rows } = await query(
    `SELECT n.id AS ncc_id, n.ten AS ncc,
            COALESCE(sum(c.gia_tri_hang) FILTER (WHERE c.loai_chi IN ('quyet_toan', 'chi_bo_sung') AND c.trang_thai IN ('da_duyet', 'da_thanh_toan')), 0) AS tien_hang,
            COALESCE(sum(c.so_tien) FILTER (WHERE c.trang_thai = 'da_thanh_toan'), 0) AS da_chi,
            COALESCE(sum(c.so_tien) FILTER (WHERE c.trang_thai = 'da_duyet'), 0) AS cho_chi,
            COALESCE(sum(c.so_tien) FILTER (WHERE c.trang_thai = 'cho_duyet'), 0) AS cho_duyet,
            count(DISTINCT c.don_hang_id)::int AS so_don
       FROM nha_cung_cap n JOIN de_xuat_chi c ON c.ncc_id = n.id
      GROUP BY n.id ORDER BY n.ten`,
  );
  return rows;
}

export async function congNoNccTheoDon(nccId) {
  const { rows } = await query(
    `SELECT dh.id AS don_hang_id, dh.ma_don, dh.giai_doan,
            COALESCE(sum(c.gia_tri_hang) FILTER (WHERE c.loai_chi IN ('quyet_toan', 'chi_bo_sung') AND c.trang_thai IN ('da_duyet', 'da_thanh_toan')), 0) AS tien_hang,
            COALESCE(sum(c.so_tien) FILTER (WHERE c.trang_thai = 'da_thanh_toan'), 0) AS da_chi
       FROM de_xuat_chi c JOIN don_hang dh ON dh.id = c.don_hang_id
      WHERE c.ncc_id = $1 GROUP BY dh.id ORDER BY dh.id DESC`,
    [nccId],
  );
  return rows;
}

export async function congNoTho() {
  const { rows } = await query(
    `SELECT dt.id AS doi_tho_id, dt.ten AS doi_tho, dt.sdt,
            COALESCE(sum(g.so_tien) FILTER (WHERE g.loai = 'phai_tra'), 0) AS phai_tra,
            COALESCE(sum(g.so_tien) FILTER (WHERE g.loai = 'da_tra'), 0) AS da_tra,
            COALESCE(sum(g.so_tien) FILTER (WHERE g.loai = 'tam_ung'), 0) AS tam_ung,
            COALESCE(sum(g.so_tien) FILTER (WHERE g.loai = 'thu_ho'), 0) AS thu_ho,
            count(DISTINCT g.don_hang_id)::int AS so_don
       FROM doi_tho dt LEFT JOIN giao_dich_tho g ON g.doi_tho_id = dt.id
      GROUP BY dt.id ORDER BY dt.ten`,
  );
  return rows;
}

export async function soTho(thoId) {
  const { rows } = await query(
    `SELECT g.id, g.loai, g.so_tien, g.ghi_chu, g.created_at, g.don_hang_id, dh.ma_don, g.de_xuat_chi_id
       FROM giao_dich_tho g LEFT JOIN don_hang dh ON dh.id = g.don_hang_id WHERE g.doi_tho_id = $1 ORDER BY g.created_at DESC, g.id DESC`,
    [thoId],
  );
  return rows;
}
