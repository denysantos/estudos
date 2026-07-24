# Tarefas de Implementação

- [x] **1. Badges compactos** — somente ícones com tooltip
  - [x] Atualizar labels nos mapas do script.js (somente emoji)
  - [x] Atualizar CSS do .badge (22x22px, somente ícone)

- [x] **2. Arrastar colunas**
  - [x] Adicionar draggedColumnId e eventos de drag nas colunas (script.js)
  - [x] Função reorderColumns() + chamada API
  - [x] Suporte a reorder no columns.php (PUT com action=reorder)
  - [x] Estilos .column-dragging e .column-drag-over (style.css)

- [x] **3. Busca de cards**
  - [x] Adicionar input de busca no index.html
  - [x] Variável searchQuery + listener com debounce (script.js)
  - [x] Função applySearch() que mostra/oculta cards
  - [x] Highlight de texto encontrado (mark.search-highlight)
  - [x] Botão ✕ para limpar busca

- [x] **4. Paginação de cards**
  - [x] Constante CARDS_PER_PAGE=5, estado currentPage por coluna (script.js)
  - [x] Renderizar controles de paginação no rodapé da coluna
  - [x] Estilos .column-pagination (style.css)

- [x] **5. Base de Conhecimento**
  - [x] Criar knowledge.html (página completa)
  - [x] Criar api/knowledge.php (GET/POST/PUT/DELETE)
  - [x] Criar assets/knowledge.js
  - [x] Atualizar schema.sql com tabela knowledge_base
  - [x] Adicionar link de navegação no index.html
  - [x] Estilos da KB no style.css (grid, modal, formulário)
