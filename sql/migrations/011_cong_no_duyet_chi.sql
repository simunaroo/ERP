-- Module Cong no NCC & duyet chi qua Telegram.
-- Chay lai nhieu lan van an toan.

ALTER TABLE de_xuat_chi
  ADD COLUMN IF NOT EXISTS ghi_chu TEXT,
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;      -- de sua lai tin nhan sau khi duyet

ALTER TABLE de_xuat_chi_duyet_log
  ADD COLUMN IF NOT EXISTS nguoi_id INTEGER REFERENCES users(id) ON DELETE RESTRICT, -- duyet tren web
  ADD COLUMN IF NOT EXISTS ghi_chu TEXT;

ALTER TABLE phieu_thanh_toan
  ADD COLUMN IF NOT EXISTS nguoi_tao_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS noi_dung_ck TEXT;

-- Moi de xuat chi chi thanh toan 1 lan.
CREATE UNIQUE INDEX IF NOT EXISTS ux_phieu_tt_de_xuat_chi ON phieu_thanh_toan (de_xuat_chi_id);
CREATE INDEX IF NOT EXISTS idx_dxc_muc_dxm ON de_xuat_chi_muc (de_xuat_mua_hang_id);

-- Mot de xuat mua chi duoc nam trong MOT de xuat chi con hieu luc (khong bi tu choi) -> tranh tra tien 2 lan.
-- CHECK khong tham chieu duoc bang khac nen dung TRIGGER. Luu y: trigger khong thay du lieu chua commit
-- cua giao dich khac -> service van phai khoa dong (SELECT ... FOR UPDATE) khi lap de xuat chi.
CREATE OR REPLACE FUNCTION fn_chan_dxm_trung_de_xuat_chi() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM de_xuat_chi_muc m JOIN de_xuat_chi c ON c.id = m.de_xuat_chi_id
     WHERE m.de_xuat_mua_hang_id = NEW.de_xuat_mua_hang_id
       AND m.de_xuat_chi_id <> NEW.de_xuat_chi_id
       AND c.trang_thai <> 'tu_choi'
  ) THEN
    RAISE EXCEPTION 'De xuat mua % da nam trong mot de xuat chi khac', NEW.de_xuat_mua_hang_id
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_chan_dxm_trung ON de_xuat_chi_muc;
CREATE TRIGGER tg_chan_dxm_trung BEFORE INSERT OR UPDATE ON de_xuat_chi_muc
  FOR EACH ROW EXECUTE FUNCTION fn_chan_dxm_trung_de_xuat_chi();
