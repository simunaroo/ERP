-- Thong bao trong he thong: thao tac xong -> nguoi lien quan nhan thong bao (chuong o thanh tren cung).
-- Ghi CUNG transaction voi thao tac goc: thao tac rollback thi thong bao cung khong ton tai.
-- Chay lai nhieu lan van an toan.

CREATE TABLE IF NOT EXISTS thong_bao (
    id              BIGSERIAL PRIMARY KEY,
    nguoi_nhan_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nguoi_gay_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- NULL = he thong / Telegram
    loai            VARCHAR(40) NOT NULL,                              -- vd: de_xuat_moi, de_xuat_duyet, giao_don...
    tieu_de         TEXT NOT NULL,
    noi_dung        TEXT,
    link            TEXT,                                              -- duong dan trong app de bam vao xu ly
    da_doc_luc      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Truy van chinh: thong bao moi nhat / dem chua doc cua 1 nguoi.
CREATE INDEX IF NOT EXISTS idx_thong_bao_nguoi ON thong_bao (nguoi_nhan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thong_bao_chua_doc ON thong_bao (nguoi_nhan_id) WHERE da_doc_luc IS NULL;
