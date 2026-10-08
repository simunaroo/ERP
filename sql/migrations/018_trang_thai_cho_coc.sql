-- Trang thai dong mua moi: NCC yeu cau coc truoc khi xuat hang (cho Ke toan chi coc).
-- ADD VALUE de file rieng: gia tri ENUM moi khong dung duoc trong cung transaction vua them.
ALTER TYPE trang_thai_dong_mua_enum ADD VALUE IF NOT EXISTS 'cho_coc' AFTER 'da_dat_hang';
