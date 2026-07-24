<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT id, title, is_done_column FROM `columns` ORDER BY position ASC, id ASC");
    $columns = $stmt->fetchAll();

    $result = array_map(function($col) {
        return [
            'id' => (int)$col['id'],
            'title' => $col['title'],
            'isDoneColumn' => (bool)$col['is_done_column']
        ];
    }, $columns);

    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
    $title = trim($data['title'] ?? '');
    $isDone = !empty($data['isDoneColumn']) ? 1 : 0;

    if (empty($title)) {
        http_response_code(400);
        echo json_encode(['error' => 'Título da coluna é obrigatório']);
        exit;
    }

    $stmtMax = $pdo->query("SELECT MAX(position) AS max_pos FROM `columns` ");
    $rowMax = $stmtMax->fetch();
    $maxPos = (int)($rowMax['max_pos'] ?? 0);

    $stmt = $pdo->prepare("INSERT INTO `columns` (title, is_done_column, position) VALUES (?, ?, ?)");
    $stmt->execute([$title, $isDone, $maxPos + 1]);

    $newId = (int)$pdo->lastInsertId();

    echo json_encode([
        'id' => $newId,
        'title' => $title,
        'isDoneColumn' => (bool)$isDone
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'PUT') {
    // Ação de reordenação em lote
    if (isset($data['action']) && $data['action'] === 'reorder') {
        $positions = $data['positions'] ?? [];
        $stmt = $pdo->prepare("UPDATE `columns` SET position = ? WHERE id = ?");
        foreach ($positions as $pos) {
            $colId  = (int)($pos['id'] ?? 0);
            $colPos = (int)($pos['position'] ?? 0);
            if ($colId > 0) {
                $stmt->execute([$colPos, $colId]);
            }
        }
        echo json_encode(['success' => true]);
        exit;
    }

    // Atualização de título/isDone
    $id    = (int)($data['id'] ?? 0);
    $title = trim($data['title'] ?? '');
    $isDone = !empty($data['isDoneColumn']) ? 1 : 0;

    if ($id <= 0 || empty($title)) {
        http_response_code(400);
        echo json_encode(['error' => 'Dados inválidos para atualizar coluna']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE `columns` SET title = ?, is_done_column = ? WHERE id = ?");
    $stmt->execute([$title, $isDone, $id]);

    echo json_encode([
        'id'           => $id,
        'title'        => $title,
        'isDoneColumn' => (bool)$isDone
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'ID da coluna é obrigatório']);
        exit;
    }

    // Se houver tarefas nessa coluna, migra para a primeira coluna restante (fallback)
    $stmtFallback = $pdo->prepare("SELECT id FROM `columns` WHERE id != ? ORDER BY position ASC, id ASC LIMIT 1");
    $stmtFallback->execute([$id]);
    $fallbackCol = $stmtFallback->fetch();

    if ($fallbackCol) {
        $stmtMove = $pdo->prepare("UPDATE `tasks` SET column_id = ? WHERE column_id = ?");
        $stmtMove->execute([$fallbackCol['id'], $id]);
    }

    $stmt = $pdo->prepare("DELETE FROM `columns` WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['success' => true]);
    exit;
}
