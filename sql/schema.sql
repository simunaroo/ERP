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
-- Trang thai TUNG DONG vat tu mua ngoai (da_lay_hang, da_giao_hang do he thong dat khi don di giao).
CREATE TYPE trang_thai_dong_mua_enum AS ENUM ('cho_xu_ly', 'dang_hoi', 'da_dat_hang', 'cho_coc', 'san_hang', 'da_lay_hang', 'da_giao_hang', 'huy');
CREATE TYPE loai_phat_sinh_mbs_enum AS ENUM ('hang_hong', 'giao_thieu_sai', 'boc_khoi_luong_thieu', 'tho_lam_hong', 'khach_bo_sung', 'mat_hang', 'khac');
CREATE TYPE nguon_trach_nhiem_enum AS ENUM ('ncc', 'van_chuyen', 'tho', 'khao_sat', 'sale', 'khach_hang', 'cong_ty', 'chua_xac_dinh');
CREATE TYPE trang_thai_mbs_enum AS ENUM ('cho_xu_ly', 'da_mua', 'huy');
CREATE TYPE loai_chi_enum AS ENUM ('coc', 'quyet_toan', 'chi_bo_sung', 'tra_cong', 'ung_cong');
CREATE TYPE loai_phat_sinh_tc_enum AS ENUM ('phat_sinh', 'phu_thu', 'giam_tru', 'thu_ho');
CREATE TYPE loai_giao_dich_tho_enum AS ENUM ('phai_tra', 'da_tra', 'tam_ung', 'thu_ho');
CREATE TYPE trang_thai_thi_cong_enum AS ENUM ('lap_lich', 'dang_thi_cong', 'da_nghiem_thu');
CREATE TYPE trang_thai_de_xuat_chi_enum AS ENUM ('cho_duyet', 'da_duyet', 'tu_choi', 'da_thanh_toan', 'thu_hoi');
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
    phien_ban_token INTEGER NOT NULL DEFAULT 0,  -- tang khi khoa/doi vai tro/doi mat khau -> token cu het hieu luc
    doi_mat_khau_luc TIMESTAMPTZ,
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
    nghiem_thu_luc          TIMESTAMPTZ,         -- Van hanh xac nhan nghiem thu (da nhap SL thuc te)
    nguoi_nghiem_thu_id     INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    gia_tri_quyet_toan      NUMERIC(14,2),       -- chot khi quyet toan; NULL = tinh tu dong vat tu
    quyet_toan_luc          TIMESTAMPTZ,
    nguoi_quyet_toan_id     INTEGER REFERENCES users(id) ON DELETE RESTRICT,
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

-- Lich su phan cong Van hanh phu trach don (tu dong luc chot / Admin chuyen).
CREATE TABLE don_hang_phan_cong_log (
    id              SERIAL PRIMARY KEY,
    don_hang_id     INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
    tu_van_hanh_id  INTEGER REFERENCES users(id) ON DELETE RESTRICT,   -- NULL = phan lan dau
    den_van_hanh_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    nguoi_id        INTEGER REFERENCES users(id) ON DELETE RESTRICT,   -- NULL = he thong tu phan
    ly_do           TEXT,
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
    quy_cach        TEXT,
    trang_thai      trang_thai_hoat_dong_enum NOT NULL DEFAULT 'active'  -- ngung kinh doanh = an, khong xoa
);
CREATE UNIQUE INDEX ux_vat_tu_ten ON vat_tu (lower(trim(ten)));

CREATE TABLE don_hang_vat_tu (
    id              SERIAL PRIMARY KEY,
    don_hang_id     INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
    vat_tu_id       INTEGER NOT NULL REFERENCES vat_tu(id) ON DELETE RESTRICT,
    so_luong_can    NUMERIC(12,2) NOT NULL CHECK (so_luong_can > 0),
    don_gia         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (don_gia >= 0),
    loai_thi_cong   loai_thi_cong_enum,
    dai_mm          INTEGER CHECK (dai_mm > 0),
    rong_mm         INTEGER CHECK (rong_mm > 0),
    so_luong_thuc_te NUMERIC(12,2) CHECK (so_luong_thuc_te >= 0), -- nhap khi nghiem thu
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
-- MODULE 3 — MUA HANG (theo tung dong vat tu, giong ERP)
-- =====================================================================
-- Moi dong vat tu MUA NGOAI cua don co 1 dong mua: NCC, gia chot, VAT, trang thai rieng.
CREATE TABLE mua_hang_dong (
    id                  SERIAL PRIMARY KEY,
    don_hang_vat_tu_id  INTEGER NOT NULL UNIQUE REFERENCES don_hang_vat_tu(id) ON DELETE CASCADE,
    ncc_id              INTEGER REFERENCES nha_cung_cap(id) ON DELETE RESTRICT,
    gia_chot            NUMERIC(14,2) CHECK (gia_chot >= 0),   -- chup lai luc chon NCC
    vat_pct             NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (vat_pct BETWEEN 0 AND 20),
    trang_thai          trang_thai_dong_mua_enum NOT NULL DEFAULT 'cho_xu_ly',
    ghi_chu             TEXT,
    nguoi_cap_nhat_id   INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    cap_nhat_luc        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Tu "da dat hang" tro di bat buoc da chon NCC va chot gia.
    CONSTRAINT ck_mhd_da_dat_co_ncc CHECK (trang_thai IN ('cho_xu_ly', 'dang_hoi', 'huy') OR (ncc_id IS NOT NULL AND gia_chot IS NOT NULL))
);

-- Mua bo sung (hang hong, giao thieu, boc khoi luong thieu...): ghi ro ben nao chiu bao nhieu tien.
CREATE TABLE mua_bo_sung (
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

CREATE TABLE mua_bo_sung_dong (
    id              SERIAL PRIMARY KEY,
    mua_bo_sung_id  INTEGER NOT NULL REFERENCES mua_bo_sung(id) ON DELETE CASCADE,
    vat_tu_id       INTEGER NOT NULL REFERENCES vat_tu(id) ON DELETE RESTRICT,
    so_luong        NUMERIC(12,2) NOT NULL CHECK (so_luong > 0),
    don_gia         NUMERIC(14,2) CHECK (don_gia >= 0)
);

CREATE TABLE mua_bo_sung_trach_nhiem (
    id              SERIAL PRIMARY KEY,
    mua_bo_sung_id  INTEGER NOT NULL REFERENCES mua_bo_sung(id) ON DELETE CASCADE,
    nguon           nguon_trach_nhiem_enum NOT NULL,
    so_tien         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (so_tien >= 0),
    UNIQUE (mua_bo_sung_id, nguon)
);

-- =====================================================================
-- MODULE 4 — THI CONG (giai doan + cong tho), NGHIEM THU, QUYET TOAN
-- =====================================================================
CREATE TABLE doi_tho (
    id              SERIAL PRIMARY KEY,
    ten             TEXT NOT NULL,
    sdt             TEXT,
    nang_luc        TEXT,
    so_tk           TEXT,                -- de tao QR tra cong
    ten_ngan_hang   TEXT,
    chu_tk          TEXT,
    trang_thai      trang_thai_hoat_dong_enum NOT NULL DEFAULT 'active'
);

-- Moi dong = 1 GIAI DOAN thi cong cua don, do 1 doi tho lam; tien cong = gia_cong x kl_thuc_te.
CREATE TABLE thi_cong (
    id                      SERIAL PRIMARY KEY,
    don_hang_id             INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE RESTRICT,
    doi_tho_id              INTEGER NOT NULL REFERENCES doi_tho(id) ON DELETE RESTRICT,
    nguoi_phu_trach_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    ten_giai_doan           TEXT NOT NULL DEFAULT 'Thi công',
    don_vi_cong             TEXT NOT NULL DEFAULT 'm²',
    gia_cong                NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gia_cong >= 0),
    kl_du_kien              NUMERIC(12,2) CHECK (kl_du_kien >= 0),
    kl_thuc_te              NUMERIC(12,2) CHECK (kl_thuc_te >= 0),  -- nhap khi nghiem thu
    ngay_du_kien            DATE,
    ngay_thuc_hien          DATE,                -- ngay bat dau thi cong
    ngay_hoan_thanh         DATE,                -- ngay bao xong
    ghi_chu                 TEXT,
    trang_thai              trang_thai_thi_cong_enum NOT NULL DEFAULT 'lap_lich',
    CONSTRAINT ck_thi_cong_moc CHECK (
        (trang_thai = 'lap_lich' AND ngay_thuc_hien IS NULL AND ngay_hoan_thanh IS NULL)
        OR (trang_thai = 'dang_thi_cong' AND ngay_thuc_hien IS NOT NULL)
        OR (trang_thai = 'da_nghiem_thu' AND ngay_hoan_thanh IS NOT NULL))
);

-- Phat sinh tien khi thi cong: phat_sinh/phu_thu cong them, giam_tru tru di, thu_ho = tho thu tien khach.
CREATE TABLE phat_sinh_thi_cong (
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

-- =====================================================================
-- MODULE 5 — DE XUAT CHI & CONG NO (NCC + THO, duyet qua Telegram)
-- =====================================================================
-- 1 de xuat = 1 don x 1 NCC (coc | quyet_toan | chi_bo_sung) HOAC 1 doi tho (tra_cong | ung_cong).
-- Cong no NCC = gia_tri_hang cua de xuat quyet toan/bo sung DA DUYET - so tien da chi.
CREATE TABLE de_xuat_chi (
    id                      SERIAL PRIMARY KEY,
    loai_chi                loai_chi_enum NOT NULL DEFAULT 'quyet_toan',
    ncc_id                  INTEGER REFERENCES nha_cung_cap(id) ON DELETE RESTRICT,
    doi_tho_id              INTEGER REFERENCES doi_tho(id) ON DELETE RESTRICT,
    don_hang_id             INTEGER REFERENCES don_hang(id) ON DELETE RESTRICT,
    mua_bo_sung_id          INTEGER REFERENCES mua_bo_sung(id) ON DELETE RESTRICT,
    nguoi_tao_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    gia_tri_hang            NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gia_tri_hang >= 0), -- tien hang + VAT (quyet toan)
    coc_da_tru              NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (coc_da_tru >= 0),
    so_tien                 NUMERIC(14,2) NOT NULL CONSTRAINT ck_dxc_so_tien CHECK (so_tien >= 0),
    trang_thai              trang_thai_de_xuat_chi_enum NOT NULL DEFAULT 'cho_duyet',
    noi_dung_ck             TEXT,
    ly_do_tu_choi           TEXT,
    ghi_chu                 TEXT,
    telegram_message_id     TEXT,
    telegram_chat_id        TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_dxc_doi_tuong CHECK (
        (loai_chi IN ('coc', 'quyet_toan', 'chi_bo_sung') AND ncc_id IS NOT NULL AND doi_tho_id IS NULL)
        OR (loai_chi IN ('tra_cong', 'ung_cong') AND doi_tho_id IS NOT NULL AND ncc_id IS NULL))
);

-- Dong hang trong de xuat QUYET TOAN: gia, VAT chup lai -> so lieu dong bang luc de xuat.
CREATE TABLE de_xuat_chi_dong (
    id                  SERIAL PRIMARY KEY,
    de_xuat_chi_id      INTEGER NOT NULL REFERENCES de_xuat_chi(id) ON DELETE CASCADE,
    mua_hang_dong_id    INTEGER NOT NULL REFERENCES mua_hang_dong(id) ON DELETE RESTRICT,
    so_luong            NUMERIC(12,2) NOT NULL CHECK (so_luong > 0),
    don_gia             NUMERIC(14,2) NOT NULL CHECK (don_gia >= 0),
    vat_pct             NUMERIC(5,2) NOT NULL DEFAULT 0,
    thanh_tien          NUMERIC(14,2) NOT NULL,
    UNIQUE (de_xuat_chi_id, mua_hang_dong_id)
);

CREATE TABLE de_xuat_chi_duyet_log (
    id              SERIAL PRIMARY KEY,
    de_xuat_chi_id  INTEGER NOT NULL REFERENCES de_xuat_chi(id) ON DELETE CASCADE,
    telegram_user   TEXT NOT NULL,           -- '@username' (Telegram) hoac 'web:<ho ten>'
    nguoi_id        INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    hanh_dong       hanh_dong_duyet_enum NOT NULL,
    ghi_chu         TEXT,
    thoi_gian       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Da chi": bat buoc anh bill/UNC; moi de xuat chi 1 phieu.
CREATE TABLE phieu_thanh_toan (
    id              SERIAL PRIMARY KEY,
    de_xuat_chi_id  INTEGER NOT NULL REFERENCES de_xuat_chi(id) ON DELETE RESTRICT,
    ma_qr           TEXT,
    so_tien         NUMERIC(14,2) NOT NULL CHECK (so_tien > 0),
    ngay_thanh_toan DATE NOT NULL DEFAULT CURRENT_DATE,
    nguoi_tao_id    INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    noi_dung_ck     TEXT,
    bill_anh        TEXT
);
CREATE UNIQUE INDEX ux_phieu_tt_de_xuat_chi ON phieu_thanh_toan (de_xuat_chi_id);

-- So giao dich voi tho (cong no tho). Con phai tra tho = phai_tra - da_tra - tam_ung - thu_ho.
CREATE TABLE giao_dich_tho (
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
-- Moi giai doan chi phat sinh 1 khoan "phai tra" (luc quyet toan).
CREATE UNIQUE INDEX ux_gdt_phai_tra ON giao_dich_tho (thi_cong_id) WHERE loai = 'phai_tra';

-- ---------- INDEX cho cac FK hay duoc query/join ----------
CREATE INDEX idx_don_hang_khach_hang ON don_hang(khach_hang_id);
CREATE INDEX idx_don_hang_sale ON don_hang(sale_id);
CREATE INDEX idx_don_hang_van_hanh ON don_hang (vanhanh_phu_trach_id);
CREATE INDEX idx_phan_cong_don ON don_hang_phan_cong_log (don_hang_id);
CREATE INDEX idx_ncc_bang_gia_vat_tu ON ncc_bang_gia(vat_tu_id);
CREATE INDEX idx_ncc_bang_gia_ncc ON ncc_bang_gia(ncc_id);
CREATE UNIQUE INDEX ux_ncc_ma_so_thue ON nha_cung_cap (ma_so_thue) WHERE ma_so_thue IS NOT NULL;
CREATE INDEX idx_ncc_stk_ncc ON ncc_stk (ncc_id);
CREATE INDEX idx_mhd_ncc ON mua_hang_dong (ncc_id);
CREATE INDEX idx_thi_cong_don_hang ON thi_cong(don_hang_id);
CREATE INDEX idx_thi_cong_lich ON thi_cong (doi_tho_id, ngay_du_kien);
CREATE INDEX idx_ps_tc_don ON phat_sinh_thi_cong (don_hang_id);
CREATE INDEX idx_dxc_don ON de_xuat_chi (don_hang_id);
CREATE INDEX idx_dxc_tho ON de_xuat_chi (doi_tho_id);
CREATE INDEX idx_de_xuat_chi_ncc ON de_xuat_chi(ncc_id);
CREATE INDEX idx_dxc_dong_mhd ON de_xuat_chi_dong (mua_hang_dong_id);
CREATE INDEX idx_gdt_tho ON giao_dich_tho (doi_tho_id);
CREATE INDEX idx_kh_cham_soc_khach ON khach_hang_cham_soc(khach_hang_id);
CREATE INDEX idx_khach_hang_sale ON khach_hang(sale_phu_trach_id);
CREATE INDEX idx_giai_doan_log_don ON don_hang_giai_doan_log(don_hang_id);

-- ---------- Nguon tinh tien DUY NHAT cua don hang ----------
-- Theo SL thuc te (neu da nghiem thu) + phat sinh thi cong; da chot quyet toan thi lay gia tri chot.
CREATE VIEW v_don_hang_tien AS
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

-- ---------- Mot dong hang chi nam trong MOT de xuat quyet toan con hieu luc ----------
-- CHECK khong tham chieu duoc bang khac -> TRIGGER; service van khoa dong (FOR UPDATE) vi trigger
-- khong thay du lieu chua commit cua giao dich khac.
CREATE FUNCTION fn_chan_dong_trung_quyet_toan() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM de_xuat_chi_dong d JOIN de_xuat_chi c ON c.id = d.de_xuat_chi_id
     WHERE d.mua_hang_dong_id = NEW.mua_hang_dong_id AND d.de_xuat_chi_id <> NEW.de_xuat_chi_id AND c.trang_thai <> 'thu_hoi'
  ) THEN
    RAISE EXCEPTION 'Dong hang % da nam trong mot de xuat quyet toan khac', NEW.mua_hang_dong_id USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER tg_chan_dong_trung_qt BEFORE INSERT OR UPDATE ON de_xuat_chi_dong
  FOR EACH ROW EXECUTE FUNCTION fn_chan_dong_trung_quyet_toan();


-- Thong bao trong he thong (chuong): ghi cung transaction voi thao tac goc.
CREATE TABLE thong_bao (
    id              BIGSERIAL PRIMARY KEY,
    nguoi_nhan_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nguoi_gay_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    loai            VARCHAR(40) NOT NULL,
    tieu_de         TEXT NOT NULL,
    noi_dung        TEXT,
    link            TEXT,
    da_doc_luc      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_thong_bao_nguoi ON thong_bao (nguoi_nhan_id, created_at DESC);
CREATE INDEX idx_thong_bao_chua_doc ON thong_bao (nguoi_nhan_id) WHERE da_doc_luc IS NULL;

-- Don dat hang gui NCC: noi dung gui di, phan hoi NCC (cho xuat hang / yeu cau coc), de xuat coc, tin Telegram nhom NCC.
CREATE TABLE dat_hang_ncc (
    id                      SERIAL PRIMARY KEY,
    don_hang_id             INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
    ncc_id                  INTEGER NOT NULL REFERENCES nha_cung_cap(id) ON DELETE RESTRICT,
    nguoi_dat_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    noi_dung                TEXT NOT NULL,
    tong_tien               NUMERIC(14,2) NOT NULL DEFAULT 0,
    trang_thai              VARCHAR(20) NOT NULL DEFAULT 'cho_phan_hoi'
                            CHECK (trang_thai IN ('cho_phan_hoi', 'cho_coc', 'xuat_hang', 'huy')),
    so_tien_coc             NUMERIC(14,2) CHECK (so_tien_coc > 0),
    de_xuat_chi_id          INTEGER REFERENCES de_xuat_chi(id) ON DELETE SET NULL,
    phan_hoi_qua            VARCHAR(10) CHECK (phan_hoi_qua IN ('web', 'telegram')),
    nguoi_phan_hoi          TEXT,
    phan_hoi_luc            TIMESTAMPTZ,
    tg_chat_id              TEXT,
    tg_message_id           TEXT,
    tg_hoi_coc_message_id   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_dhn_coc CHECK (trang_thai <> 'cho_coc' OR so_tien_coc IS NOT NULL)
);
CREATE INDEX idx_dat_hang_ncc_don ON dat_hang_ncc (don_hang_id);
CREATE INDEX idx_dat_hang_ncc_dxc ON dat_hang_ncc (de_xuat_chi_id);
ALTER TABLE mua_hang_dong ADD COLUMN dat_hang_ncc_id INTEGER REFERENCES dat_hang_ncc(id) ON DELETE SET NULL;

-- Gan Telegram voi nguoi dung (duyet/chi trong nhom Telegram ghi dung nguoi); tin "gui anh bill" cua bot.
ALTER TABLE users ADD COLUMN telegram_username TEXT;
CREATE UNIQUE INDEX ux_users_telegram ON users (lower(telegram_username)) WHERE telegram_username IS NOT NULL;
ALTER TABLE de_xuat_chi ADD COLUMN tg_hoi_bill_message_id TEXT;
