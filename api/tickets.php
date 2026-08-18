<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/db.php';

$userId = require_login();
$method = $_SERVER['REQUEST_METHOD'];
$allowedGames = ['euromillions', 'eurojackpot', 'lotto49', 'loto', 'lotto645'];

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT id, game_id, main_numbers, bonus_numbers, created_at, status_override, price, won_amount FROM tickets WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();
    $tickets = array_map(function ($row) {
        return [
            'id' => (int) $row['id'],
            'gameId' => $row['game_id'],
            'main' => json_decode($row['main_numbers'], true) ?: [],
            'bonus' => json_decode($row['bonus_numbers'], true) ?: [],
            'createdAt' => $row['created_at'],
            'statusOverride' => $row['status_override'],
            'price' => (float) $row['price'],
            'wonAmount' => $row['won_amount'] === null ? null : (float) $row['won_amount'],
        ];
    }, $rows);
    echo json_encode(['tickets' => $tickets]);
    exit;
}

if ($method === 'POST') {
    $input = json_body();
    $gameId = (string) ($input['gameId'] ?? '');
    $main = is_array($input['main'] ?? null) ? array_values($input['main']) : [];
    $bonus = is_array($input['bonus'] ?? null) ? array_values($input['bonus']) : [];

    if (!in_array($gameId, $allowedGames, true) || empty($main)) {
        http_response_code(422);
        echo json_encode(['error' => 'invalid_ticket']);
        exit;
    }

    $main = array_map('intval', $main);
    $bonus = array_map('intval', $bonus);

    $stmt = $pdo->prepare(
        'INSERT INTO tickets (user_id, game_id, main_numbers, bonus_numbers, created_at) VALUES (?, ?, ?, ?, NOW())'
    );
    $stmt->execute([$userId, $gameId, json_encode($main), json_encode($bonus)]);

    echo json_encode(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    $stmt = $pdo->prepare('DELETE FROM tickets WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method_not_allowed']);
