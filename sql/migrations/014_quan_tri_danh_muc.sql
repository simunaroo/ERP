-- Quan tri nguoi dung + danh muc vat tu.
-- (1) phien_ban_token: tang moi khi khoa / doi vai tro / doi hoac dat lai mat khau. Middleware so voi so trong JWT
--     -> token cu het hieu luc NGAY (JWT von khong thu hoi duoc truoc khi het han).
-- (2) Vat tu ngung kinh doanh: an khoi form tao don / bang gia moi, don cu van giu (xoa mem).
-- Chay lai nhieu lan van an toan.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phien_ban_token INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS doi_mat_khau_luc TIMESTAMPTZ;

ALTER TABLE vat_tu ADD COLUMN IF NOT EXISTS trang_thai trang_thai_hoat_dong_enum NOT NULL DEFAULT 'active';
-- Ten vat tu khong trung (khong phan biet hoa thuong, bo khoang trang dau cuoi).
CREATE UNIQUE INDEX IF NOT EXISTS ux_vat_tu_ten ON vat_tu (lower(trim(ten)));
