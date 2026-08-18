<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/db.php';

if (empty($_SESSION['user_id'])) {
    echo json_encode(['loggedIn' => false]);
    exit;
}

$stmt = $pdo->prepare('SELECT id, email, first_name, last_name, city, is_admin FROM users WHERE id = ?');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    echo json_encode(['loggedIn' => false]);
    exit;
}

echo json_encode([
    'loggedIn' => true,
    'user' => [
        'email' => $user['email'],
        'firstName' => $user['first_name'],
        'lastName' => $user['last_name'],
        'city' => $user['city'],
        'isAdmin' => (bool) $user['is_admin'],
    ],
]);
