<?php
// Configura o Fuso Horário Padrão do Sistema (America/Sao_Paulo)
date_default_timezone_set('America/Sao_Paulo');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host = '127.0.0.1';
$user = 'root';
$pass = '';
$dbname = 'kanban_db';

try {
    // 1. Conecta ao MariaDB (servidor XAMPP)
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // 2. Garante a criação do Banco de Dados
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$dbname` ");

    // Define o fuso horário da sessão do MariaDB para o padrão brasileiro (-03:00)
    $pdo->exec("SET time_zone = '-03:00'");

    // 3. Garante a existência das Tabelas
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `columns` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `title` VARCHAR(100) NOT NULL,
            `is_done_column` TINYINT(1) NOT NULL DEFAULT 0,
            `position` INT NOT NULL DEFAULT 0,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS `tasks` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `title` VARCHAR(255) NOT NULL,
            `description` TEXT NULL,
            `column_id` INT NOT NULL,
            `criticality` VARCHAR(20) DEFAULT 'normal',
            `complexity` VARCHAR(20) DEFAULT 'normal',
            `priority` VARCHAR(20) DEFAULT 'normal',
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `completed_at` DATETIME NULL,
            `duration` VARCHAR(50) DEFAULT '-',
            FOREIGN KEY (`column_id`) REFERENCES `columns`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS `attachments` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `task_id` INT NULL,
            `knowledge_id` INT NULL,
            `file_name` VARCHAR(255) NOT NULL,
            `file_path` VARCHAR(500) NOT NULL,
            `file_size` VARCHAR(50) NOT NULL,
            `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS `knowledge_base` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `task_id` INT NULL,
            `title` VARCHAR(255) NOT NULL,
            `cause` TEXT NULL,
            `analysis` TEXT NULL,
            `resolution` TEXT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS `users` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `name` VARCHAR(100) NOT NULL,
            `username` VARCHAR(50) NOT NULL UNIQUE,
            `password` VARCHAR(255) NOT NULL,
            `role` VARCHAR(20) NOT NULL DEFAULT 'user',
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS `sla_goals` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `criticality` VARCHAR(20) NOT NULL UNIQUE,
            `max_hours` INT NOT NULL DEFAULT 48,
            `description` VARCHAR(255) NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");


    // Auxiliar para adicionar colunas caso já existam instâncias antigas sem os novos atributos
    function addColumnIfMissing($pdo, $table, $column, $definition) {
        $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
        }
    }

    addColumnIfMissing($pdo, 'tasks', 'criticality', "VARCHAR(20) DEFAULT 'normal'");
    addColumnIfMissing($pdo, 'tasks', 'complexity', "VARCHAR(20) DEFAULT 'normal'");
    addColumnIfMissing($pdo, 'tasks', 'priority', "VARCHAR(20) DEFAULT 'normal'");
    
    // Migração de attachments para suportar Base de Conhecimento
    try {
        $pdo->exec("ALTER TABLE `attachments` MODIFY `task_id` INT NULL");
    } catch (Exception $e) {}
    addColumnIfMissing($pdo, 'attachments', 'knowledge_id', "INT NULL");

    // 4. Cria as colunas iniciais padrão se estiver vazio
    $stmt = $pdo->query("SELECT COUNT(*) AS total FROM `columns` ");
    $row = $stmt->fetch();
    if ((int)$row['total'] === 0) {
        $pdo->exec("INSERT INTO `columns` (`id`, `title`, `is_done_column`, `position`) VALUES 
            (1, 'A fazer', 0, 1),
            (2, 'Em andamento', 0, 2),
            (3, 'Concluídas', 1, 3)");
    }

    // 5. Garante usuário Administrador padrão
    $stmtUser = $pdo->query("SELECT COUNT(*) AS total FROM `users` WHERE `username` = 'admin'");
    $rowUser = $stmtUser->fetch();
    if ((int)$rowUser['total'] === 0) {
        $adminPassHash = password_hash('admin123', PASSWORD_DEFAULT);
        $stmtIns = $pdo->prepare("INSERT INTO `users` (`name`, `username`, `password`, `role`) VALUES (?, ?, ?, ?)");
        $stmtIns->execute(['Administrador', 'admin', $adminPassHash, 'admin']);
    }

    // 6. Garante Metas SLA padrão
    $stmtSla = $pdo->query("SELECT COUNT(*) AS total FROM `sla_goals` ");
    $rowSla = $stmtSla->fetch();
    if ((int)$rowSla['total'] === 0) {
        $pdo->exec("INSERT INTO `sla_goals` (`criticality`, `max_hours`, `description`) VALUES 
            ('alta', 24, 'Prazo máximo para incidentes/tarefas de alta criticidade'),
            ('normal', 48, 'Prazo padrão para incidentes/tarefas de criticidade normal'),
            ('baixa', 72, 'Prazo estendido para tarefas de baixa criticidade')");
    }


} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Falha de Conexão com MariaDB: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
