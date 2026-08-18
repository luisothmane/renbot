<?php
// Namecheap (cPanel) MySQL connection settings.
// In cPanel -> MySQL Databases you create a database and a user and
// assign the user to the database; phpMyAdmin uses those same three
// values. Fill them in below before uploading, or better: copy this
// file to db.local.php with your real values and keep that file out
// of version control (see .gitignore).
$DB_HOST = 'localhost';
$DB_NAME = 'REPLACE_WITH_YOUR_DB_NAME';
$DB_USER = 'REPLACE_WITH_YOUR_DB_USER';
$DB_PASS = 'REPLACE_WITH_YOUR_DB_PASSWORD';

$localOverride = __DIR__ . '/db.local.php';
if (is_file($localOverride)) {
    require $localOverride;
}

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'database_connection_failed']);
    exit;
}
