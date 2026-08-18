<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$input = json_body();
$email = trim((string) ($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');
$firstName = trim((string) ($input['firstName'] ?? ''));
$lastName = trim((string) ($input['lastName'] ?? ''));
$address = trim((string) ($input['address'] ?? ''));
$postalCode = trim((string) ($input['postalCode'] ?? ''));
$city = trim((string) ($input['city'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['error' => 'invalid_email']);
    exit;
}
if (strlen($password) < 8) {
    http_response_code(422);
    echo json_encode(['error' => 'password_too_short']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'email_taken']);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare(
    'INSERT INTO users (email, password_hash, first_name, last_name, address_line, postal_code, city, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())'
);
$stmt->execute([$email, $hash, $firstName, $lastName, $address, $postalCode, $city]);

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $pdo->lastInsertId();

echo json_encode(['ok' => true]);
