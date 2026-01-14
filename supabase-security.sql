-- Таблица для логов аудита (все действия пользователей)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  status TEXT CHECK (status IN ('success', 'failure', 'suspicious')),
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_status ON audit_logs(status);
CREATE INDEX idx_audit_ip ON audit_logs(ip_address);

-- RLS для audit_logs (только админы видят логи)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Админы могут читать логи" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Таблица для заблокированных IP
CREATE TABLE IF NOT EXISTS blocked_ips (
  ip_address TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 1
);

CREATE INDEX idx_blocked_ips_until ON blocked_ips(blocked_until);

-- Таблица для сессий (отслеживание активных сессий)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  fingerprint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свои сессии" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Таблица для 2FA backup кодов
CREATE TABLE IF NOT EXISTS backup_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_backup_codes_user ON backup_codes(user_id);

ALTER TABLE backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи управляют своими кодами" ON backup_codes
  FOR ALL USING (auth.uid() = user_id);

-- Функция для автоматической очистки старых логов (старше 90 дней)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs 
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для автоматической очистки истекших сессий
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для логирования подозрительной активности
CREATE OR REPLACE FUNCTION log_suspicious_activity()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'suspicious' THEN
    -- Можно добавить отправку уведомления админу
    RAISE WARNING 'Suspicious activity detected: % by user %', NEW.action, NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_suspicious_activity
  AFTER INSERT ON audit_logs
  FOR EACH ROW
  WHEN (NEW.status = 'suspicious')
  EXECUTE FUNCTION log_suspicious_activity();

-- Добавление поля для отслеживания последнего входа
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

-- Функция для блокировки аккаунта после неудачных попыток входа
CREATE OR REPLACE FUNCTION handle_failed_login(user_email TEXT)
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT * INTO user_record FROM user_profiles WHERE email = user_email;
  
  IF user_record IS NOT NULL THEN
    UPDATE user_profiles 
    SET login_attempts = login_attempts + 1
    WHERE email = user_email;
    
    IF user_record.login_attempts >= 5 THEN
      UPDATE user_profiles 
      SET locked_until = NOW() + INTERVAL '30 minutes'
      WHERE email = user_email;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для сброса счетчика попыток при успешном входе
CREATE OR REPLACE FUNCTION handle_successful_login(user_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles 
  SET 
    login_attempts = 0,
    locked_until = NULL,
    last_login = NOW()
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
