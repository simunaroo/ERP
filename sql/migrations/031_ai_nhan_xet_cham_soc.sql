-- Luu lai moi lan AI nhan xet cach cham soc khach (nhat ky tren he thong, xem lai khi can, khong can tai ve may).
-- ket_qua: nguyen ban ket qua da hau kiem (tom_tat, sale[], canh_bao, hanh_dong, kiem_chung);
-- so_lieu: bang so lieu tong hop da gui cho AI -> doi chieu lai ve sau du so lieu goc da thay doi.
CREATE TABLE ai_nhan_xet_cham_soc (
    id           SERIAL PRIMARY KEY,
    tu_ngay      DATE NOT NULL,
    den_ngay     DATE NOT NULL,
    ket_qua      JSONB NOT NULL,
    so_lieu      JSONB NOT NULL,
    nguoi_tao_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_ai_nx_ky CHECK (tu_ngay <= den_ngay)
);
CREATE INDEX idx_ai_nx_cs_thoi_gian ON ai_nhan_xet_cham_soc(created_at DESC);
