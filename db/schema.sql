-- Run this once in phpMyAdmin (or `mysql -u ... -p yourdb < schema.sql`)
-- against the database you created for this site on Namecheap.
--
-- If you already ran an older version of this file, just run whichever
-- of these you're missing instead of the whole file:
--   ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0;
--   ALTER TABLE tickets ADD COLUMN status_override VARCHAR(10) DEFAULT NULL;
--   ALTER TABLE tickets ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 96.00;
--   ALTER TABLE tickets ADD COLUMN won_amount DECIMAL(10,2) DEFAULT NULL;
--   -- then the CREATE TABLE draws statement below (if you don't have it yet).

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
  -- Set by an admin to override the auto-computed win/loss status
  -- ('win', 'loss', or NULL to fall back to matching against draws).
  status_override VARCHAR(10) DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 96.00,
  won_amount DECIMAL(10,2) DEFAULT NULL,
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
