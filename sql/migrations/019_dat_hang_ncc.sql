-- Don dat hang gui NCC (theo tung NCC trong 1 don): noi dung gui di, phan hoi cua NCC (cho xuat hang / yeu cau coc),
-- de xuat coc sinh ra, tin nhan Telegram trong nhom NCC. Chay lai nhieu lan van an toan.

CREATE TABLE IF NOT EXISTS dat_hang_ncc (
    id                      SERIAL PRIMARY KEY,
    don_hang_id             INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
    ncc_id                  INTEGER NOT NULL REFERENCES nha_cung_cap(id) ON DELETE RESTRICT,
    nguoi_dat_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    noi_dung                TEXT NOT NULL,                       -- van ban gui NCC (chep gui Zalo/email hoac Telegram)
    tong_tien               NUMERIC(14,2) NOT NULL DEFAULT 0,    -- tien hang gom VAT luc dat
    -- cho_phan_hoi -> xuat_hang (NCC cho xuat) | cho_coc (NCC doi coc) -> xuat_hang (khi coc da chi); huy bat cu luc nao truoc khi coc da duyet
    trang_thai              VARCHAR(20) NOT NULL DEFAULT 'cho_phan_hoi'
                            CHECK (trang_thai IN ('cho_phan_hoi', 'cho_coc', 'xuat_hang', 'huy')),
    so_tien_coc             NUMERIC(14,2) CHECK (so_tien_coc > 0),
    de_xuat_chi_id          INTEGER REFERENCES de_xuat_chi(id) ON DELETE SET NULL,  -- de xuat coc sinh tu yeu cau cua NCC
    phan_hoi_qua            VARCHAR(10) CHECK (phan_hoi_qua IN ('web', 'telegram')),
    nguoi_phan_hoi          TEXT,                                -- ten nguoi ghi nhan tren web / @username Telegram
    phan_hoi_luc            TIMESTAMPTZ,
    tg_chat_id              TEXT,
    tg_message_id           TEXT,
    tg_hoi_coc_message_id   TEXT,                                -- tin "nhap so tien coc" (NCC tra loi tin nay)
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_dhn_coc CHECK (trang_thai <> 'cho_coc' OR so_tien_coc IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_dat_hang_ncc_don ON dat_hang_ncc (don_hang_id);
CREATE INDEX IF NOT EXISTS idx_dat_hang_ncc_dxc ON dat_hang_ncc (de_xuat_chi_id);

-- Dong mua thuoc don dat hang nao (de khi coc da chi biet chuyen dong nao sang san hang).
ALTER TABLE mua_hang_dong ADD COLUMN IF NOT EXISTS dat_hang_ncc_id INTEGER REFERENCES dat_hang_ncc(id) ON DELETE SET NULL;
