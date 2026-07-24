// ============================================================
// Base de Conhecimento — Script
// ============================================================
const API_BASE = 'api';
let articles = [];
let tasksList = [];
let editingId = null;
let pendingFiles = [];
let currentModalAttachments = [];

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

// ── Utilitários de Anexos ──
function getFileIcon(filename) {
    if (!filename) return '📎';
    const ext = filename.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📄';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
    if (['js', 'php', 'css', 'html', 'json', 'sql'].includes(ext)) return '💻';
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return '📝';
    return '📎';
}

function isImageFile(filename) {
    if (!filename) return false;
    const ext = filename.split('.').pop().toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const pow = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, pow)).toFixed(1) + ' ' + units[pow];
}

function renderModalAttachmentsList() {
    const container = document.getElementById('kb-modal-attachments-list');
    if (!container) return;
    container.innerHTML = '';

    if (currentModalAttachments.length === 0 && pendingFiles.length === 0) {
        container.innerHTML = `<span class="text-muted" style="font-size:0.8rem; font-style:italic;">Nenhum anexo adicionado ainda.</span>`;
        return;
    }

    // 1. Anexos já salvos no servidor
    currentModalAttachments.forEach(att => {
        const item = document.createElement('div');
        item.className = 'kb-attachment-item';

        const isImg = isImageFile(att.name);
        const insertImgBtn = isImg ? `<button type="button" class="kb-btn-insert-img" title="Inserir imagem no editor">🖼️ Inserir no editor</button>` : '';

        item.innerHTML = `
            <div class="kb-attachment-info">
                <span class="kb-attachment-icon">${getFileIcon(att.name)}</span>
                <a href="${escapeAttr(att.url)}" target="_blank" download class="kb-attachment-name" title="Clique para baixar/visualizar">${escapeHtml(att.name)}</a>
                <span class="kb-attachment-size">(${escapeHtml(att.size)})</span>
            </div>
            <div class="kb-attachment-actions">
                ${insertImgBtn}
                <button type="button" class="attachment-remove btn-del-att" title="Remover anexo">🗑️</button>
            </div>
        `;

        if (isImg) {
            const btnIns = item.querySelector('.kb-btn-insert-img');
            btnIns.addEventListener('click', () => insertImageIntoEditor(att.url, att.name));
        }

        const btnDel = item.querySelector('.btn-del-att');
        btnDel.addEventListener('click', () => deleteKbAttachment(att.id));

        container.appendChild(item);
    });

    // 2. Anexos pendentes (para novo artigo)
    pendingFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'kb-attachment-item';
        item.style.background = '#fff8e1';

        item.innerHTML = `
            <div class="kb-attachment-info">
                <span class="kb-attachment-icon">${getFileIcon(file.name)}</span>
                <span class="kb-attachment-name" style="color: #b78103;">${escapeHtml(file.name)}</span>
                <span class="kb-attachment-size">(${formatFileSize(file.size)}) — <em>pendente</em></span>
            </div>
            <div class="kb-attachment-actions">
                <button type="button" class="attachment-remove btn-del-pending" title="Remover da lista">❌</button>
            </div>
        `;

        item.querySelector('.btn-del-pending').addEventListener('click', () => {
            pendingFiles.splice(index, 1);
            renderModalAttachmentsList();
        });

        container.appendChild(item);
    });
}

function insertImageIntoEditor(url, name) {
    const resEditor = document.getElementById('rich-resolution') || document.getElementById('rich-analysis') || document.getElementById('rich-cause');
    if (!resEditor) return;
    const img = document.createElement('img');
    img.src = url;
    img.alt = name;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '6px';
    img.style.margin = '8px 0';
    img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    resEditor.appendChild(img);
    resEditor.focus();
}

async function uploadImmediateFiles(knowledgeId, fileList) {
    const statusEl = document.getElementById('kb-upload-status');
    if (statusEl) statusEl.textContent = '⏳ Enviando anexo(s)...';
    const formData = new FormData();
    formData.append('knowledgeId', knowledgeId);
    Array.from(fileList).forEach(file => formData.append('files[]', file));

    try {
        const res = await fetch(`${API_BASE}/attachments.php`, { method: 'POST', body: formData });
        if (res.ok) {
            const newAtts = await res.json();
            currentModalAttachments.push(...newAtts);
            const article = articles.find(a => a.id === knowledgeId);
            if (article) {
                if (!article.attachments) article.attachments = [];
                article.attachments.push(...newAtts);
            }
            renderModalAttachmentsList();
            renderArticles();
            if (statusEl) statusEl.textContent = '✅ Anexo(s) enviado(s)!';
            setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);
        } else {
            alert('Erro ao enviar anexos.');
            if (statusEl) statusEl.textContent = '';
        }
    } catch (err) {
        console.error('Erro ao enviar anexo:', err);
        if (statusEl) statusEl.textContent = '';
    }
}

async function deleteKbAttachment(attachmentId) {
    if (!confirm('Deseja realmente remover este anexo?')) return;
    try {
        const res = await fetch(`${API_BASE}/attachments.php?id=${attachmentId}`, { method: 'DELETE' });
        if (res.ok) {
            currentModalAttachments = currentModalAttachments.filter(att => att.id !== attachmentId);
            if (editingId) {
                const article = articles.find(a => a.id === editingId);
                if (article && article.attachments) {
                    article.attachments = article.attachments.filter(att => att.id !== attachmentId);
                }
            }
            renderModalAttachmentsList();
            renderArticles();
        }
    } catch (err) {
        console.error('Erro ao excluir anexo:', err);
    }
}

async function uploadPendingFiles(knowledgeId) {
    if (pendingFiles.length === 0) return;
    const formData = new FormData();
    formData.append('knowledgeId', knowledgeId);
    pendingFiles.forEach(file => formData.append('files[]', file));
    try {
        await fetch(`${API_BASE}/attachments.php`, { method: 'POST', body: formData });
        pendingFiles = [];
    } catch (err) {
        console.error('Erro ao enviar anexos pendentes:', err);
    }
}

// ── Renderização dos artigos ──
function renderArticles() {
    if (!articlesGrid) return;
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
            if (article.attachments && article.attachments.length > 0) parts.push(`📎 ${article.attachments.length} anexo(s)`);
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
        // Visualização em Lista / Tabela
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
                    <th>Anexos</th>
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

            const attBadge = (article.attachments && article.attachments.length > 0)
                ? `<span class="kb-attachment-badge">📎 ${article.attachments.length}</span>`
                : `<span class="text-muted">—</span>`;

            tr.innerHTML = `
                <td>#${article.id}</td>
                <td><strong class="text-primary">${escapeHtml(article.title)}</strong></td>
                <td>${taskBadge}</td>
                <td>${attBadge}</td>
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

    const attachmentsListHtml = (article.attachments && article.attachments.length > 0)
        ? `<div class="kb-attachment-list">` + article.attachments.map(att => `
            <div class="kb-attachment-item">
                <div class="kb-attachment-info">
                    <span class="kb-attachment-icon">${getFileIcon(att.name)}</span>
                    <a href="${escapeAttr(att.url)}" target="_blank" download class="kb-attachment-name" title="Baixar / Abrir">${escapeHtml(att.name)}</a>
                    <span class="kb-attachment-size">(${escapeHtml(att.size)})</span>
                </div>
                <div class="kb-attachment-actions">
                    <a href="${escapeAttr(att.url)}" target="_blank" download class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.75rem;">⬇️ Baixar</a>
                </div>
            </div>
          `).join('') + `</div>`
        : `<div class="text-muted" style="font-size:0.85rem; font-style:italic;">Nenhum anexo adicionado a este artigo.</div>`;

    const sections = [
        { label: 'Tarefa Vinculada', value: article.taskTitle ? `#${article.taskId} — ${article.taskTitle}` : '—', isHtml: false },
        { label: 'Causa do Incidente', value: article.cause || '—', isHtml: true },
        { label: 'Análise', value: article.analysis || '—', isHtml: true },
        { label: 'Resolução', value: article.resolution || '—', isHtml: true },
        { label: `📎 Anexos (${article.attachments ? article.attachments.length : 0})`, value: attachmentsListHtml, isHtml: true }
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
    pendingFiles = [];
    currentModalAttachments = article && article.attachments ? [...article.attachments] : [];

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
                        #${t.id} — ${escapeHtml(t.text || t.title)}
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
        </div>
        <div class="form-group" id="group-attachments">
            <label class="form-label">📎 Anexos do Artigo</label>
            <div class="kb-attachments-section">
                <div id="kb-modal-attachments-list" class="kb-attachment-list"></div>
                <div class="kb-upload-box">
                    <input type="file" id="kb-file-input" multiple style="display: none;">
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-add-kb-attachment">
                        📎 Selecionar Arquivos
                    </button>
                    <span id="kb-upload-status" class="kb-upload-status" style="font-size: 0.8rem; color: #666;"></span>
                </div>
            </div>
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

    // Renderizar lista de anexos e ligar eventos de upload
    renderModalAttachmentsList();

    const btnAddAttachment = document.getElementById('btn-add-kb-attachment');
    const fileInput = document.getElementById('kb-file-input');

    if (btnAddAttachment && fileInput) {
        btnAddAttachment.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (!e.target.files || e.target.files.length === 0) return;
            if (editingId) {
                uploadImmediateFiles(editingId, e.target.files);
            } else {
                Array.from(e.target.files).forEach(f => pendingFiles.push(f));
                renderModalAttachmentsList();
            }
            fileInput.value = '';
        });
    }

    openModal();
    const titleInput = document.getElementById('form-title');
    if (titleInput) titleInput.focus();
}

function openModal() {
    if (modalOverlay) modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ── Salvar (lê os campos do modal-body injetado) ──
if (btnSave) {
    btnSave.addEventListener('click', async () => {
        const titleInput   = document.getElementById('form-title');
        const taskIdInput  = document.getElementById('form-task-id');
        const causeEditor      = document.getElementById('rich-cause');
        const analysisEditor   = document.getElementById('rich-analysis');
        const resolutionEditor = document.getElementById('rich-resolution');

        if (!titleInput) return;

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

        titleInput.style.borderColor = '';

        const payload = { title, cause, analysis, resolution, taskId };

        btnSave.disabled = true;
        btnSave.textContent = '⏳ Salvando...';

        try {
            let res;
            let resData = null;

            if (editingId) {
                res = await fetch(`${API_BASE}/knowledge.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingId, ...payload })
                });
                if (res.ok) resData = await res.json().catch(() => ({}));
            } else {
                res = await fetch(`${API_BASE}/knowledge.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) resData = await res.json().catch(() => ({}));
            }

            if (res.ok) {
                const articleId = editingId || (resData ? resData.id : null);
                if (articleId && pendingFiles.length > 0) {
                    await uploadPendingFiles(articleId);
                }
                closeModal();
                await loadArticles(searchKbInput ? searchKbInput.value.trim() : '');
            } else {
                const errData = resData || await res.json().catch(() => ({}));
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
}

// ── Excluir ──
async function deleteArticle(id) {
    if (!confirm('Tem certeza que deseja excluir este artigo da base de conhecimento?')) return;
    try {
        const res = await fetch(`${API_BASE}/knowledge.php?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            await loadArticles(searchKbInput ? searchKbInput.value.trim() : '');
        }
    } catch (err) {
        console.error('Erro ao excluir artigo:', err);
    }
}

// ── Busca com debounce ──
let kbDebounce = null;
if (searchKbInput) {
    searchKbInput.addEventListener('input', (e) => {
        clearTimeout(kbDebounce);
        kbDebounce = setTimeout(() => loadArticles(e.target.value.trim()), 300);
    });
    searchKbInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { searchKbInput.value = ''; loadArticles(); }
    });
}

// ── Eventos do modal ──
if (btnNew) btnNew.addEventListener('click', () => openEdit());
if (btnCancel) btnCancel.addEventListener('click', closeModal);
if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
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
        null,
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
            e.preventDefault();
            saveSelection();
            tool.cmd();
        });
        toolbar.appendChild(btn);
        toolBtns.push(btn);
    });

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
