import { query } from '../../config/db.js';

// Chi lay cac cot danh cho khach: khong co phuong an noi bo, ghi chu van hanh, id nguoi dung...
export async function findByToken(token) {
  const { rows } = await query(
    `SELECT dh.id, dh.ma_don, dh.hinh_thuc, dh.trang_thai, dh.ngay_chot, dh.ngay_yc_lap_dat,
            dh.tinh_thanh, dh.phuong_xa, dh.dia_chi_cong_trinh,
            dh.phi_van_chuyen, dh.phu_thu, dh.chiet_khau_pct, dh.tien_coc, dh.ty_le_tam_ung,
            dh.dieu_khoan_nghiem_thu, dh.bao_gia_tao_luc,
            kh.ten AS khach_hang, s.ho_ten AS sale,
            t.tong_vat_tu, t.tien_chiet_khau, t.tong_don, t.con_phai_thu
       FROM don_hang dh
       JOIN khach_hang kh ON kh.id = dh.khach_hang_id
       JOIN users s ON s.id = dh.sale_id
       JOIN v_don_hang_tien t ON t.don_hang_id = dh.id
      WHERE dh.bao_gia_token = $1`,
    [token],
  );
  return rows[0] || null;
}

export async function findDong(donHangId) {
  const { rows } = await query(
    `SELECT vt.ten, vt.don_vi_tinh, vt.quy_cach, dvt.so_luong_can, dvt.don_gia,
            dvt.so_luong_can * dvt.don_gia AS thanh_tien,
            dvt.loai_thi_cong, dvt.dai_mm, dvt.rong_mm, dvt.ghi_chu
       FROM don_hang_vat_tu dvt JOIN vat_tu vt ON vt.id = dvt.vat_tu_id
      WHERE dvt.don_hang_id = $1 ORDER BY dvt.id`,
    [donHangId],
  );
  return rows;
}
