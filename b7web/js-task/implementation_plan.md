# Plano de Implementação: Limite de Tarefas por Coluna, Criticidade, Complexidade e Prioridade

Este plano descreve as alterações para incluir controle de visualização paginada por coluna (padrão de 5 itens) e adicionar os atributos de **Criticidade**, **Complexidade** e **Prioridade** com badges coloridos e persistência no MariaDB.

## Novos Requisitos
1. **Limite Configurável de Visualização por Coluna**:
   - Seletor na barra superior para definir a quantidade máxima de tarefas exibidas simultaneamente por coluna (opções: 3, 5, 10, 15, 20, Todas). Padrão inicial: **5 tarefas**.
   - Controles de paginação (`< Anterior`, `Página X de Y`, `Próximo >`) no rodapé de cada coluna quando a quantidade de tarefas exceder o limite.
2. **Classificação Avançada dos Cards**:
   - **Criticidade**: `Alta`, `Normal`, `Baixa`.
   - **Complexidade**: `Alta`, `Normal`, `Baixa`.
   - **Prioridade**: `Urgente` (Vermelho), `Alta` (Laranja), `Normal` (Azul), `Baixa` (Cinza).
3. **Persistência no MariaDB**:
   - Adição automática das colunas `criticality`, `complexity` e `priority` na tabela `tasks` via alteração de schema segura (`api/db.php` e `schema.sql`).

---

## Estrutura das Alterações

### [js-task](file:///c:/xampp/htdocs/b7web/js-task)

#### [MODIFY] [schema.sql](file:///c:/xampp/htdocs/b7web/js-task/schema.sql) e [api/db.php](file:///c:/xampp/htdocs/b7web/js-task/api/db.php)
- Adicionar colunas `criticality`, `complexity` e `priority` na tabela `tasks` com valor padrão `'normal'`.
- Garantir atualização dinâmica do schema no MariaDB (`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS...`).

#### [MODIFY] [api/tasks.php](file:///c:/xampp/htdocs/b7web/js-task/api/tasks.php)
- Atualizar leitura (`GET`), criação (`POST`) e atualização (`PUT`) das tarefas para tratar os novos campos de criticidade, complexidade e prioridade.

#### [MODIFY] [index.html](file:///c:/xampp/htdocs/b7web/js-task/index.html)
- Adicionar na barra superior um seletor para a quantidade de tarefas visíveis por coluna (ex: `Exibir: [ 5 ] por coluna`).
- Incluir no formulário de criação de tarefas os seletores de Criticidade, Complexidade e Prioridade.

#### [MODIFY] [assets/style.css](file:///c:/xampp/htdocs/b7web/js-task/assets/style.css)
- Estilizar a área de paginação das colunas (`.column-pagination`).
- Criar os estilos visuais para os badges de prioridade (`.badge-priority.urgente`, `.badge-priority.alta`, etc.), criticidade e complexidade.
- Estilizar os controles de edição de atributos nos cards.

#### [MODIFY] [assets/script.js](file:///c:/xampp/htdocs/b7web/js-task/assets/script.js)
- Implementar variável `tasksPerPage` (padrão `5`) e objeto de estado de paginação `columnPages = { colId: 1 }`.
- Atualizar a função `renderBoard()` para aplicar o fatiamento (slice) de tarefas conforme a página atual de cada coluna.
- Adicionar seletores interativos dentro do card para alterar prioridade, criticidade e complexidade diretamente com salvamento via `fetch()`.

---

## Plano de Verificação Manual
1. Adicionar 6 ou mais tarefas em uma coluna e verificar a ativação automática da paginação (limitando a 5 tarefas na 1ª página).
2. Alterar o seletor global para 3 ou 10 tarefas por coluna e confirmar o ajuste imediato da visualização.
3. Testar a navegação de páginas (`Anterior` / `Próximo`) dentro da coluna.
4. Criar e alterar tarefas configurando Criticidade (`Alta`), Complexidade (`Baixa`) e Prioridade (`Urgente`) e verificar os badges coloridos.
5. Recarregar a página (F5) para validar a persistência permanente dos novos atributos e configurações no MariaDB.
