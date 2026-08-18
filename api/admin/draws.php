<?php
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/../db.php';

require_admin($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$allowedGames = ['euromillions', 'eurojackpot', 'lotto49', 'loto', 'lotto645'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT id, game_id, main_numbers, bonus_numbers, draw_date FROM draws ORDER BY draw_date DESC, id DESC');
    $rows = $stmt->fetchAll();
    $draws = array_map(function ($row) {
        return [
            'id' => (int) $row['id'],
            'gameId' => $row['game_id'],
            'main' => json_decode($row['main_numbers'], true) ?: [],
            'bonus' => json_decode($row['bonus_numbers'], true) ?: [],
            'drawDate' => $row['draw_date'],
        ];
    }, $rows);
    echo json_encode(['draws' => $draws]);
    exit;
}

if ($method === 'POST') {
    $input = json_body();
    $gameId = (string) ($input['gameId'] ?? '');
    $main = is_array($input['main'] ?? null) ? array_map('intval', array_values($input['main'])) : [];
    $bonus = is_array($input['bonus'] ?? null) ? array_map('intval', array_values($input['bonus'])) : [];
    $drawDate = (string) ($input['drawDate'] ?? '');

    if (!in_array($gameId, $allowedGames, true) || empty($main) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $drawDate)) {
        http_response_code(422);
        echo json_encode(['error' => 'invalid_draw']);
        exit;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO draws (game_id, main_numbers, bonus_numbers, draw_date, created_at) VALUES (?, ?, ?, ?, NOW())'
    );
    $stmt->execute([$gameId, json_encode($main), json_encode($bonus), $drawDate]);

    echo json_encode(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    $stmt = $pdo->prepare('DELETE FROM draws WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method_not_allowed']);
