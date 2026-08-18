<?php
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/../db.php';

require_admin($pdo);

$stmt = $pdo->query(
    'SELECT t.id, t.game_id, t.main_numbers, t.bonus_numbers, t.created_at,
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
        'user' => [
            'id' => (int) $row['user_id'],
            'email' => $row['email'],
            'firstName' => $row['first_name'],
            'lastName' => $row['last_name'],
        ],
    ];
}, $rows);

echo json_encode(['tickets' => $tickets]);
