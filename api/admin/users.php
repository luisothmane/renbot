<?php
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/../db.php';

require_admin($pdo);

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
