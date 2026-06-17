-- Supabase SQL Editor에서 1회 실행
-- 농업인 수정/삭제를 단일 트랜잭션으로 처리

CREATE OR REPLACE FUNCTION update_farmer_profile(
  p_user_id UUID,
  p_name TEXT,
  p_phone TEXT
) RETURNS users
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_phone TEXT := trim(p_phone);
  v_name TEXT := trim(p_name);
BEGIN
  IF v_name = '' THEN
    RAISE EXCEPTION 'name_required' USING ERRCODE = 'check_violation';
  END IF;

  IF length(v_phone) < 10 THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM users WHERE phone = v_phone AND id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'phone_already_exists' USING ERRCODE = '23505';
  END IF;

  UPDATE users
  SET name = v_name, phone = v_phone
  WHERE id = p_user_id
  RETURNING * INTO v_user;

  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION delete_farmer(p_user_id UUID) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1 FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- FK ON DELETE CASCADE: guardians, health_data, alerts → call_logs, notification_logs
  DELETE FROM users WHERE id = p_user_id;
END;
$$;
