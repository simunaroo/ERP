// Ma hop dong = "<SĐT khach>_<STT don cua so dien thoai do>", vd 0912345678_1 (lan dat dau), 0912345678_2 (lan 2).
// - Sinh luc CHOT don (don nhap chua co ma). STT dem theo so dien thoai, khong dem theo id khach, de 2 ho so
//   khach trung so van khong ra ma trung. Khach khong co SĐT thi dung "KH<id>".
// - STT = so lon nhat da cap + 1 (don huy van giu ma, khong cap lai) -> ma khong bao gio bi dung lai.
// - Khoa tu van theo SĐT trong giao dich: 2 don cua cung 1 khach chot dong thoi khong nhan cung STT.
//   Chi muc UNIQUE (uq_don_hang_ma_hop_dong) chan them o tang CSDL.

const GOC = `COALESCE(NULLIF(regexp_replace(kh.sdt, '\\D', '', 'g'), ''), 'KH' || kh.id)`;

export async function ganMaHopDong(client, donId) {
  const { rows: [d] } = await client.query(
    `SELECT ${GOC} AS goc FROM don_hang dh JOIN khach_hang kh ON kh.id = dh.khach_hang_id WHERE dh.id = $1`,
    [donId],
  );
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('ma_hop_dong:' || $1::text))`, [d.goc]);
  const { rows: [m] } = await client.query(
    `UPDATE don_hang SET ma_hop_dong = $2::text || '_' || (
        SELECT COALESCE(max(substring(ma_hop_dong FROM '_(\\d+)$')::int), 0) + 1
          FROM don_hang WHERE ma_hop_dong ~ ('^' || $2::text || '_\\d+$'))
      WHERE id = $1 RETURNING ma_hop_dong`,
    [donId, d.goc],
  );
  return m.ma_hop_dong;
}

// Danh lai ma cho TOAN BO don da chot theo thu tu ngay chot (dung cho du lieu mau sau khi seed).
export const DANH_LAI_SQL = `
WITH g AS (
  SELECT dh.id, ${GOC} AS goc,
         ROW_NUMBER() OVER (PARTITION BY ${GOC} ORDER BY dh.ngay_chot NULLS LAST, dh.created_at, dh.id) AS stt
    FROM don_hang dh JOIN khach_hang kh ON kh.id = dh.khach_hang_id
   WHERE dh.trang_thai <> 'nhap')
UPDATE don_hang dh SET ma_hop_dong = g.goc || '_' || g.stt FROM g WHERE g.id = dh.id`;
