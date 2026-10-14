-- Cong no khach hang: phieu thu (Sale/Van hanh ghi nhan khach da tra kem bill -> Ke toan xac nhan tien ve).
-- Da thu = coc luc chot + phieu thu DA XAC NHAN + tho thu ho. Kem: buoc Boc khoi luong phai xac nhan.
-- Chay lai nhieu lan van an toan.

CREATE TABLE IF NOT EXISTS thanh_toan_khach (
    id                  SERIAL PRIMARY KEY,
    don_hang_id         INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE RESTRICT,
    loai                VARCHAR(20) NOT NULL CHECK (loai IN ('tam_ung', 'quyet_toan', 'khac')),
    so_tien             NUMERIC(14,2) NOT NULL CHECK (so_tien > 0),
    hinh_thuc           VARCHAR(20) NOT NULL CHECK (hinh_thuc IN ('chuyen_khoan', 'tien_mat')),
    ngay_thu            DATE NOT NULL,
    bill_anh            TEXT,                                  -- uploads/thu_tien/<uuid>.<ext>
    ghi_chu             TEXT,
    trang_thai          VARCHAR(20) NOT NULL DEFAULT 'cho_xac_nhan' CHECK (trang_thai IN ('cho_xac_nhan', 'da_xac_nhan', 'tu_choi')),
    ly_do_tu_choi       TEXT,
    nguoi_tao_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    nguoi_xac_nhan_id   INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    xac_nhan_luc        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Chuyen khoan bat buoc co anh bill; da xac nhan thi phai biet ai xac nhan; tu choi phai co ly do.
    CONSTRAINT ck_ttk_bill CHECK (hinh_thuc <> 'chuyen_khoan' OR bill_anh IS NOT NULL),
    CONSTRAINT ck_ttk_xac_nhan CHECK (trang_thai <> 'da_xac_nhan' OR (nguoi_xac_nhan_id IS NOT NULL AND xac_nhan_luc IS NOT NULL)),
    CONSTRAINT ck_ttk_tu_choi CHECK (trang_thai <> 'tu_choi' OR ly_do_tu_choi IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_ttk_don ON thanh_toan_khach (don_hang_id);
CREATE INDEX IF NOT EXISTS idx_ttk_cho ON thanh_toan_khach (created_at) WHERE trang_thai = 'cho_xac_nhan';

-- Boc khoi luong: Van hanh xac nhan so luong thuc do truoc khi mua hang.
ALTER TABLE don_hang ADD COLUMN IF NOT EXISTS boc_khoi_luong_luc TIMESTAMPTZ;
ALTER TABLE don_hang ADD COLUMN IF NOT EXISTS nguoi_boc_khoi_luong_id INTEGER REFERENCES users(id) ON DELETE RESTRICT;
-- Don cu da qua buoc Boc khoi luong (truoc khi co tinh nang) coi nhu da xac nhan.
UPDATE don_hang SET boc_khoi_luong_luc = COALESCE(ngay_chot::timestamptz, created_at)
 WHERE boc_khoi_luong_luc IS NULL AND hinh_thuc = 'hoan_thien'
   AND giai_doan IN ('mua_hang', 'giao_hang', 'thi_cong', 'nghiem_thu', 'quyet_toan', 'hoan_tat');

-- View tien: them da_thu_khach (phieu da xac nhan) o CUOI (CREATE OR REPLACE chi cho them cot cuoi), tru vao con_phai_thu.
CREATE OR REPLACE VIEW v_don_hang_tien AS
SELECT dh.id AS don_hang_id,
       t.tong_vat_tu,
       round(t.tong_vat_tu * dh.chiet_khau_pct / 100) AS tien_chiet_khau,
       COALESCE(dh.gia_tri_quyet_toan,
                round(t.tong_vat_tu * (1 - dh.chiet_khau_pct / 100)) + dh.phi_van_chuyen + dh.phu_thu + ps.rong) AS tong_don,
       COALESCE(dh.gia_tri_quyet_toan,
                round(t.tong_vat_tu * (1 - dh.chiet_khau_pct / 100)) + dh.phi_van_chuyen + dh.phu_thu + ps.rong)
         - dh.tien_coc - ps.thu_ho - tt.da_thu AS con_phai_thu,
       ps.rong AS phat_sinh_rong,
       ps.thu_ho AS tho_thu_ho,
       tt.da_thu AS da_thu_khach
  FROM don_hang dh
  CROSS JOIN LATERAL (
    SELECT COALESCE(sum(COALESCE(dvt.so_luong_thuc_te, dvt.so_luong_can) * dvt.don_gia), 0) AS tong_vat_tu
      FROM don_hang_vat_tu dvt WHERE dvt.don_hang_id = dh.id
  ) t
  CROSS JOIN LATERAL (
    SELECT COALESCE(sum(CASE p.loai WHEN 'giam_tru' THEN -p.so_tien WHEN 'thu_ho' THEN 0 ELSE p.so_tien END), 0) AS rong,
           COALESCE(sum(p.so_tien) FILTER (WHERE p.loai = 'thu_ho'), 0) AS thu_ho
      FROM phat_sinh_thi_cong p WHERE p.don_hang_id = dh.id
  ) ps
  CROSS JOIN LATERAL (
    SELECT COALESCE(sum(k.so_tien), 0) AS da_thu FROM thanh_toan_khach k WHERE k.don_hang_id = dh.id AND k.trang_thai = 'da_xac_nhan'
  ) tt;
