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

$stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(['error' => 'invalid_credentials']);
    exit;
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];

echo json_encode(['ok' => true]);
