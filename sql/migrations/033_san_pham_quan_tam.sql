-- San pham = LOAI VAT TU (Cửa, Sàn, Tấm ốp...): danh muc Admin/Ke toan tu them, khong hard-code.
-- 1) Khach hang co NHIEU san pham quan tam -> bang trung gian khach_hang_san_pham (quan he N-N).
-- 2) Don hang luu MOT san pham chinh -> cot don_hang.san_pham_id.
-- 3) loai_vat_tu.tu_khoa: cac tu de doan san pham tu o "Nhu cầu" khach de lai (vd "ốp, nano, pvc").
-- 4) Ham fn_suy_san_pham_quan_tam: dien du lieu cu (don chua co san pham, khach chua co san pham quan tam).
SET LOCAL app.bo_qua_nhat_ky = '1';

ALTER TABLE loai_vat_tu ADD COLUMN tu_khoa TEXT;
UPDATE loai_vat_tu SET tu_khoa = 'sàn, lát sàn, sàn gỗ, spc' WHERE ten = 'Sàn';
UPDATE loai_vat_tu SET tu_khoa = 'tấm ốp, ốp, nano, pvc, lam sóng' WHERE ten = 'Tấm ốp';
UPDATE loai_vat_tu SET tu_khoa = 'cửa, cửa nhôm, cửa gỗ, xingfa' WHERE ten = 'Cửa';

CREATE TABLE khach_hang_san_pham (
    khach_hang_id   INTEGER NOT NULL REFERENCES khach_hang(id) ON DELETE CASCADE,
    loai_vat_tu_id  INTEGER NOT NULL REFERENCES loai_vat_tu(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (khach_hang_id, loai_vat_tu_id)
);
CREATE INDEX idx_kh_san_pham_loai ON khach_hang_san_pham(loai_vat_tu_id);

ALTER TABLE don_hang ADD COLUMN san_pham_id INTEGER REFERENCES loai_vat_tu(id) ON DELETE RESTRICT;
CREATE INDEX idx_don_hang_san_pham ON don_hang(san_pham_id);

-- p_khach NULL = toan bo khach. Chi THEM, khong xoa lua chon Sale da tick. Tra ve so dong khach_hang_san_pham them moi.
CREATE FUNCTION fn_suy_san_pham_quan_tam(p_khach INTEGER DEFAULT NULL) RETURNS INTEGER AS $$
DECLARE n INTEGER;
BEGIN
  -- Don chua co san pham: lay loai vat tu chiem nhieu tien nhat trong don.
  UPDATE don_hang dh SET san_pham_id = x.loai
    FROM (SELECT DISTINCT ON (dvt.don_hang_id) dvt.don_hang_id, vt.loai_vat_tu_id AS loai
            FROM don_hang_vat_tu dvt JOIN vat_tu vt ON vt.id = dvt.vat_tu_id
           GROUP BY dvt.don_hang_id, vt.loai_vat_tu_id
           ORDER BY dvt.don_hang_id, sum(dvt.so_luong_can * dvt.don_gia) DESC, vt.loai_vat_tu_id) x
   WHERE x.don_hang_id = dh.id AND dh.san_pham_id IS NULL AND (p_khach IS NULL OR dh.khach_hang_id = p_khach);

  -- Khach quan tam: (a) san pham cua cac don da dat, (b) tu khoa xuat hien trong "Nhu cầu" (\m \M = ranh gioi tu,
  -- de "của" khong bi nham thanh "cửa").
  INSERT INTO khach_hang_san_pham (khach_hang_id, loai_vat_tu_id)
  SELECT dh.khach_hang_id, dh.san_pham_id FROM don_hang dh
   WHERE dh.san_pham_id IS NOT NULL AND (p_khach IS NULL OR dh.khach_hang_id = p_khach)
  UNION
  SELECT kh.id, tk.id
    FROM khach_hang kh
    JOIN (SELECT l.id, '\m(' || string_agg(regexp_replace(lower(trim(k)), '([.^$*+?()\[\]{}|\\])', '\\\1', 'g'), '|') || ')\M' AS mau
            FROM loai_vat_tu l, regexp_split_to_table(COALESCE(NULLIF(l.tu_khoa, ''), l.ten), ',') k
           WHERE trim(k) <> '' GROUP BY l.id) tk ON kh.nhu_cau ~* tk.mau
   WHERE p_khach IS NULL OR kh.id = p_khach
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$ LANGUAGE plpgsql;

SELECT fn_suy_san_pham_quan_tam();
