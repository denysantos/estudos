<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    require_once __DIR__ . '/../api/db.php';
    echo "--- DB CONNECTED ---\n";

    $_SERVER['REQUEST_METHOD'] = 'POST';
    // simulate php://input
    $postData = json_encode([
        'title' => 'Artigo de Teste Novo',
        'cause' => 'Causa de teste',
        'analysis' => 'Análise de teste',
        'resolution' => 'Resolução de teste',
        'taskId' => null
    ]);

    // Override php://input by wrapping in a stream or testing logic directly
    $title = 'Artigo de Teste Novo';
    $cause = 'Causa de teste';
    $analysis = 'Análise de teste';
    $resolution = 'Resolução de teste';
    $taskId = null;

    $stmt = $pdo->prepare("INSERT INTO `knowledge_base` (task_id, title, cause, analysis, resolution) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$taskId, $title, $cause, $analysis, $resolution]);
    $newId = (int)$pdo->lastInsertId();
    echo "New inserted article ID: $newId\n";

} catch (Throwable $t) {
    echo "EXCEPTIONAL ERROR: " . $t->getMessage() . "\n" . $t->getTraceAsString() . "\n";
}
