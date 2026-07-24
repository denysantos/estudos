<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET api/slas.php - Retorna as metas de SLA e o relatório comparativo
if ($method === 'GET') {
    // 1. Obter Metas de SLA
    $stmtGoals = $pdo->query("SELECT * FROM `sla_goals` ORDER BY id ASC");
    $goalsRaw = $stmtGoals->fetchAll();
    
    $goalsMap = [];
    foreach ($goalsRaw as $g) {
        $goalsMap[$g['criticality']] = (int)$g['max_hours'];
    }

    // 2. Buscar todas as tarefas para comparar data de criação x encerramento
    $stmtTasks = $pdo->query("
        SELECT t.id, t.title, t.criticality, t.priority, t.complexity, t.created_at, t.completed_at, c.is_done_column 
        FROM `tasks` t 
        LEFT JOIN `columns` c ON t.column_id = c.id 
        ORDER BY t.id DESC
    ");
    $tasks = $stmtTasks->fetchAll();

    $now = time();
    $reportTasks = [];
    $totalCompleted = 0;
    $completedMet = 0;
    $completedBreached = 0;
    $openMet = 0;
    $openBreached = 0;

    foreach ($tasks as $t) {
        $crit = $t['criticality'] ?? 'normal';
        $maxHours = $goalsMap[$crit] ?? ($goalsMap['normal'] ?? 48);

        $createdTs = strtotime($t['created_at']);
        $isDone = (int)($t['is_done_column'] ?? 0) === 1 || !empty($t['completed_at']);
        
        if ($isDone && !empty($t['completed_at'])) {
            $endTs = strtotime($t['completed_at']);
        } else {
            $endTs = $now;
        }

        $diffSeconds = max(0, $endTs - $createdTs);
        $elapsedHours = round($diffSeconds / 3600, 1);
        $diffDays = round($diffSeconds / 86400, 1);

        $isWithinTarget = $elapsedHours <= $maxHours;

        if ($isDone) {
            $totalCompleted++;
            if ($isWithinTarget) {
                $completedMet++;
                $status = 'met';
            } else {
                $completedBreached++;
                $status = 'breached';
            }
        } else {
            if ($isWithinTarget) {
                $openMet++;
                $status = 'open_ok';
            } else {
                $openBreached++;
                $status = 'open_breached';
            }
        }

        $reportTasks[] = [
            'id' => (int)$t['id'],
            'title' => $t['title'],
            'criticality' => $crit,
            'createdAt' => date('d/m/Y H:i', $createdTs),
            'completedAt' => (!empty($t['completed_at']) && $isDone) ? date('d/m/Y H:i', strtotime($t['completed_at'])) : '-',
            'isDone' => $isDone,
            'maxHours' => $maxHours,
            'elapsedHours' => $elapsedHours,
            'isWithinTarget' => $isWithinTarget,
            'status' => $status
        ];
    }

    $complianceRate = $totalCompleted > 0 ? round(($completedMet / $totalCompleted) * 100, 1) : 100;

    echo json_encode([
        'goals' => $goalsRaw,
        'summary' => [
            'totalCompleted' => $totalCompleted,
            'completedMet' => $completedMet,
            'completedBreached' => $completedBreached,
            'complianceRate' => $complianceRate,
            'openMet' => $openMet,
            'openBreached' => $openBreached
        ],
        'report' => $reportTasks
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// PUT api/slas.php - Atualizar metas de SLA (Apenas Administrador)
if ($method === 'PUT') {
    if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Apenas administradores podem alterar as metas de SLA.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Dados inválidos.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    foreach ($data as $item) {
        $crit = trim($item['criticality'] ?? '');
        $maxHours = (int)($item['max_hours'] ?? 0);

        if (!empty($crit) && $maxHours > 0) {
            $stmt = $pdo->prepare("UPDATE `sla_goals` SET max_hours = ? WHERE criticality = ?");
            $stmt->execute([$maxHours, $crit]);
        }
    }

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método não permitido.'], JSON_UNESCAPED_UNICODE);
