-- Migration: create profile row on auth sign up

-- Function to insert a users row whenever a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger AS $$
BEGIN
  INSERT INTO users (auth_id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'patient')
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that fires after each new row is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();
