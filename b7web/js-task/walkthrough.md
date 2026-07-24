# Walkthrough - Persistência em Banco de Dados MariaDB

A aplicação Kanban foi totalmente integrada ao **MariaDB** (MySQL no XAMPP), garantindo armazenamento e sincronização permanente de todas as colunas, tarefas, explicações de incidentes e anexos.

## O que foi construído

### 1. Script SQL (`schema.sql`)
- Script DDL completo para criação do banco de dados `kanban_db` e das tabelas `columns`, `tasks` e `attachments` com relacionamentos de integridade referencial (`FOREIGN KEY ... ON DELETE CASCADE`).

### 2. API Backend RESTful em PHP (`api/`)
- [api/db.php](file:///c:/xampp/htdocs/b7web/js-task/api/db.php): Conexão PDO segura (host `127.0.0.1`, usuário `root`), que cria automaticamente o banco de dados e as tabelas caso ainda não existam no MariaDB.
- [api/columns.php](file:///c:/xampp/htdocs/b7web/js-task/api/columns.php): CRUD completo para criação, listagem, renomeação e exclusão de colunas no banco.
- [api/tasks.php](file:///c:/xampp/htdocs/b7web/js-task/api/tasks.php): CRUD completo de tarefas (incluindo metadados, posição de coluna, datas de criação/conclusão e explicação do incidente).
- [api/attachments.php](file:///c:/xampp/htdocs/b7web/js-task/api/attachments.php): Upload de arquivos físicos salvo no diretório `uploads/` com gravação do caminho na tabela `attachments` e exclusão física ao remover.

### 3. Integração Assíncrona no Frontend (`assets/script.js`)
- Todas as operações da interface gráfica (`addTask`, `moveTaskToColumn`, `updateTaskDescription`, `uploadAttachments`, `removeAttachment`, `addColumn`, `renameColumn`, `deleteColumn`) agora realizam requisições assíncronas (`fetch`) para a API em PHP.

---

## Como Executar no XAMPP

1. Certifique-se de que os módulos **Apache** e **MySQL (MariaDB)** estão ativos no XAMPP Control Panel.
2. Acesse a aplicação no seu navegador: `http://localhost/b7web/js-task/`
3. Os dados inseridos serão gravados automaticamente e mantidos de forma permanente no banco de dados MariaDB.
