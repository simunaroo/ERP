-- Lam lai Mua hang / Thi cong / Cong no theo nghiep vu ERP thuc te.
--   Mua hang: NCC + gia chot + trang thai cho TUNG DONG vat tu (mua_hang_dong); mua bo sung co trach nhiem.
--   De xuat chi: 1 don x 1 NCC (coc | quyet_toan | chi_bo_sung) hoac 1 doi tho (tra_cong | ung_cong).
--   Cong no NCC = tien hang cua de xuat da DUYET - da chi.
--   Thi cong: giai doan + gia cong x khoi luong thuc te; nghiem thu = SL thuc te tung dong vat tu -> quyet toan.
-- Chay lai nhieu lan van an toan; phan chuyen du lieu cu chi chay khi bang cu con ton tai.

-- ===================== KIEU DU LIEU =====================
DO $$ BEGIN CREATE TYPE trang_thai_dong_mua_enum AS ENUM ('cho_xu_ly', 'dang_hoi', 'da_dat_hang', 'san_hang', 'da_lay_hang', 'da_giao_hang', 'huy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE loai_chi_enum AS ENUM ('coc', 'quyet_toan', 'chi_bo_sung', 'tra_cong', 'ung_cong');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE loai_phat_sinh_mbs_enum AS ENUM ('hang_hong', 'giao_thieu_sai', 'boc_khoi_luong_thieu', 'tho_lam_hong', 'khach_bo_sung', 'mat_hang', 'khac');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE nguon_trach_nhiem_enum AS ENUM ('ncc', 'van_chuyen', 'tho', 'khao_sat', 'sale', 'khach_hang', 'cong_ty', 'chua_xac_dinh');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE trang_thai_mbs_enum AS ENUM ('cho_xu_ly', 'da_mua', 'huy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE loai_phat_sinh_tc_enum AS ENUM ('phat_sinh', 'phu_thu', 'giam_tru', 'thu_ho');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE loai_giao_dich_tho_enum AS ENUM ('phai_tra', 'da_tra', 'tam_ung', 'thu_ho');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================== MUA HANG THEO DONG =====================
CREATE TABLE IF NOT EXISTS mua_hang_dong (
    id                  SERIAL PRIMARY KEY,
    don_hang_vat_tu_id  INTEGER NOT NULL UNIQUE REFERENCES don_hang_vat_tu(id) ON DELETE CASCADE,
    ncc_id              INTEGER REFERENCES nha_cung_cap(id) ON DELETE RESTRICT,
    gia_chot            NUMERIC(14,2) CHECK (gia_chot >= 0),   -- chup lai luc chon NCC, NCC doi gia sau khong anh huong
    vat_pct             NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (vat_pct BETWEEN 0 AND 20),
    trang_thai          trang_thai_dong_mua_enum NOT NULL DEFAULT 'cho_xu_ly',
    ghi_chu             TEXT,
    nguoi_cap_nhat_id   INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    cap_nhat_luc        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Tu "da dat hang" tro di bat buoc da chon NCC va chot gia.
    CONSTRAINT ck_mhd_da_dat_co_ncc CHECK (trang_thai IN ('cho_xu_ly', 'dang_hoi', 'huy') OR (ncc_id IS NOT NULL AND gia_chot IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_mhd_ncc ON mua_hang_dong (ncc_id);

CREATE TABLE IF NOT EXISTS mua_bo_sung (
    id              SERIAL PRIMARY KEY,
    don_hang_id     INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE RESTRICT,
    loai_phat_sinh  loai_phat_sinh_mbs_enum NOT NULL,
    ly_do           TEXT NOT NULL CHECK (length(trim(ly_do)) > 0),
    trang_thai      trang_thai_mbs_enum NOT NULL DEFAULT 'cho_xu_ly',
    ncc_id          INTEGER REFERENCES nha_cung_cap(id) ON DELETE RESTRICT,
    ngay_mua        DATE,
    nguoi_tao_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_mbs_da_mua CHECK (trang_thai <> 'da_mua' OR (ncc_id IS NOT NULL AND ngay_mua IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS mua_bo_sung_dong (
    id              SERIAL PRIMARY KEY,
    mua_bo_sung_id  INTEGER NOT NULL REFERENCES mua_bo_sung(id) ON DELETE CASCADE,
    vat_tu_id       INTEGER NOT NULL REFERENCES vat_tu(id) ON DELETE RESTRICT,
    so_luong        NUMERIC(12,2) NOT NULL CHECK (so_luong > 0),
    don_gia         NUMERIC(14,2) CHECK (don_gia >= 0)
);
-- Moi nguon phat sinh (NCC, tho, van chuyen...) chiu bao nhieu tien.
CREATE TABLE IF NOT EXISTS mua_bo_sung_trach_nhiem (
    id              SERIAL PRIMARY KEY,
    mua_bo_sung_id  INTEGER NOT NULL REFERENCES mua_bo_sung(id) ON DELETE CASCADE,
    nguon           nguon_trach_nhiem_enum NOT NULL,
    so_tien         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (so_tien >= 0),
    UNIQUE (mua_bo_sung_id, nguon)
);

-- ===================== THI CONG THEO GIAI DOAN =====================
ALTER TABLE thi_cong
  ADD COLUMN IF NOT EXISTS ten_giai_doan TEXT NOT NULL DEFAULT 'Thi công',
  ADD COLUMN IF NOT EXISTS don_vi_cong TEXT NOT NULL DEFAULT 'm²',
  ADD COLUMN IF NOT EXISTS gia_cong NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gia_cong >= 0),
  ADD COLUMN IF NOT EXISTS kl_du_kien NUMERIC(12,2) CHECK (kl_du_kien >= 0),
  ADD COLUMN IF NOT EXISTS kl_thuc_te NUMERIC(12,2) CHECK (kl_thuc_te >= 0);
DROP INDEX IF EXISTS ux_thi_cong_dang_mo; -- nay 1 don co nhieu giai doan song song

ALTER TABLE doi_tho
  ADD COLUMN IF NOT EXISTS so_tk TEXT,
  ADD COLUMN IF NOT EXISTS ten_ngan_hang TEXT,
  ADD COLUMN IF NOT EXISTS chu_tk TEXT;

ALTER TABLE don_hang_vat_tu ADD COLUMN IF NOT EXISTS so_luong_thuc_te NUMERIC(12,2) CHECK (so_luong_thuc_te >= 0);

ALTER TABLE don_hang
  ADD COLUMN IF NOT EXISTS nghiem_thu_luc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nguoi_nghiem_thu_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS gia_tri_quyet_toan NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS quyet_toan_luc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nguoi_quyet_toan_id INTEGER REFERENCES users(id) ON DELETE RESTRICT;

-- Phat sinh tien trong thi cong: phat_sinh/phu_thu cong them, giam_tru tru di, thu_ho = tho thu tien khach.
CREATE TABLE IF NOT EXISTS phat_sinh_thi_cong (
    id              SERIAL PRIMARY KEY,
    don_hang_id     INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE RESTRICT,
    thi_cong_id     INTEGER REFERENCES thi_cong(id) ON DELETE RESTRICT,
    loai            loai_phat_sinh_tc_enum NOT NULL,
    so_tien         NUMERIC(14,2) NOT NULL CHECK (so_tien > 0),
    ly_do           TEXT NOT NULL CHECK (length(trim(ly_do)) > 0),
    nguoi_tao_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_thu_ho_co_tho CHECK (loai <> 'thu_ho' OR thi_cong_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_ps_tc_don ON phat_sinh_thi_cong (don_hang_id);

-- ===================== DE XUAT CHI (NCC + THO) =====================
ALTER TABLE de_xuat_chi
  ALTER COLUMN ncc_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS doi_tho_id INTEGER REFERENCES doi_tho(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS don_hang_id INTEGER REFERENCES don_hang(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS loai_chi loai_chi_enum NOT NULL DEFAULT 'quyet_toan',
  ADD COLUMN IF NOT EXISTS gia_tri_hang NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gia_tri_hang >= 0),
  ADD COLUMN IF NOT EXISTS coc_da_tru NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (coc_da_tru >= 0),
  ADD COLUMN IF NOT EXISTS mua_bo_sung_id INTEGER REFERENCES mua_bo_sung(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS noi_dung_ck TEXT,
  ADD COLUMN IF NOT EXISTS ly_do_tu_choi TEXT;
ALTER TABLE de_xuat_chi DROP CONSTRAINT IF EXISTS de_xuat_chi_so_tien_check;
DO $$ BEGIN ALTER TABLE de_xuat_chi ADD CONSTRAINT ck_dxc_so_tien CHECK (so_tien >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Dong hang trong de xuat QUYET TOAN (gia, VAT chup lai -> dong bang so lieu luc de xuat).
CREATE TABLE IF NOT EXISTS de_xuat_chi_dong (
    id                  SERIAL PRIMARY KEY,
    de_xuat_chi_id      INTEGER NOT NULL REFERENCES de_xuat_chi(id) ON DELETE CASCADE,
    mua_hang_dong_id    INTEGER NOT NULL REFERENCES mua_hang_dong(id) ON DELETE RESTRICT,
    so_luong            NUMERIC(12,2) NOT NULL CHECK (so_luong > 0),
    don_gia             NUMERIC(14,2) NOT NULL CHECK (don_gia >= 0),
    vat_pct             NUMERIC(5,2) NOT NULL DEFAULT 0,
    thanh_tien          NUMERIC(14,2) NOT NULL,
    UNIQUE (de_xuat_chi_id, mua_hang_dong_id)
);
CREATE INDEX IF NOT EXISTS idx_dxc_dong_mhd ON de_xuat_chi_dong (mua_hang_dong_id);

-- So giao dich voi tho (cong no tho). Con phai tra tho = phai_tra - da_tra - tam_ung - thu_ho.
CREATE TABLE IF NOT EXISTS giao_dich_tho (
    id              SERIAL PRIMARY KEY,
    doi_tho_id      INTEGER NOT NULL REFERENCES doi_tho(id) ON DELETE RESTRICT,
    don_hang_id     INTEGER REFERENCES don_hang(id) ON DELETE RESTRICT,
    thi_cong_id     INTEGER REFERENCES thi_cong(id) ON DELETE RESTRICT,
    loai            loai_giao_dich_tho_enum NOT NULL,
    so_tien         NUMERIC(14,2) NOT NULL CHECK (so_tien > 0),
    de_xuat_chi_id  INTEGER REFERENCES de_xuat_chi(id) ON DELETE RESTRICT,
    phat_sinh_id    INTEGER REFERENCES phat_sinh_thi_cong(id) ON DELETE CASCADE,
    ghi_chu         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gdt_tho ON giao_dich_tho (doi_tho_id);
-- Moi giai doan chi phat sinh 1 khoan "phai tra" (khi quyet toan).
CREATE UNIQUE INDEX IF NOT EXISTS ux_gdt_phai_tra ON giao_dich_tho (thi_cong_id) WHERE loai = 'phai_tra';

ALTER TABLE phieu_thanh_toan ADD COLUMN IF NOT EXISTS bill_anh TEXT; -- anh bill/UNC (bat buoc khi "Da chi")

-- ===================== CHUYEN DU LIEU CU (chi lan dau) =====================
DO $$
BEGIN
  IF to_regclass('public.de_xuat_mua_hang') IS NULL THEN RETURN; END IF;

  -- (a) Dong mua hang: lay NCC/gia/trang thai tu de xuat mua cu cua cung don + vat tu.
  INSERT INTO mua_hang_dong (don_hang_vat_tu_id, ncc_id, gia_chot, trang_thai, cap_nhat_luc)
  SELECT dvt.id, x.ncc_id, x.don_gia,
         CASE
           WHEN dh.giai_doan = 'huy' THEN 'huy'
           WHEN x.ncc_id IS NULL THEN 'cho_xu_ly'
           WHEN x.trang_thai = 'cho_duyet' THEN 'dang_hoi'
           WHEN x.trang_thai = 'da_dat' THEN 'da_dat_hang'
           WHEN dh.giai_doan = 'mua_hang' THEN 'san_hang'
           ELSE 'da_giao_hang'
         END::trang_thai_dong_mua_enum,
         COALESCE(x.created_at, dh.created_at)
    FROM don_hang_vat_tu dvt
    JOIN don_hang dh ON dh.id = dvt.don_hang_id AND dh.trang_thai <> 'nhap'
    JOIN vat_tu vt ON vt.id = dvt.vat_tu_id
    JOIN loai_vat_tu lvt ON lvt.id = vt.loai_vat_tu_id AND lvt.nguon_goc = 'mua_ngoai'
    LEFT JOIN LATERAL (
      SELECT d.ncc_id, ct.don_gia, d.trang_thai, d.created_at
        FROM de_xuat_mua_hang d JOIN de_xuat_mua_hang_ct ct ON ct.de_xuat_mua_hang_id = d.id
       WHERE d.don_hang_id = dh.id AND ct.vat_tu_id = dvt.vat_tu_id
       ORDER BY d.id DESC LIMIT 1) x ON true
  ON CONFLICT (don_hang_vat_tu_id) DO NOTHING;

  -- (b) De xuat chi cu gom theo NCC (nhieu don) khong hop mo hinh moi -> xoa, dung lai theo don x NCC.
  DELETE FROM phieu_thanh_toan;
  DELETE FROM de_xuat_chi_duyet_log;
  DELETE FROM de_xuat_chi_muc;
  DELETE FROM de_xuat_chi;
  DROP TABLE de_xuat_chi_muc;
  DROP FUNCTION IF EXISTS fn_chan_dxm_trung_de_xuat_chi() CASCADE;
  DROP TABLE de_xuat_mua_hang_ct;
  DROP TABLE de_xuat_mua_hang;

  -- (c) Thi cong cu -> giai doan: gia cong 60.000d/m2, KL du kien = tong m2 vat tu mua ngoai cua don.
  UPDATE thi_cong tc SET gia_cong = 60000,
         kl_du_kien = (SELECT COALESCE(sum(dvt.so_luong_can), 0) FROM don_hang_vat_tu dvt
                        JOIN vat_tu vt ON vt.id = dvt.vat_tu_id JOIN loai_vat_tu l ON l.id = vt.loai_vat_tu_id AND l.nguon_goc = 'mua_ngoai'
                       WHERE dvt.don_hang_id = tc.don_hang_id)
   WHERE tc.gia_cong = 0;
  UPDATE thi_cong tc SET kl_thuc_te = COALESCE((SELECT max(nt.khoi_luong_thuc_te) FROM nghiem_thu nt WHERE nt.thi_cong_id = tc.id), tc.kl_du_kien)
   WHERE tc.trang_thai = 'da_nghiem_thu' AND tc.kl_thuc_te IS NULL;
  DROP TABLE IF EXISTS nghiem_thu;

  -- (d) Don da qua nghiem thu: SL thuc te = SL du kien; don hoan tat: chot quyet toan.
  UPDATE don_hang_vat_tu dvt SET so_luong_thuc_te = dvt.so_luong_can
    FROM don_hang dh WHERE dh.id = dvt.don_hang_id AND dh.giai_doan IN ('quyet_toan', 'hoan_tat') AND dvt.so_luong_thuc_te IS NULL;
  UPDATE don_hang dh SET nghiem_thu_luc = dh.created_at + interval '10 days'
   WHERE dh.giai_doan IN ('quyet_toan', 'hoan_tat') AND dh.nghiem_thu_luc IS NULL;
END $$;

-- ===================== TIEN DON HANG =====================
-- Theo SL thuc te (neu da nghiem thu) + phat sinh; da chot quyet toan thi lay gia tri chot.
CREATE OR REPLACE VIEW v_don_hang_tien AS
SELECT dh.id AS don_hang_id,
       t.tong_vat_tu,
       round(t.tong_vat_tu * dh.chiet_khau_pct / 100) AS tien_chiet_khau,
       COALESCE(dh.gia_tri_quyet_toan,
                round(t.tong_vat_tu * (1 - dh.chiet_khau_pct / 100)) + dh.phi_van_chuyen + dh.phu_thu + ps.rong) AS tong_don,
       COALESCE(dh.gia_tri_quyet_toan,
                round(t.tong_vat_tu * (1 - dh.chiet_khau_pct / 100)) + dh.phi_van_chuyen + dh.phu_thu + ps.rong)
         - dh.tien_coc - ps.thu_ho AS con_phai_thu,
       ps.rong AS phat_sinh_rong,
       ps.thu_ho AS tho_thu_ho
  FROM don_hang dh
  CROSS JOIN LATERAL (
    SELECT COALESCE(sum(COALESCE(dvt.so_luong_thuc_te, dvt.so_luong_can) * dvt.don_gia), 0) AS tong_vat_tu
      FROM don_hang_vat_tu dvt WHERE dvt.don_hang_id = dh.id
  ) t
  CROSS JOIN LATERAL (
    SELECT COALESCE(sum(CASE p.loai WHEN 'giam_tru' THEN -p.so_tien WHEN 'thu_ho' THEN 0 ELSE p.so_tien END), 0) AS rong,
           COALESCE(sum(p.so_tien) FILTER (WHERE p.loai = 'thu_ho'), 0) AS thu_ho
      FROM phat_sinh_thi_cong p WHERE p.don_hang_id = dh.id
  ) ps;

-- ===================== RANG BUOC DE XUAT CHI =====================
-- (1) Moi de xuat chi cho dung 1 doi tuong, dung loai: NCC (coc/quyet_toan/chi_bo_sung) hoac tho (tra_cong/ung_cong).
DO $$ BEGIN
  ALTER TABLE de_xuat_chi ADD CONSTRAINT ck_dxc_doi_tuong CHECK (
    (loai_chi IN ('coc', 'quyet_toan', 'chi_bo_sung') AND ncc_id IS NOT NULL AND doi_tho_id IS NULL)
    OR (loai_chi IN ('tra_cong', 'ung_cong') AND doi_tho_id IS NOT NULL AND ncc_id IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- (2) Mot dong hang chi nam trong MOT de xuat quyet toan con hieu luc (khac 'thu_hoi') -> khong tra tien 2 lan.
--     CHECK khong tham chieu duoc bang khac -> TRIGGER; service van khoa dong (FOR UPDATE) vi trigger
--     khong thay du lieu chua commit cua giao dich khac.
CREATE OR REPLACE FUNCTION fn_chan_dong_trung_quyet_toan() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM de_xuat_chi_dong d JOIN de_xuat_chi c ON c.id = d.de_xuat_chi_id
     WHERE d.mua_hang_dong_id = NEW.mua_hang_dong_id AND d.de_xuat_chi_id <> NEW.de_xuat_chi_id AND c.trang_thai <> 'thu_hoi'
  ) THEN
    RAISE EXCEPTION 'Dong hang % da nam trong mot de xuat quyet toan khac', NEW.mua_hang_dong_id USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tg_chan_dong_trung_qt ON de_xuat_chi_dong;
CREATE TRIGGER tg_chan_dong_trung_qt BEFORE INSERT OR UPDATE ON de_xuat_chi_dong
  FOR EACH ROW EXECUTE FUNCTION fn_chan_dong_trung_quyet_toan();

CREATE INDEX IF NOT EXISTS idx_dxc_don ON de_xuat_chi (don_hang_id);
CREATE INDEX IF NOT EXISTS idx_dxc_tho ON de_xuat_chi (doi_tho_id);

-- (3) Du lieu cu: dung lai de xuat QUYET TOAN cho moi don x NCC da giao hang (hoan tat = da chi, con lai = da duyet).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM de_xuat_chi) THEN RETURN; END IF;
  WITH nhom AS (
    SELECT dvt.don_hang_id, m.ncc_id, dh.giai_doan, dh.created_at,
           sum(dvt.so_luong_can * m.gia_chot * (1 + m.vat_pct / 100)) AS tien,
           array_agg(m.id) AS dong
      FROM mua_hang_dong m JOIN don_hang_vat_tu dvt ON dvt.id = m.don_hang_vat_tu_id JOIN don_hang dh ON dh.id = dvt.don_hang_id
     WHERE m.trang_thai IN ('san_hang', 'da_lay_hang', 'da_giao_hang')
     GROUP BY dvt.don_hang_id, m.ncc_id, dh.giai_doan, dh.created_at
  ), moi AS (
    INSERT INTO de_xuat_chi (ncc_id, don_hang_id, loai_chi, nguoi_tao_id, gia_tri_hang, so_tien, trang_thai, created_at)
    SELECT n.ncc_id, n.don_hang_id, 'quyet_toan', (SELECT min(id) FROM users WHERE vai_tro = 'ke_toan'), round(n.tien), round(n.tien),
           CASE WHEN n.giai_doan = 'hoan_tat' THEN 'da_thanh_toan' ELSE 'da_duyet' END::trang_thai_de_xuat_chi_enum,
           n.created_at + interval '5 days'
      FROM nhom n
    RETURNING id, ncc_id, don_hang_id
  )
  INSERT INTO de_xuat_chi_dong (de_xuat_chi_id, mua_hang_dong_id, so_luong, don_gia, vat_pct, thanh_tien)
  SELECT moi.id, m.id, dvt.so_luong_can, m.gia_chot, m.vat_pct, round(dvt.so_luong_can * m.gia_chot * (1 + m.vat_pct / 100))
    FROM moi JOIN don_hang_vat_tu dvt ON dvt.don_hang_id = moi.don_hang_id
    JOIN mua_hang_dong m ON m.don_hang_vat_tu_id = dvt.id AND m.ncc_id = moi.ncc_id
   WHERE m.trang_thai IN ('san_hang', 'da_lay_hang', 'da_giao_hang');
  UPDATE de_xuat_chi SET noi_dung_ck = (SELECT ma_don FROM don_hang WHERE id = don_hang_id) || '-11-' || id WHERE noi_dung_ck IS NULL;
  INSERT INTO phieu_thanh_toan (de_xuat_chi_id, so_tien, ngay_thanh_toan, noi_dung_ck, bill_anh)
  SELECT id, so_tien, created_at::date + 3, noi_dung_ck, 'du-lieu-cu' FROM de_xuat_chi WHERE trang_thai = 'da_thanh_toan' AND so_tien > 0;
END $$;

-- (4) Du lieu cu: don hoan tat -> chot gia tri quyet toan; tho cua giai doan da nghiem thu -> phai tra + da tra.
DO $$
BEGIN
  UPDATE don_hang dh SET gia_tri_quyet_toan = t.tong_don, quyet_toan_luc = dh.created_at + interval '15 days'
    FROM v_don_hang_tien t
   WHERE t.don_hang_id = dh.id AND dh.giai_doan = 'hoan_tat' AND dh.quyet_toan_luc IS NULL;
  IF EXISTS (SELECT 1 FROM giao_dich_tho) THEN RETURN; END IF;
  INSERT INTO giao_dich_tho (doi_tho_id, don_hang_id, thi_cong_id, loai, so_tien, ghi_chu, created_at)
  SELECT tc.doi_tho_id, tc.don_hang_id, tc.id, 'phai_tra', round(tc.gia_cong * tc.kl_thuc_te), 'Công ' || tc.ten_giai_doan, dh.quyet_toan_luc
    FROM thi_cong tc JOIN don_hang dh ON dh.id = tc.don_hang_id
   WHERE dh.giai_doan = 'hoan_tat' AND tc.kl_thuc_te > 0 AND tc.gia_cong > 0;
  INSERT INTO giao_dich_tho (doi_tho_id, don_hang_id, thi_cong_id, loai, so_tien, ghi_chu, created_at)
  SELECT doi_tho_id, don_hang_id, thi_cong_id, 'da_tra', so_tien, 'Đã trả công (dữ liệu cũ)', created_at + interval '3 days'
    FROM giao_dich_tho WHERE loai = 'phai_tra';
END $$;
