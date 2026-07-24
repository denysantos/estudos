// ============================================================
// Base de Conhecimento — Script
// ============================================================
const API_BASE = 'api';
let articles = [];
let tasksList = [];
let editingId = null;

// Elementos fixos da página (existem no HTML)
const searchKbInput = document.getElementById('kb-search-input');
const articlesGrid = document.getElementById('articles-grid');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitleEl = document.getElementById('modal-title');
const modalBodyEl = document.getElementById('modal-body');
const btnSave = document.getElementById('btn-save');
const btnNew = document.getElementById('btn-new-article');
const btnCancel = document.getElementById('btn-cancel');
const modalClose = document.getElementById('modal-close');

// ── Init ──
async function init() {
    await Promise.all([loadArticles(), loadTasks()]);
}

async function loadArticles(q = '') {
    const url = q
        ? `${API_BASE}/knowledge.php?q=${encodeURIComponent(q)}`
        : `${API_BASE}/knowledge.php`;
    try {
        const res = await fetch(url);
        if (res.ok) {
            articles = await res.json();
            renderArticles();
        } else {
            const err = await res.json().catch(() => ({}));
            console.error('Erro ao carregar artigos:', err);
        }
    } catch (err) {
        console.error('Erro ao carregar artigos:', err);
    }
}

async function loadTasks() {
    try {
        const res = await fetch(`${API_BASE}/tasks.php`);
        if (res.ok) tasksList = await res.json();
    } catch (err) {
        console.error('Erro ao carregar tarefas:', err);
    }
}

let currentViewMode = localStorage.getItem('kb_view_mode') || 'cards';

// ── Eventos dos botões de alternância de visão ──
const btnViewCards = document.getElementById('btn-view-cards');
const btnViewList = document.getElementById('btn-view-list');

if (btnViewCards && btnViewList) {
    btnViewCards.classList.toggle('active', currentViewMode === 'cards');
    btnViewList.classList.toggle('active', currentViewMode === 'list');

    btnViewCards.addEventListener('click', () => {
        currentViewMode = 'cards';
        localStorage.setItem('kb_view_mode', 'cards');
        btnViewCards.classList.add('active');
        btnViewList.classList.remove('active');
        renderArticles();
    });

    btnViewList.addEventListener('click', () => {
        currentViewMode = 'list';
        localStorage.setItem('kb_view_mode', 'list');
        btnViewList.classList.add('active');
        btnViewCards.classList.remove('active');
        renderArticles();
    });
}

// ── Renderização dos artigos ──
function renderArticles() {
    articlesGrid.innerHTML = '';

    if (articles.length === 0) {
        articlesGrid.className = 'kb-grid';
        articlesGrid.innerHTML = `
            <div class="kb-empty">
                <span>📚</span>
                <p>Nenhum artigo ainda.<br>Clique em <strong>+ Novo Artigo</strong> para começar.</p>
            </div>`;
        return;
    }

    if (currentViewMode === 'cards') {
        articlesGrid.className = 'kb-grid';
        articles.forEach(article => {
            const card = document.createElement('div');
            card.className = 'kb-article-card';

            const titleEl = document.createElement('div');
            titleEl.className = 'kb-article-title';
            titleEl.textContent = article.title;

            const metaEl = document.createElement('div');
            metaEl.className = 'kb-article-meta';
            const parts = [`📅 ${article.createdAt}`];
            if (article.taskTitle) parts.push(`🔗 #${article.taskId} — ${article.taskTitle}`);
            metaEl.textContent = parts.join('  ·  ');

            const previewEl = document.createElement('div');
            previewEl.className = 'kb-article-preview';
            previewEl.textContent = article.cause || article.analysis || article.resolution || '(sem detalhes)';

            const actionsEl = document.createElement('div');
            actionsEl.className = 'kb-article-actions';

            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-secondary btn-sm';
            viewBtn.textContent = '👁';
            viewBtn.addEventListener('click', (e) => { e.stopPropagation(); openView(article); });

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-primary btn-sm';
            editBtn.textContent = '✏️';
            editBtn.addEventListener('click', (e) => { e.stopPropagation(); openEdit(article); });

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-danger btn-sm';
            delBtn.textContent = '🗑️';
            delBtn.title = 'Excluir artigo';
            delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteArticle(article.id); });

            actionsEl.appendChild(viewBtn);
            actionsEl.appendChild(editBtn);
            actionsEl.appendChild(delBtn);

            card.appendChild(titleEl);
            card.appendChild(metaEl);
            card.appendChild(previewEl);
            card.appendChild(actionsEl);

            card.addEventListener('click', () => openView(article));
            articlesGrid.appendChild(card);
        });
    } else {
        // Visualização em Lista / Tabela no formato do comparativo de metas
        articlesGrid.className = 'kb-list-container';
        
        const cardContainer = document.createElement('div');
        cardContainer.className = 'card';

        const tableResponsive = document.createElement('div');
        tableResponsive.className = 'table-responsive';

        const table = document.createElement('table');
        table.className = 'admin-table';

        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Título do Artigo</th>
                    <th>Tarefa Vinculada</th>
                    <th>Data Criação</th>
                    <th>Resumo / Prévia</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody id="kb-table-body"></tbody>
        `;

        tableResponsive.appendChild(table);
        cardContainer.appendChild(tableResponsive);
        articlesGrid.appendChild(cardContainer);

        const tbody = table.querySelector('#kb-table-body');
        
        articles.forEach(article => {
            const tr = document.createElement('tr');
            tr.className = 'clickable-row';

            const rawPreview = article.cause || article.analysis || article.resolution || '(sem detalhes)';
            const cleanPreview = rawPreview.replace(/<[^>]*>/g, '').substring(0, 70) + (rawPreview.length > 70 ? '...' : '');

            const taskBadge = article.taskTitle 
                ? `<span class="badge badge-info">🔗 #${article.taskId} — ${escapeHtml(article.taskTitle)}</span>` 
                : `<span class="text-muted">—</span>`;

            tr.innerHTML = `
                <td>#${article.id}</td>
                <td><strong class="text-primary">${escapeHtml(article.title)}</strong></td>
                <td>${taskBadge}</td>
                <td>${article.createdAt || '-'}</td>
                <td><span class="text-muted">${escapeHtml(cleanPreview)}</span></td>
                <td>
                    <div style="display: flex; gap: 6px;" onclick="event.stopPropagation();">
                        <button class="btn-action" style="background: #e8f5e9; color: #1b5e20;" title="Visualizar Artigo">👁️ Ver</button>
                        <button class="btn-action" style="background: #e3f2fd; color: #1565c0;" title="Editar Artigo">✏️ Editar</button>
                        <button class="btn-action btn-delete-sm" title="Excluir Artigo">🗑️ Excluir</button>
                    </div>
                </td>
            `;

            const actionBtns = tr.querySelectorAll('.btn-action');
            actionBtns[0].addEventListener('click', (e) => { e.stopPropagation(); openView(article); });
            actionBtns[1].addEventListener('click', (e) => { e.stopPropagation(); openEdit(article); });
            actionBtns[2].addEventListener('click', (e) => { e.stopPropagation(); deleteArticle(article.id); });

            tr.addEventListener('click', () => openView(article));
            tbody.appendChild(tr);
        });
    }
}


// ── Modal de Visualização ──
function openView(article) {
    editingId = null;
    modalTitleEl.textContent = '📖 ' + article.title;
    btnSave.style.display = 'none';

    const sections = [
        { label: 'Tarefa Vinculada', value: article.taskTitle ? `#${article.taskId} — ${article.taskTitle}` : '—', isHtml: false },
        { label: 'Causa do Incidente', value: article.cause || '—', isHtml: true },
        { label: 'Análise', value: article.analysis || '—', isHtml: true },
        { label: 'Resolução', value: article.resolution || '—', isHtml: true },
    ];

    modalBodyEl.innerHTML = sections.map(s => {
        const content = s.isHtml
            ? `<div class="kb-detail-text has-html">${s.value}</div>`
            : `<div class="kb-detail-text">${escapeHtml(s.value)}</div>`;
        return `
        <div class="kb-detail-section">
            <div class="kb-detail-label">${escapeHtml(s.label)}</div>
            ${content}
        </div>`;
    }).join('');

    openModal();
}

// ── Modal de Edição/Criação ──
function openEdit(article = null) {
    editingId = article ? article.id : null;
    modalTitleEl.textContent = article ? '✏️ Editar Artigo' : '✨ Novo Artigo';
    btnSave.style.display = '';

    // Monta o formulário no modal-body dinamicamente
    modalBodyEl.innerHTML = `
        <div class="form-group">
            <label class="form-label" for="form-title">Título *</label>
            <input id="form-title" class="form-input" type="text"
                   placeholder="Título do artigo de conhecimento..."
                   value="${escapeAttr(article ? article.title : '')}">
        </div>
        <div class="form-group">
            <label class="form-label" for="form-task-id">Tarefa Vinculada</label>
            <select id="form-task-id" class="form-select">
                <option value="">— Nenhuma tarefa vinculada —</option>
                ${tasksList.map(t => `
                    <option value="${t.id}"
                        ${article && article.taskId === t.id ? 'selected' : ''}>
                        #${t.id} — ${escapeHtml(t.text)}
                    </option>`).join('')}
            </select>
        </div>
        <div class="form-group" id="group-cause">
            <label class="form-label">Causa do Incidente</label>
        </div>
        <div class="form-group" id="group-analysis">
            <label class="form-label">Análise</label>
        </div>
        <div class="form-group" id="group-resolution">
            <label class="form-label">Resolução</label>
        </div>`;

    // Monta os editores ricos após inserir no DOM
    const causeGroup = document.getElementById('group-cause');
    const analysisGroup = document.getElementById('group-analysis');
    const resolutionGroup = document.getElementById('group-resolution');

    causeGroup.appendChild(createRichEditor('rich-cause',
        article ? article.cause || '' : '',
        'Descreva a causa raiz do incidente...'));

    analysisGroup.appendChild(createRichEditor('rich-analysis',
        article ? article.analysis || '' : '',
        'Como o incidente foi analisado...'));

    resolutionGroup.appendChild(createRichEditor('rich-resolution',
        article ? article.resolution || '' : '',
        'Quais ações foram tomadas para resolver...'));

    openModal();
    // Foca no campo de título para UX
    document.getElementById('form-title').focus();
}

function openModal() {
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ── Salvar (lê os campos do modal-body injetado) ──
btnSave.addEventListener('click', async () => {
    // Lê os campos que foram injetados dinamicamente
    const titleInput   = document.getElementById('form-title');
    const taskIdInput  = document.getElementById('form-task-id');
    const causeEditor      = document.getElementById('rich-cause');
    const analysisEditor   = document.getElementById('rich-analysis');
    const resolutionEditor = document.getElementById('rich-resolution');

    if (!titleInput) return; // modal de visualização, não de edição

    const title      = titleInput.value.trim();
    const cause      = causeEditor      ? causeEditor.innerHTML.trim()      : '';
    const analysis   = analysisEditor   ? analysisEditor.innerHTML.trim()   : '';
    const resolution = resolutionEditor ? resolutionEditor.innerHTML.trim() : '';
    const taskIdVal  = taskIdInput ? taskIdInput.value : '';
    const taskId     = taskIdVal ? parseInt(taskIdVal) : null;

    if (!title) {
        titleInput.style.borderColor = '#c62828';
        titleInput.focus();
        return;
    }

    // Reset visual de erro
    titleInput.style.borderColor = '';

    const payload = { title, cause, analysis, resolution, taskId };

    // Feedback visual no botão
    btnSave.disabled = true;
    btnSave.textContent = '⏳ Salvando...';

    try {
        let res;
        if (editingId) {
            res = await fetch(`${API_BASE}/knowledge.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingId, ...payload })
            });
        } else {
            res = await fetch(`${API_BASE}/knowledge.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (res.ok) {
            closeModal();
            await loadArticles(searchKbInput.value.trim());
        } else {
            const errData = await res.json().catch(() => ({}));
            alert('Erro ao salvar: ' + (errData.error || 'Verifique o console.'));
            console.error('Erro API:', errData);
        }
    } catch (err) {
        alert('Erro de conexão com a API. Verifique se o XAMPP está rodando.');
        console.error('Erro ao salvar artigo:', err);
    } finally {
        btnSave.disabled = false;
        btnSave.textContent = '💾 Salvar Artigo';
    }
});

// ── Excluir ──
async function deleteArticle(id) {
    if (!confirm('Tem certeza que deseja excluir este artigo da base de conhecimento?')) return;
    try {
        const res = await fetch(`${API_BASE}/knowledge.php?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            await loadArticles(searchKbInput.value.trim());
        }
    } catch (err) {
        console.error('Erro ao excluir artigo:', err);
    }
}

// ── Busca com debounce ──
let kbDebounce = null;
searchKbInput.addEventListener('input', (e) => {
    clearTimeout(kbDebounce);
    kbDebounce = setTimeout(() => loadArticles(e.target.value.trim()), 300);
});
searchKbInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { searchKbInput.value = ''; loadArticles(); }
});

// ── Eventos do modal ──
btnNew.addEventListener('click', () => openEdit());
btnCancel.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ── Utilitários de escape ──
function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(text) {
    return String(text ?? '').replace(/"/g, '&quot;');
}

// ============================================================
// Rich Text Editor
// ============================================================
function createRichEditor(editorId, initialHtml, placeholder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'rich-editor-wrapper';

    // ── Toolbar ──
    const toolbar = document.createElement('div');
    toolbar.className = 'rich-toolbar';

    // Salva a seleção antes de o botão roubar o foco
    let savedSelection = null;
    function saveSelection() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedSelection = sel.getRangeAt(0).cloneRange();
        }
    }
    function restoreSelection() {
        if (!savedSelection) return;
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection);
    }

    const tools = [
        { label: 'B',  title: 'Negrito',              cmd: () => execCmd('bold'),   style: 'font-weight:700;' },
        { label: 'I',  title: 'Itálico',              cmd: () => execCmd('italic'), style: 'font-style:italic;' },
        { label: 'U',  title: 'Sublinhado',            cmd: () => execCmd('underline'), style: 'text-decoration:underline;' },
        null,  // separador
        { label: '`code`',     title: 'Código inline',   cmd: insertInlineCode, extra: 'code-btn' },
        { label: '\u25a4 Bloco', title: 'Bloco de código', cmd: insertCodeBlock,  extra: 'code-btn' },
    ];

    function execCmd(cmd) {
        restoreSelection();
        document.execCommand(cmd, false, null);
        content.focus();
        updateActiveStates();
    }

    function insertInlineCode() {
        restoreSelection();
        const sel = window.getSelection();
        const selectedText = sel && !sel.isCollapsed ? sel.toString() : 'code';
        const code = document.createElement('code');
        code.textContent = selectedText;
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(code);
            // Coloca o cursor após o elemento
            range.setStartAfter(code);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        content.focus();
    }

    function insertCodeBlock() {
        restoreSelection();
        const sel = window.getSelection();
        const selectedText = sel && !sel.isCollapsed ? sel.toString() : 'Seu código aqui...';
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = selectedText;
        pre.appendChild(code);
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(pre);
            range.setStartAfter(pre);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        } else {
            content.appendChild(pre);
        }
        content.focus();
    }

    function updateActiveStates() {
        toolBtns.forEach((btn, i) => {
            const tool = tools.filter(t => t !== null)[i];
            if (!tool || tool.extra === 'code-btn') return;
            const cmdMap = { 'B': 'bold', 'I': 'italic', 'U': 'underline' };
            const cmd = cmdMap[tool.label];
            if (cmd) btn.classList.toggle('active', document.queryCommandState(cmd));
        });
    }

    const toolBtns = [];
    tools.forEach(tool => {
        if (tool === null) {
            const sep = document.createElement('span');
            sep.className = 'rich-toolbar-separator';
            toolbar.appendChild(sep);
            return;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rich-toolbar-btn' + (tool.extra ? ` ${tool.extra}` : '');
        btn.textContent = tool.label;
        btn.title = tool.title;
        if (tool.style) btn.setAttribute('style', tool.style);
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // não perde o foco do editor
            saveSelection();
            tool.cmd();
        });
        toolbar.appendChild(btn);
        toolBtns.push(btn);
    });

    // ── Área editável ──
    const content = document.createElement('div');
    content.className = 'rich-content';
    content.contentEditable = 'true';
    content.id = editorId;
    content.setAttribute('data-placeholder', placeholder || 'Digite aqui...');
    if (initialHtml) content.innerHTML = initialHtml;

    content.addEventListener('keyup', updateActiveStates);
    content.addEventListener('mouseup', updateActiveStates);
    content.addEventListener('selectionchange', updateActiveStates);
    content.addEventListener('blur', saveSelection);

    wrapper.appendChild(toolbar);
    wrapper.appendChild(content);
    return wrapper;
}

// ── Inicializar ──
init();
