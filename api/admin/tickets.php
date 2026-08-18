<?php
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/../db.php';

require_admin($pdo);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query(
        'SELECT t.id, t.game_id, t.main_numbers, t.bonus_numbers, t.created_at, t.status_override,
                u.id AS user_id, u.email, u.first_name, u.last_name
         FROM tickets t
         JOIN users u ON u.id = t.user_id
         ORDER BY t.created_at DESC'
    );
    $rows = $stmt->fetchAll();

    $tickets = array_map(function ($row) {
        return [
            'id' => (int) $row['id'],
            'gameId' => $row['game_id'],
            'main' => json_decode($row['main_numbers'], true) ?: [],
            'bonus' => json_decode($row['bonus_numbers'], true) ?: [],
            'createdAt' => $row['created_at'],
            'statusOverride' => $row['status_override'],
            'user' => [
                'id' => (int) $row['user_id'],
                'email' => $row['email'],
                'firstName' => $row['first_name'],
                'lastName' => $row['last_name'],
            ],
        ];
    }, $rows);

    echo json_encode(['tickets' => $tickets]);
    exit;
}

if ($method === 'PATCH') {
    $input = json_body();
    $id = (int) ($input['id'] ?? 0);
    $status = array_key_exists('status', $input) ? $input['status'] : false;

    if ($id <= 0 || !in_array($status, ['win', 'loss', null], true)) {
        http_response_code(422);
        echo json_encode(['error' => 'invalid_status']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE tickets SET status_override = ? WHERE id = ?');
    $stmt->execute([$status, $id]);

    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method_not_allowed']);
