-- Run this once in phpMyAdmin (or `mysql -u ... -p yourdb < schema.sql`)
-- against the database you created for this site on Namecheap.
--
-- If you already ran an older version of this file (before the
-- is_admin / draws feature existed), just run these two statements
-- instead of the whole file:
--   ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0;
--   -- then the CREATE TABLE draws statement below.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL DEFAULT '',
  last_name VARCHAR(100) NOT NULL DEFAULT '',
  address_line VARCHAR(190) NOT NULL DEFAULT '',
  postal_code VARCHAR(20) NOT NULL DEFAULT '',
  city VARCHAR(100) NOT NULL DEFAULT '',
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tickets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  game_id VARCHAR(30) NOT NULL,
  main_numbers JSON NOT NULL,
  bonus_numbers JSON NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Official draw results, entered by an admin, used to compute each
-- ticket's win/loss status on the admin dashboard.
CREATE TABLE IF NOT EXISTS draws (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  game_id VARCHAR(30) NOT NULL,
  main_numbers JSON NOT NULL,
  bonus_numbers JSON NOT NULL,
  draw_date DATE NOT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- To make your own account a super admin, register normally through
-- depot.html, then run this once in phpMyAdmin (replace the email):
--   UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';
