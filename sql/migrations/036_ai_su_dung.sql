-- Ghi nhan moi lan goi Gemini: so token (vao / cache / ra / suy nghi) lay tu usageMetadata cua Google tra ve,
-- de Admin theo doi muc su dung va uoc tinh chi phi ngay trong he thong (API key khong doc duoc bao cao su dung cua Google).
CREATE TABLE ai_su_dung (
    id              BIGSERIAL PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    chuc_nang       VARCHAR(30) NOT NULL,       -- tro_ly_hoi, tro_ly_doc_tai_lieu, cham_soc_nhan_xet, phan_tich_ncc...
    model           VARCHAR(60) NOT NULL,
    nguoi_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    thanh_cong      BOOLEAN NOT NULL,
    ma_loi          SMALLINT,                   -- HTTP status khi loi (429 vuot gioi han, 503 qua tai...)
    token_vao       INTEGER NOT NULL DEFAULT 0, -- promptTokenCount (da gom phan duoc cache)
    token_cache     INTEGER NOT NULL DEFAULT 0, -- cachedContentTokenCount (tinh ~10% gia)
    token_ra        INTEGER NOT NULL DEFAULT 0, -- candidatesTokenCount
    token_suy_nghi  INTEGER NOT NULL DEFAULT 0, -- thoughtsTokenCount (tinh gia nhu token ra)
    thoi_gian_ms    INTEGER
);
CREATE INDEX idx_ai_su_dung_thoi_gian ON ai_su_dung(created_at DESC);
