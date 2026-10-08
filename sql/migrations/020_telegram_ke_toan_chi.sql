-- Ke toan xac nhan "da chi" ngay trong nhom Telegram duyet chi (gui anh bill tra loi tin cua bot).
-- Gan tai khoan Telegram voi nguoi dung ERP de biet AI chi (phieu chi, thong bao, nhat ky). Chay lai nhieu lan van an toan.
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_telegram ON users (lower(telegram_username)) WHERE telegram_username IS NOT NULL;

-- Tin "gui anh bill" cua bot (Ke toan tra loi dung tin nay).
ALTER TABLE de_xuat_chi ADD COLUMN IF NOT EXISTS tg_hoi_bill_message_id TEXT;
