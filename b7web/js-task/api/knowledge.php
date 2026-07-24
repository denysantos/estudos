<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Busca opcional por termo
    $search = trim($_GET['q'] ?? '');

    if ($search !== '') {
        $like = "%{$search}%";
        $stmt = $pdo->prepare("
            SELECT kb.*, t.title AS task_title
            FROM `knowledge_base` kb
            LEFT JOIN `tasks` t ON kb.task_id = t.id
            WHERE kb.title LIKE ? OR kb.cause LIKE ? OR kb.analysis LIKE ? OR kb.resolution LIKE ?
            ORDER BY kb.created_at DESC
        ");
        $stmt->execute([$like, $like, $like, $like]);
    } else {
        $stmt = $pdo->query("
            SELECT kb.*, t.title AS task_title
            FROM `knowledge_base` kb
            LEFT JOIN `tasks` t ON kb.task_id = t.id
            ORDER BY kb.created_at DESC
        ");
    }

    $rows = $stmt->fetchAll();

    // Carregar anexos de todos os artigos da base de conhecimento
    $attStmt = $pdo->query("SELECT * FROM `attachments` WHERE knowledge_id IS NOT NULL ORDER BY id ASC");
    $allAtts = $attStmt->fetchAll();
    $attsByKb = [];
    foreach ($allAtts as $att) {
        $attsByKb[$att['knowledge_id']][] = [
            'id'   => (int)$att['id'],
            'name' => $att['file_name'],
            'size' => $att['file_size'],
            'url'  => $att['file_path']
        ];
    }

    $result = array_map(function($row) use ($attsByKb) {
        return [
            'id'          => (int)$row['id'],
            'taskId'      => $row['task_id'] ? (int)$row['task_id'] : null,
            'taskTitle'   => $row['task_title'] ?? null,
            'title'       => $row['title'],
            'cause'       => $row['cause'] ?? '',
            'analysis'    => $row['analysis'] ?? '',
            'resolution'  => $row['resolution'] ?? '',
            'attachments' => $attsByKb[$row['id']] ?? [],
            'createdAt'   => (new DateTime($row['created_at']))->format('d/m/Y H:i')
        ];
    }, $rows);

    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
    $title      = trim($data['title']      ?? '');
    $cause      = trim($data['cause']      ?? '');
    $analysis   = trim($data['analysis']   ?? '');
    $resolution = trim($data['resolution'] ?? '');
    $taskId     = !empty($data['taskId']) ? (int)$data['taskId'] : null;

    if (empty($title)) {
        http_response_code(400);
        echo json_encode(['error' => 'Título é obrigatório']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO `knowledge_base` (task_id, title, cause, analysis, resolution) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$taskId, $title, $cause, $analysis, $resolution]);

    $newId = (int)$pdo->lastInsertId();

    // Buscar task_title se houver taskId
    $taskTitle = null;
    if ($taskId) {
        $ts = $pdo->prepare("SELECT title FROM `tasks` WHERE id = ?");
        $ts->execute([$taskId]);
        $tr = $ts->fetch();
        $taskTitle = $tr ? $tr['title'] : null;
    }

    echo json_encode([
        'id'          => $newId,
        'taskId'      => $taskId,
        'taskTitle'   => $taskTitle,
        'title'       => $title,
        'cause'       => $cause,
        'analysis'    => $analysis,
        'resolution'  => $resolution,
        'attachments' => [],
        'createdAt'   => date('d/m/Y H:i')
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'PUT') {
    $id         = (int)($data['id']         ?? 0);
    $title      = trim($data['title']       ?? '');
    $cause      = trim($data['cause']       ?? '');
    $analysis   = trim($data['analysis']    ?? '');
    $resolution = trim($data['resolution']  ?? '');
    $taskId     = !empty($data['taskId']) ? (int)$data['taskId'] : null;

    if ($id <= 0 || empty($title)) {
        http_response_code(400);
        echo json_encode(['error' => 'ID e título são obrigatórios']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE `knowledge_base` SET task_id=?, title=?, cause=?, analysis=?, resolution=? WHERE id=?");
    $stmt->execute([$taskId, $title, $cause, $analysis, $resolution, $id]);

    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'ID é obrigatório']);
        exit;
    }

    // Deletar arquivos físicos dos anexos associados
    $stmtAtt = $pdo->prepare("SELECT file_path FROM `attachments` WHERE knowledge_id = ?");
    $stmtAtt->execute([$id]);
    $atts = $stmtAtt->fetchAll();
    foreach ($atts as $att) {
        $localPath = __DIR__ . '/../' . ltrim($att['file_path'], '/');
        if (file_exists($localPath)) {
            @unlink($localPath);
        }
    }
    $stmtDelAtt = $pdo->prepare("DELETE FROM `attachments` WHERE knowledge_id = ?");
    $stmtDelAtt->execute([$id]);

    $stmt = $pdo->prepare("DELETE FROM `knowledge_base` WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}
