-- 1) Doi ten hien thi buoc "Bóc khối lượng" -> "Tính KLVT" (khoi luong vat tu). Ma buoc 'boc_khoi_luong' giu nguyen.
-- 2) Ma hop dong tu sinh luc chot don: "<SĐT khach>_<STT don cua so do>" (vd 0912345678_2). Don nhap chua co ma.
--    Danh lai ma cho cac don da chot theo thu tu ngay chot; khong ghi nhat ky thay doi cho dot cap nhat he thong nay.
SET LOCAL app.bo_qua_nhat_ky = '1';

UPDATE quyen SET ten = 'Xác nhận tính KLVT (khối lượng vật tư)' WHERE ma = 'don_hang.boc_kl';

WITH g AS (
  SELECT dh.id, COALESCE(NULLIF(regexp_replace(kh.sdt, '\D', '', 'g'), ''), 'KH' || kh.id) AS goc,
         ROW_NUMBER() OVER (PARTITION BY COALESCE(NULLIF(regexp_replace(kh.sdt, '\D', '', 'g'), ''), 'KH' || kh.id)
                            ORDER BY dh.ngay_chot NULLS LAST, dh.created_at, dh.id) AS stt
    FROM don_hang dh JOIN khach_hang kh ON kh.id = dh.khach_hang_id
   WHERE dh.trang_thai <> 'nhap')
UPDATE don_hang dh SET ma_hop_dong = g.goc || '_' || g.stt FROM g WHERE g.id = dh.id;
UPDATE don_hang SET ma_hop_dong = NULL WHERE trang_thai = 'nhap' AND ma_hop_dong IS NOT NULL;

CREATE UNIQUE INDEX uq_don_hang_ma_hop_dong ON don_hang(ma_hop_dong) WHERE ma_hop_dong IS NOT NULL;
