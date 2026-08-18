<?php
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/../db.php';

$adminId = require_admin($pdo);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query(
        'SELECT u.id, u.email, u.first_name, u.last_name, u.city, u.is_admin, u.created_at,
                COUNT(t.id) AS ticket_count
         FROM users u
         LEFT JOIN tickets t ON t.user_id = u.id
         GROUP BY u.id, u.email, u.first_name, u.last_name, u.city, u.is_admin, u.created_at
         ORDER BY u.created_at DESC'
    );
    $rows = $stmt->fetchAll();

    $users = array_map(function ($row) {
        return [
            'id' => (int) $row['id'],
            'email' => $row['email'],
            'firstName' => $row['first_name'],
            'lastName' => $row['last_name'],
            'city' => $row['city'],
            'isAdmin' => (bool) $row['is_admin'],
            'createdAt' => $row['created_at'],
            'ticketCount' => (int) $row['ticket_count'],
        ];
    }, $rows);

    echo json_encode(['users' => $users]);
    exit;
}

if ($method === 'POST') {
    $input = json_body();
    $email = trim((string) ($input['email'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    $firstName = trim((string) ($input['firstName'] ?? ''));
    $lastName = trim((string) ($input['lastName'] ?? ''));
    $address = trim((string) ($input['address'] ?? ''));
    $postalCode = trim((string) ($input['postalCode'] ?? ''));
    $city = trim((string) ($input['city'] ?? ''));
    $isAdmin = !empty($input['isAdmin']) ? 1 : 0;

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
        'INSERT INTO users (email, password_hash, first_name, last_name, address_line, postal_code, city, is_admin, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([$email, $hash, $firstName, $lastName, $address, $postalCode, $city, $isAdmin]);

    echo json_encode(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);

    if ($id === $adminId) {
        http_response_code(400);
        echo json_encode(['error' => 'cannot_delete_self']);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method_not_allowed']);
