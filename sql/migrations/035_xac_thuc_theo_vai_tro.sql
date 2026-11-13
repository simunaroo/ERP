-- Bat/tat xac thuc 2 lop (TOTP) theo vai tro, Admin chinh tren giao dien (truoc day co dinh trong code: Admin + Ke toan).
-- bat_2fa = true : moi tai khoan vai tro do phai nhap ma khi dang nhap (chua cai -> bat quet QR).
-- bat_2fa = false: dang nhap chi can mat khau; khoa da cai van giu (bat lai khong phai quet QR lai).
CREATE TABLE xac_thuc_vai_tro (
    id                  SERIAL PRIMARY KEY,           -- id rieng de trigger nhat ky ghi duoc ban_ghi
    vai_tro             vai_tro_enum NOT NULL UNIQUE,
    bat_2fa             BOOLEAN NOT NULL DEFAULT false,
    nguoi_cap_nhat_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    cap_nhat_luc        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON xac_thuc_vai_tro FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();

SET LOCAL app.bo_qua_nhat_ky = '1';
-- Giu nguyen hanh vi cu: Admin, Ke toan bat; Sale, Van hanh tat.
INSERT INTO xac_thuc_vai_tro (vai_tro, bat_2fa) VALUES ('admin', true), ('ke_toan', true), ('sale', false), ('van_hanh', false);
