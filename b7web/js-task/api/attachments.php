<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

$uploadDir = __DIR__ . '/../uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

if ($method === 'POST') {
    $taskId = (int)($_POST['taskId'] ?? 0);

    if ($taskId <= 0 || empty($_FILES['files'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID da tarefa e arquivos são obrigatórios']);
        exit;
    }

    $uploadedAttachments = [];
    $files = $_FILES['files'];
    $fileCount = is_array($files['name']) ? count($files['name']) : 1;

    for ($i = 0; $i < $fileCount; $i++) {
        $fileName = is_array($files['name']) ? $files['name'][$i] : $files['name'];
        $tmpName  = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
        $fileSize = is_array($files['size']) ? $files['size'][$i] : $files['size'];
        $error    = is_array($files['error']) ? $files['error'][$i] : $files['error'];

        if ($error === UPLOAD_ERR_OK) {
            $ext = pathinfo($fileName, PATHINFO_EXTENSION);
            $uniqueName = uniqid('att_') . ($ext ? '.' . $ext : '');
            $destination = $uploadDir . $uniqueName;
            $publicPath = 'uploads/' . $uniqueName;

            if (move_uploaded_file($tmpName, $destination)) {
                $formattedSize = '0 B';
                if ($fileSize > 0) {
                    $units = ['B', 'KB', 'MB', 'GB'];
                    $pow = floor(log($fileSize, 1024));
                    $formattedSize = round($fileSize / pow(1024, $pow), 1) . ' ' . $units[$pow];
                }

                $stmt = $pdo->prepare("INSERT INTO `attachments` (task_id, file_name, file_path, file_size) VALUES (?, ?, ?, ?)");
                $stmt->execute([$taskId, $fileName, $publicPath, $formattedSize]);

                $attId = (int)$pdo->lastInsertId();

                $uploadedAttachments[] = [
                    'id' => $attId,
                    'name' => $fileName,
                    'size' => $formattedSize,
                    'url' => $publicPath
                ];
            }
        }
    }

    echo json_encode($uploadedAttachments, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'ID do anexo é obrigatório']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT file_path FROM `attachments` WHERE id = ?");
    $stmt->execute([$id]);
    $att = $stmt->fetch();

    if ($att) {
        $localPath = __DIR__ . '/../' . ltrim($att['file_path'], '/');
        if (file_exists($localPath)) {
            @unlink($localPath);
        }

        $stmtDel = $pdo->prepare("DELETE FROM `attachments` WHERE id = ?");
        $stmtDel->execute([$id]);
    }

    echo json_encode(['success' => true]);
    exit;
}
