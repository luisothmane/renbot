<?php
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}
header('Content-Type: application/json; charset=utf-8');

function json_body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_login(): int {
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'not_logged_in']);
        exit;
    }
    return (int) $_SESSION['user_id'];
}

function require_admin(PDO $pdo): int {
    $userId = require_login();
    $stmt = $pdo->prepare('SELECT is_admin FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row || (int) $row['is_admin'] !== 1) {
        http_response_code(403);
        echo json_encode(['error' => 'not_admin']);
        exit;
    }
    return $userId;
}
