-- Xac thuc 2 lop (TOTP) — bat buoc cho Admin va Ke toan (nguoi duyet va chi tien).
ALTER TABLE users
    ADD COLUMN totp_khoa        TEXT,          -- khoa TOTP da ma hoa AES-256-GCM (NULL = chua bat 2FA)
    ADD COLUMN totp_bat_luc     TIMESTAMPTZ,
    ADD COLUMN totp_buoc_cuoi   BIGINT,        -- buoc thoi gian cua ma vua dung: chong dung lai 1 ma 2 lan
    ADD COLUMN totp_ma_du_phong TEXT[];        -- hash bcrypt cua ma du phong (dung 1 lan khi mat dien thoai)
ALTER TABLE users ADD CONSTRAINT ck_users_totp CHECK ((totp_khoa IS NULL) = (totp_bat_luc IS NULL));

-- Nhat ky: che khoa TOTP / ma du phong nhu mat khau; bo qua cap nhat chi doi totp_buoc_cuoi (moi lan dang nhap) cho do nhieu.
CREATE OR REPLACE FUNCTION fn_ghi_nhat_ky() RETURNS trigger AS $$
DECLARE
  cu  jsonb;
  moi jsonb;
  dong jsonb;
  k   text;
BEGIN
  IF current_setting('app.bo_qua_nhat_ky', true) = '1' THEN RETURN NULL; END IF;
  IF TG_OP = 'INSERT' THEN
    moi := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    cu := to_jsonb(OLD);
  ELSE
    SELECT jsonb_object_agg(o.key, o.value) INTO cu
      FROM jsonb_each(to_jsonb(OLD)) o WHERE o.value IS DISTINCT FROM to_jsonb(NEW) -> o.key AND o.key <> 'totp_buoc_cuoi';
    SELECT jsonb_object_agg(n.key, n.value) INTO moi
      FROM jsonb_each(to_jsonb(NEW)) n WHERE n.value IS DISTINCT FROM to_jsonb(OLD) -> n.key AND n.key <> 'totp_buoc_cuoi';
    IF moi IS NULL THEN RETURN NULL; END IF;
  END IF;
  FOREACH k IN ARRAY ARRAY['password_hash', 'totp_khoa', 'totp_ma_du_phong', 'totp_buoc_cuoi'] LOOP
    IF cu ? k AND cu -> k <> 'null'::jsonb THEN cu := jsonb_set(cu, ARRAY[k], '"***"'); END IF;
    IF moi ? k AND moi -> k <> 'null'::jsonb THEN moi := jsonb_set(moi, ARRAY[k], '"***"'); END IF;
  END LOOP;
  dong := COALESCE(to_jsonb(NEW), to_jsonb(OLD));
  INSERT INTO nhat_ky_thay_doi (bang, ban_ghi, hanh_dong, du_lieu_cu, du_lieu_moi, nguoi_id, kenh)
  VALUES (TG_TABLE_NAME,
          COALESCE(dong ->> 'id', dong ->> 'sale_id', dong ->> 'khoa', (dong ->> 'vai_tro') || ':' || (dong ->> 'ma_quyen')),
          TG_OP, cu, moi,
          NULLIF(current_setting('app.user_id', true), '')::int, NULLIF(current_setting('app.kenh', true), ''));
  RETURN NULL;
END $$ LANGUAGE plpgsql;
