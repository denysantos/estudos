-- Script SQL para o Banco de Dados MariaDB no XAMPP

CREATE DATABASE IF NOT EXISTS `kanban_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `kanban_db`;

-- 1. Tabela de Colunas do Quadro
CREATE TABLE IF NOT EXISTS `columns` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(100) NOT NULL,
  `is_done_column` TINYINT(1) NOT NULL DEFAULT 0,
  `position` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Tarefas
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Anexos
CREATE TABLE IF NOT EXISTS `attachments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_size` VARCHAR(50) NOT NULL,
  `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserção de colunas padrão se a tabela estiver vazia
INSERT INTO `columns` (`id`, `title`, `is_done_column`, `position`) 
SELECT 1, 'A fazer', 0, 1 WHERE NOT EXISTS (SELECT 1 FROM `columns` WHERE `id` = 1);

INSERT INTO `columns` (`id`, `title`, `is_done_column`, `position`) 
SELECT 2, 'Em andamento', 0, 2 WHERE NOT EXISTS (SELECT 1 FROM `columns` WHERE `id` = 2);

INSERT INTO `columns` (`id`, `title`, `is_done_column`, `position`) 
SELECT 3, 'Concluídas', 1, 3 WHERE NOT EXISTS (SELECT 1 FROM `columns` WHERE `id` = 3);

-- 4. Tabela de Base de Conhecimento
CREATE TABLE IF NOT EXISTS `knowledge_base` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT NULL,
  `title` VARCHAR(255) NOT NULL,
  `cause` TEXT NULL,
  `analysis` TEXT NULL,
  `resolution` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

