<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// GET api/auth.php?action=me
if ($method === 'GET' && $action === 'me') {
    if (isset($_SESSION['user'])) {
        echo json_encode([
            'authenticated' => true,
            'user' => $_SESSION['user']
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'authenticated' => false,
            'user' => null
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// POST api/auth.php?action=login
if ($method === 'POST' && $action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Informe o usuário e a senha.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM `users` WHERE `username` = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $userData = [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'username' => $user['username'],
            'role' => $user['role']
        ];
        $_SESSION['user'] = $userData;

        echo json_encode([
            'success' => true,
            'user' => $userData
        ], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Usuário ou senha incorretos.'], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// POST api/auth.php?action=logout
if ($method === 'POST' && $action === 'logout') {
    unset($_SESSION['user']);
    session_destroy();
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Ação inválida.'], JSON_UNESCAPED_UNICODE);
