-- Nhat ky kiem toan (audit log): moi INSERT/UPDATE/DELETE tren cac bang nghiep vu quan trong duoc trigger ghi lai.
-- Ai sua: backend dat bien phien app.user_id / app.kenh (set_config(..., true) = chi trong transaction hien tai).
-- UPDATE chi luu cac cot THUC SU doi (cu -> moi); UPDATE khong doi gi thi bo qua. Mat khau khong bao gio luu.
-- Script sinh du lieu hang loat dat app.bo_qua_nhat_ky = '1' de khong ghi.
CREATE TABLE nhat_ky_thay_doi (
    id          BIGSERIAL PRIMARY KEY,
    bang        VARCHAR(40) NOT NULL,
    ban_ghi     TEXT,                     -- khoa chinh cua dong (id / sale_id / khoa)
    hanh_dong   VARCHAR(6) NOT NULL CHECK (hanh_dong IN ('INSERT', 'UPDATE', 'DELETE')),
    du_lieu_cu  JSONB,
    du_lieu_moi JSONB,
    nguoi_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    kenh        VARCHAR(20),              -- web / telegram / api; NULL = he thong / script
    thoi_gian   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nhat_ky_ban_ghi ON nhat_ky_thay_doi(bang, ban_ghi, thoi_gian DESC);
CREATE INDEX idx_nhat_ky_thoi_gian ON nhat_ky_thay_doi(thoi_gian DESC);
CREATE INDEX idx_nhat_ky_nguoi ON nhat_ky_thay_doi(nguoi_id, thoi_gian DESC);

CREATE FUNCTION fn_ghi_nhat_ky() RETURNS trigger AS $$
DECLARE
  cu  jsonb;
  moi jsonb;
  dong jsonb;
BEGIN
  IF current_setting('app.bo_qua_nhat_ky', true) = '1' THEN RETURN NULL; END IF;
  IF TG_OP = 'INSERT' THEN
    moi := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    cu := to_jsonb(OLD);
  ELSE
    SELECT jsonb_object_agg(o.key, o.value) INTO cu
      FROM jsonb_each(to_jsonb(OLD)) o WHERE o.value IS DISTINCT FROM to_jsonb(NEW) -> o.key;
    SELECT jsonb_object_agg(n.key, n.value) INTO moi
      FROM jsonb_each(to_jsonb(NEW)) n WHERE n.value IS DISTINCT FROM to_jsonb(OLD) -> n.key;
    IF moi IS NULL THEN RETURN NULL; END IF;
  END IF;
  -- Che mat khau: chi ghi nhan "co doi", khong luu hash.
  IF cu ? 'password_hash' THEN cu := jsonb_set(cu, '{password_hash}', '"***"'); END IF;
  IF moi ? 'password_hash' THEN moi := jsonb_set(moi, '{password_hash}', '"***"'); END IF;
  dong := COALESCE(to_jsonb(NEW), to_jsonb(OLD));
  INSERT INTO nhat_ky_thay_doi (bang, ban_ghi, hanh_dong, du_lieu_cu, du_lieu_moi, nguoi_id, kenh)
  VALUES (TG_TABLE_NAME, COALESCE(dong ->> 'id', dong ->> 'sale_id', dong ->> 'khoa'), TG_OP, cu, moi,
          NULLIF(current_setting('app.user_id', true), '')::int, NULLIF(current_setting('app.kenh', true), ''));
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON don_hang FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON don_hang_vat_tu FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON khach_hang FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON mua_hang_dong FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON de_xuat_chi FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON thanh_toan_khach FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON thi_cong FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON phat_sinh_thi_cong FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON ncc_bang_gia FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON vat_tu FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON nha_cung_cap FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON cau_hinh FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON ty_le_chia_so FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
