<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

function formatDateTime($dateStr) {
    if (!$dateStr) return '-';
    $d = new DateTime($dateStr);
    return $d->format('d/m/Y H:i');
}

if ($method === 'GET') {
    // Buscar metas de SLA
    $stmtSla = $pdo->query("SELECT criticality, max_hours FROM `sla_goals`");
    $slaGoalsRaw = $stmtSla->fetchAll();
    $slaGoals = [];
    foreach ($slaGoalsRaw as $sg) {
        $slaGoals[$sg['criticality']] = (int)$sg['max_hours'];
    }

    $stmt = $pdo->query("SELECT * FROM `tasks` ORDER BY id ASC");
    $tasks = $stmt->fetchAll();

    $now = time();
    $result = [];
    foreach ($tasks as $t) {
        $taskId = (int)$t['id'];

        $stmtAtt = $pdo->prepare("SELECT id, file_name, file_path, file_size FROM `attachments` WHERE task_id = ?");
        $stmtAtt->execute([$taskId]);
        $attachmentsRaw = $stmtAtt->fetchAll();

        $attachments = array_map(function($att) {
            return [
                'id' => (int)$att['id'],
                'name' => $att['file_name'],
                'size' => $att['file_size'],
                'url' => $att['file_path']
            ];
        }, $attachmentsRaw);

        $crit = $t['criticality'] ?? 'normal';
        $maxSlaHours = $slaGoals[$crit] ?? ($slaGoals['normal'] ?? 48);

        $createdTs = strtotime($t['created_at']);
        $completedTs = $t['completed_at'] ? strtotime($t['completed_at']) : null;
        $endTs = $completedTs ? $completedTs : $now;

        $elapsedSeconds = max(0, $endTs - $createdTs);
        $elapsedHours = round($elapsedSeconds / 3600, 1);
        $isWithinSla = $elapsedHours <= $maxSlaHours;

        $result[] = [
            'id' => $taskId,
            'text' => $t['title'],
            'description' => $t['description'] ?? '',
            'isEditingDescription' => false,
            'attachments' => $attachments,
            'columnId' => (int)$t['column_id'],
            'complexity'  => $t['complexity']  ?? 'normal',
            'criticality' => $crit,
            'priority'    => $t['priority']    ?? 'normal',
            'createdTimestamp' => $createdTs * 1000,
            'completedTimestamp' => $completedTs ? $completedTs * 1000 : null,
            'createdAt' => formatDateTime($t['created_at']),
            'completedAt' => formatDateTime($t['completed_at']),
            'duration' => $t['duration'] ?? '-',
            'maxSlaHours' => $maxSlaHours,
            'elapsedHours' => $elapsedHours,
            'isWithinSla' => $isWithinSla
        ];
    }

    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}


$data = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
    $text = trim($data['text'] ?? '');
    $columnId = (int)($data['columnId'] ?? 0);

    if (empty($text) || $columnId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Texto e Coluna são obrigatórios']);
        exit;
    }

    $createdAt = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare("INSERT INTO `tasks` (title, description, column_id, created_at, completed_at, duration) VALUES (?, ?, ?, ?, NULL, '-')");
    $stmt->execute([$text, '', $columnId, $createdAt]);

    $newId = (int)$pdo->lastInsertId();

    echo json_encode([
        'id' => $newId,
        'text' => $text,
        'description' => '',
        'isEditingDescription' => false,
        'attachments' => [],
        'columnId' => $columnId,
        'complexity'  => 'normal',
        'criticality' => 'normal',
        'priority'    => 'normal',
        'createdTimestamp' => strtotime($createdAt) * 1000,
        'completedTimestamp' => null,
        'createdAt' => formatDateTime($createdAt),
        'completedAt' => '-',
        'duration' => '-'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'PUT') {
    $id = (int)($data['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'ID da tarefa é obrigatório']);
        exit;
    }

    if (isset($data['text']) || isset($data['title'])) {
        $title = trim($data['text'] ?? $data['title']);
        if (!empty($title)) {
            $stmt = $pdo->prepare("UPDATE `tasks` SET title = ? WHERE id = ?");
            $stmt->execute([$title, $id]);
        }
    }

    if (isset($data['columnId'])) {
        $columnId = (int)$data['columnId'];
        $completedAt = !empty($data['completedTimestamp']) ? date('Y-m-d H:i:s', floor($data['completedTimestamp'] / 1000)) : null;
        $duration = $data['duration'] ?? '-';

        $stmt = $pdo->prepare("UPDATE `tasks` SET column_id = ?, completed_at = ?, duration = ? WHERE id = ?");
        $stmt->execute([$columnId, $completedAt, $duration, $id]);
    }

    if (isset($data['description'])) {
        $description = trim($data['description']);
        $stmt = $pdo->prepare("UPDATE `tasks` SET description = ? WHERE id = ?");
        $stmt->execute([$description, $id]);
    }

    // Campos de classificação
    $allowedValues = ['alta', 'normal', 'baixa'];
    if (isset($data['complexity']) && in_array($data['complexity'], $allowedValues)) {
        $stmt = $pdo->prepare("UPDATE `tasks` SET complexity = ? WHERE id = ?");
        $stmt->execute([$data['complexity'], $id]);
    }
    if (isset($data['criticality']) && in_array($data['criticality'], $allowedValues)) {
        $stmt = $pdo->prepare("UPDATE `tasks` SET criticality = ? WHERE id = ?");
        $stmt->execute([$data['criticality'], $id]);
    }
    if (isset($data['priority']) && in_array($data['priority'], $allowedValues)) {
        $stmt = $pdo->prepare("UPDATE `tasks` SET priority = ? WHERE id = ?");
        $stmt->execute([$data['priority'], $id]);
    }

    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'ID da tarefa é obrigatório']);
        exit;
    }

    // Deletar arquivos físicos associados
    $stmtAtt = $pdo->prepare("SELECT file_path FROM `attachments` WHERE task_id = ?");
    $stmtAtt->execute([$id]);
    $files = $stmtAtt->fetchAll();
    foreach ($files as $f) {
        $localPath = __DIR__ . '/../' . ltrim($f['file_path'], '/');
        if (file_exists($localPath)) {
            @unlink($localPath);
        }
    }

    $stmt = $pdo->prepare("DELETE FROM `tasks` WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['success' => true]);
    exit;
}
