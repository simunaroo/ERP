-- =====================================================================
-- ERD: Chuoi cung ung & thi cong NST — schema thiet ke lai
-- Quy uoc: TEXT thay cho VARCHAR (khuyen nghi cua PostgreSQL), ENUM that
-- cho cac truong trang thai/vai tro, TIMESTAMPTZ cho moi truong thoi gian.
-- =====================================================================

-- ---------- ENUM TYPES ----------
CREATE TYPE vai_tro_enum AS ENUM ('sale', 'van_hanh', 'ke_toan', 'admin');
CREATE TYPE trang_thai_hoat_dong_enum AS ENUM ('active', 'ngung_hoat_dong');
CREATE TYPE trang_thai_don_hang_enum AS ENUM ('nhap', 'moi', 'dang_xu_ly', 'hoan_tat', 'huy');
CREATE TYPE trang_thai_yeu_cau_sua_enum AS ENUM ('cho_xu_ly', 'da_xu_ly');
CREATE TYPE loai_hinh_anh_enum AS ENUM ('mat_bang', 'nghiem_thu', 'khac');
CREATE TYPE nguon_goc_vat_tu_enum AS ENUM ('tu_san_xuat', 'mua_ngoai');
CREATE TYPE trang_thai_mua_hang_enum AS ENUM ('cho_duyet', 'da_dat', 'da_giao');
CREATE TYPE trang_thai_thi_cong_enum AS ENUM ('lap_lich', 'dang_thi_cong', 'da_nghiem_thu');
CREATE TYPE trang_thai_de_xuat_chi_enum AS ENUM ('cho_duyet', 'da_duyet', 'tu_choi', 'da_thanh_toan');
CREATE TYPE hanh_dong_duyet_enum AS ENUM ('duyet', 'tu_choi');
CREATE TYPE trang_thai_cham_soc_enum AS ENUM ('moi', 'dang_tu_van', 'da_bao_gia', 'chot', 'khong_mua');
CREATE TYPE hinh_thuc_don_enum AS ENUM ('hoan_thien', 'vat_tu');
CREATE TYPE nhom_khach_hang_enum AS ENUM ('nha_dan', 'nha_thau', 'doi_tac', 'khac');
CREATE TYPE dieu_khoan_nghiem_thu_enum AS ENUM ('vat_tu_tieu_hao', 'so_m2_thi_cong', 'theo_hop_dong');
-- Tien do don: (Chot don) -> len_phuong_an -> boc_khoi_luong* -> mua_hang -> giao_hang -> thi_cong* -> nghiem_thu* -> quyet_toan -> hoan_tat
-- (* chi don Hoan thien); huy truoc khi giao hang.
CREATE TYPE giai_doan_don_enum AS ENUM (
    'len_phuong_an', 'boc_khoi_luong', 'mua_hang', 'giao_hang', 'thi_cong', 'nghiem_thu', 'quyet_toan', 'hoan_tat', 'huy');
CREATE TYPE loai_thi_cong_enum AS ENUM ('op_tran_phang', 'op_tran_giat_cap', 'op_tuong_khong_xuong', 'op_tuong_co_xuong', 'khac');

-- =====================================================================
-- MODULE 0 — NGUOI DUNG
-- =====================================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    ho_ten          TEXT NOT NULL,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    vai_tro         vai_tro_enum NOT NULL,
    trang_thai      trang_thai_hoat_dong_enum NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS btree_gist; -- cho rang buoc EXCLUDE cua ncc_bang_gia

-- =====================================================================
-- MODULE 1 — DON HANG
-- =====================================================================
CREATE TABLE khach_hang (
    id                  SERIAL PRIMARY KEY,
    ten                 TEXT NOT NULL,
    sdt                 TEXT,
    dia_chi             TEXT,
    sale_phu_trach_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    nhom_khach_hang     nhom_khach_hang_enum NOT NULL DEFAULT 'nha_dan',
    trang_thai_cham_soc trang_thai_cham_soc_enum NOT NULL DEFAULT 'moi',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE khach_hang_cham_soc (
    id              SERIAL PRIMARY KEY,
    khach_hang_id   INTEGER NOT NULL REFERENCES khach_hang(id) ON DELETE CASCADE,
    sale_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    trang_thai      trang_thai_cham_soc_enum NOT NULL,
    noi_dung        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE don_hang (
    id                      SERIAL PRIMARY KEY,
    ma_don                  TEXT NOT NULL UNIQUE,
    khach_hang_id           INTEGER NOT NULL REFERENCES khach_hang(id) ON DELETE RESTRICT,
    sale_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    vanhanh_phu_trach_id    INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    trang_thai              trang_thai_don_hang_enum NOT NULL DEFAULT 'nhap',
    giai_doan               giai_doan_don_enum,
    hinh_thuc               hinh_thuc_don_enum NOT NULL DEFAULT 'hoan_thien',
    ma_hop_dong             TEXT,
    ngay_chot               DATE,
    ngay_yc_lap_dat         DATE,
    tinh_thanh              TEXT,
    phuong_xa               TEXT,
    dia_chi_cong_trinh      TEXT,
    phi_van_chuyen          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (phi_van_chuyen >= 0),
    phu_thu                 NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (phu_thu >= 0),
    chiet_khau_pct          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (chiet_khau_pct BETWEEN 0 AND 100),
    tien_coc                NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tien_coc >= 0),
    ngay_coc                DATE,
    ty_le_tam_ung           SMALLINT NOT NULL DEFAULT 80 CHECK (ty_le_tam_ung BETWEEN 0 AND 100),
    dieu_khoan_nghiem_thu   dieu_khoan_nghiem_thu_enum,
    ghi_chu_van_chuyen      TEXT,
    phuong_an_van_chuyen    TEXT,
    phuong_an_thi_cong      TEXT,
    bao_gia_token           TEXT UNIQUE,
    bao_gia_tao_luc         TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Don nhap chua co giai doan, don da chot bat buoc co; don Vat tu khong o buoc chi danh cho Hoan thien.
    CONSTRAINT ck_don_hang_giai_doan CHECK ((trang_thai = 'nhap') = (giai_doan IS NULL)),
    CONSTRAINT ck_don_hang_giai_doan_vat_tu CHECK (hinh_thuc = 'hoan_thien' OR giai_doan IS NULL
        OR giai_doan NOT IN ('boc_khoi_luong', 'thi_cong', 'nghiem_thu'))
);

-- Lich su chuyen giai doan (tu_giai_doan NULL = luc chot don).
CREATE TABLE don_hang_giai_doan_log (
    id              SERIAL PRIMARY KEY,
    don_hang_id     INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
    tu_giai_doan    giai_doan_don_enum,
    den_giai_doan   giai_doan_don_enum NOT NULL,
    nguoi_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    ghi_chu         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE don_hang_hinh_anh (
    id              SERIAL PRIMARY KEY,
    don_hang_id     INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    loai            loai_hinh_anh_enum NOT NULL DEFAULT 'khac',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE don_hang_yeu_cau_sua (
    id              SERIAL PRIMARY KEY,
    don_hang_id     INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
    sale_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    noi_dung        TEXT NOT NULL,
    trang_thai      trang_thai_yeu_cau_sua_enum NOT NULL DEFAULT 'cho_xu_ly',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- MODULE 2 — NHA CUNG CAP & BANG GIA
-- =====================================================================
CREATE TABLE loai_vat_tu (
    id          SERIAL PRIMARY KEY,
    ten         TEXT NOT NULL UNIQUE,
    nguon_goc   nguon_goc_vat_tu_enum NOT NULL
);

CREATE TABLE vat_tu (
    id              SERIAL PRIMARY KEY,
    ten             TEXT NOT NULL,
    loai_vat_tu_id  INTEGER NOT NULL REFERENCES loai_vat_tu(id) ON DELETE RESTRICT,
    don_vi_tinh     TEXT NOT NULL,
    quy_cach        TEXT
);

CREATE TABLE don_hang_vat_tu (
    id              SERIAL PRIMARY KEY,
    don_hang_id     INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
    vat_tu_id       INTEGER NOT NULL REFERENCES vat_tu(id) ON DELETE RESTRICT,
    so_luong_can    NUMERIC(12,2) NOT NULL CHECK (so_luong_can > 0),
    don_gia         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (don_gia >= 0),
    loai_thi_cong   loai_thi_cong_enum,
    dai_mm          INTEGER CHECK (dai_mm > 0),
    rong_mm         INTEGER CHECK (rong_mm > 0),
    ghi_chu         TEXT
);

CREATE TABLE nha_cung_cap (
    id              SERIAL PRIMARY KEY,
    ten             TEXT NOT NULL,
    dia_chi         TEXT,
    ma_so_thue      TEXT,
    trang_thai      trang_thai_hoat_dong_enum NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ncc_stk (
    id              SERIAL PRIMARY KEY,
    ncc_id          INTEGER NOT NULL REFERENCES nha_cung_cap(id) ON DELETE CASCADE,
    so_tk           TEXT NOT NULL,
    ten_ngan_hang   TEXT NOT NULL,
    chu_tk          TEXT NOT NULL
);

CREATE TABLE ncc_bang_gia (
    id                  SERIAL PRIMARY KEY,
    ncc_id              INTEGER NOT NULL REFERENCES nha_cung_cap(id) ON DELETE CASCADE,
    vat_tu_id           INTEGER NOT NULL REFERENCES vat_tu(id) ON DELETE RESTRICT,
    don_gia             NUMERIC(12,2) NOT NULL CHECK (don_gia >= 0),
    ngay_hieu_luc       DATE NOT NULL,
    ngay_het_hieu_luc   DATE,                -- NULL = dang ap dung
    CONSTRAINT ck_bang_gia_khoang_ngay CHECK (ngay_het_hieu_luc IS NULL OR ngay_het_hieu_luc >= ngay_hieu_luc),
    -- Cung NCC + vat tu khong duoc co 2 muc gia chong thoi gian (can extension btree_gist).
    CONSTRAINT ex_bang_gia_khong_chong EXCLUDE USING gist (
        ncc_id WITH =, vat_tu_id WITH =, daterange(ngay_hieu_luc, ngay_het_hieu_luc, '[]') WITH &&)
);

-- =====================================================================
-- MODULE 3 — MUA HANG
-- =====================================================================
CREATE TABLE de_xuat_mua_hang (
    id              SERIAL PRIMARY KEY,
    don_hang_id     INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE RESTRICT,
    ncc_id          INTEGER NOT NULL REFERENCES nha_cung_cap(id) ON DELETE RESTRICT,
    nguoi_tao_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    trang_thai      trang_thai_mua_hang_enum NOT NULL DEFAULT 'cho_duyet',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE de_xuat_mua_hang_ct (
    id                      SERIAL PRIMARY KEY,
    de_xuat_mua_hang_id     INTEGER NOT NULL REFERENCES de_xuat_mua_hang(id) ON DELETE CASCADE,
    vat_tu_id               INTEGER NOT NULL REFERENCES vat_tu(id) ON DELETE RESTRICT,
    so_luong                NUMERIC(12,2) NOT NULL CHECK (so_luong > 0),
    don_gia                 NUMERIC(12,2) NOT NULL CHECK (don_gia >= 0) -- snapshot tai thoi diem mua
);

-- =====================================================================
-- MODULE 4 — THI CONG
-- =====================================================================
CREATE TABLE doi_tho (
    id          SERIAL PRIMARY KEY,
    ten         TEXT NOT NULL,
    sdt         TEXT,
    nang_luc    TEXT,
    trang_thai  trang_thai_hoat_dong_enum NOT NULL DEFAULT 'active'
);

CREATE TABLE thi_cong (
    id                      SERIAL PRIMARY KEY,
    don_hang_id             INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE RESTRICT,
    doi_tho_id              INTEGER NOT NULL REFERENCES doi_tho(id) ON DELETE RESTRICT,
    nguoi_phu_trach_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    ngay_du_kien            DATE,
    ngay_thuc_hien          DATE,
    trang_thai              trang_thai_thi_cong_enum NOT NULL DEFAULT 'lap_lich'
);

CREATE TABLE nghiem_thu (
    id              SERIAL PRIMARY KEY,
    thi_cong_id     INTEGER NOT NULL REFERENCES thi_cong(id) ON DELETE CASCADE,
    ngay_nghiem_thu DATE NOT NULL,
    ket_qua         TEXT NOT NULL,
    ghi_chu         TEXT
);

-- =====================================================================
-- MODULE 5 — CONG NO NCC (tich hop Telegram)
-- =====================================================================
CREATE TABLE de_xuat_chi (
    id                      SERIAL PRIMARY KEY,
    ncc_id                  INTEGER NOT NULL REFERENCES nha_cung_cap(id) ON DELETE RESTRICT,
    nguoi_tao_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    so_tien                 NUMERIC(14,2) NOT NULL CHECK (so_tien > 0),
    trang_thai              trang_thai_de_xuat_chi_enum NOT NULL DEFAULT 'cho_duyet',
    telegram_message_id     TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE de_xuat_chi_muc (
    id                      SERIAL PRIMARY KEY,
    de_xuat_chi_id          INTEGER NOT NULL REFERENCES de_xuat_chi(id) ON DELETE CASCADE,
    de_xuat_mua_hang_id     INTEGER NOT NULL REFERENCES de_xuat_mua_hang(id) ON DELETE RESTRICT,
    UNIQUE (de_xuat_chi_id, de_xuat_mua_hang_id)
);

CREATE TABLE de_xuat_chi_duyet_log (
    id              SERIAL PRIMARY KEY,
    de_xuat_chi_id  INTEGER NOT NULL REFERENCES de_xuat_chi(id) ON DELETE CASCADE,
    telegram_user   TEXT NOT NULL,
    hanh_dong       hanh_dong_duyet_enum NOT NULL,
    thoi_gian       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE phieu_thanh_toan (
    id              SERIAL PRIMARY KEY,
    de_xuat_chi_id  INTEGER NOT NULL REFERENCES de_xuat_chi(id) ON DELETE RESTRICT,
    ma_qr           TEXT,
    so_tien         NUMERIC(14,2) NOT NULL CHECK (so_tien > 0),
    ngay_thanh_toan DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ---------- INDEX cho cac FK hay duoc query/join ----------
CREATE INDEX idx_don_hang_khach_hang ON don_hang(khach_hang_id);
CREATE INDEX idx_don_hang_sale ON don_hang(sale_id);
CREATE INDEX idx_ncc_bang_gia_vat_tu ON ncc_bang_gia(vat_tu_id);
CREATE INDEX idx_ncc_bang_gia_ncc ON ncc_bang_gia(ncc_id);
CREATE UNIQUE INDEX ux_ncc_ma_so_thue ON nha_cung_cap (ma_so_thue) WHERE ma_so_thue IS NOT NULL;
CREATE INDEX idx_ncc_stk_ncc ON ncc_stk (ncc_id);
CREATE INDEX idx_de_xuat_mua_hang_don_hang ON de_xuat_mua_hang(don_hang_id);
CREATE INDEX idx_de_xuat_mua_hang_ncc ON de_xuat_mua_hang(ncc_id);
CREATE INDEX idx_de_xuat_chi_ncc ON de_xuat_chi(ncc_id);
CREATE INDEX idx_thi_cong_don_hang ON thi_cong(don_hang_id);
CREATE INDEX idx_kh_cham_soc_khach ON khach_hang_cham_soc(khach_hang_id);
CREATE INDEX idx_khach_hang_sale ON khach_hang(sale_phu_trach_id);
CREATE INDEX idx_giai_doan_log_don ON don_hang_giai_doan_log(don_hang_id);
CREATE OR REPLACE VIEW v_don_hang_tien AS
SELECT dh.id AS don_hang_id,
       t.tong_vat_tu,
       round(t.tong_vat_tu * dh.chiet_khau_pct / 100) AS tien_chiet_khau,
       round(t.tong_vat_tu * (1 - dh.chiet_khau_pct / 100)) + dh.phi_van_chuyen + dh.phu_thu AS tong_don,
       round(t.tong_vat_tu * (1 - dh.chiet_khau_pct / 100)) + dh.phi_van_chuyen + dh.phu_thu - dh.tien_coc AS con_phai_thu
  FROM don_hang dh
  CROSS JOIN LATERAL (
    SELECT COALESCE(sum(dvt.so_luong_can * dvt.don_gia), 0) AS tong_vat_tu
      FROM don_hang_vat_tu dvt WHERE dvt.don_hang_id = dh.id
  ) t;
