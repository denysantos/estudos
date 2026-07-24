<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

// Função auxiliar para verificar permissão de Administrador
function checkAdminPermission() {
    if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Acesso negado. Apenas administradores podem gerenciar usuários.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$method = $_SERVER['REQUEST_METHOD'];

// GET api/users.php - Listar Usuários
if ($method === 'GET') {
    checkAdminPermission();

    $stmt = $pdo->query("SELECT id, name, username, role, created_at FROM `users` ORDER BY id DESC");
    $users = $stmt->fetchAll();

    echo json_encode($users, JSON_UNESCAPED_UNICODE);
    exit;
}

// POST api/users.php - Criar Usuário
if ($method === 'POST') {
    checkAdminPermission();

    $data = json_decode(file_get_contents('php://input'), true);
    $name = trim($data['name'] ?? '');
    $username = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');
    $role = trim($data['role'] ?? 'user');

    if (empty($name) || empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Nome, Usuário e Senha são obrigatórios.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!in_array($role, ['admin', 'user'])) {
        $role = 'user';
    }

    // Verificar se nome de usuário já existe
    $stmtCheck = $pdo->prepare("SELECT id FROM `users` WHERE username = ?");
    $stmtCheck->execute([$username]);
    if ($stmtCheck->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Já existe um usuário cadastrado com este nome de usuário.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $passHash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO `users` (name, username, password, role) VALUES (?, ?, ?, ?)");
    $stmt->execute([$name, $username, $passHash, $role]);

    $newId = (int)$pdo->lastInsertId();

    echo json_encode([
        'id' => $newId,
        'name' => $name,
        'username' => $username,
        'role' => $role,
        'created_at' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// DELETE api/users.php?id=X - Excluir Usuário
if ($method === 'DELETE') {
    checkAdminPermission();

    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'ID do usuário é obrigatório.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Impedir que o admin logado delete a si próprio
    if (isset($_SESSION['user']) && (int)$_SESSION['user']['id'] === $id) {
        http_response_code(400);
        echo json_encode(['error' => 'Você não pode excluir o seu próprio usuário logado.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM `users` WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

// PUT api/users.php - Alterar Senha do Usuário
if ($method === 'PUT') {
    if (!isset($_SESSION['user'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Usuário não autenticado.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $targetUserId = (int)($data['id'] ?? $_SESSION['user']['id']);
    $newPassword = trim($data['password'] ?? $data['newPassword'] ?? '');
    $currentPassword = trim($data['currentPassword'] ?? '');

    if (empty($newPassword)) {
        http_response_code(400);
        echo json_encode(['error' => 'A nova senha não pode ser vazia.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $isAdmin = $_SESSION['user']['role'] === 'admin';
    $isSelf = (int)$_SESSION['user']['id'] === $targetUserId;

    if (!$isAdmin && !$isSelf) {
        http_response_code(403);
        echo json_encode(['error' => 'Você não tem permissão para alterar a senha deste usuário.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Se for o próprio usuário (e não for um admin redefinindo a senha de outro), validar a senha atual se fornecida
    if ($isSelf && !$isAdmin && !empty($currentPassword)) {
        $stmtUser = $pdo->prepare("SELECT password FROM `users` WHERE id = ?");
        $stmtUser->execute([$targetUserId]);
        $uData = $stmtUser->fetch();
        if (!$uData || !password_verify($currentPassword, $uData['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'A senha atual informada está incorreta.'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE `users` SET password = ? WHERE id = ?");
    $stmt->execute([$newHash, $targetUserId]);

    echo json_encode(['success' => true, 'message' => 'Senha alterada com sucesso!'], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método não permitido.'], JSON_UNESCAPED_UNICODE);

