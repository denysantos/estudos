// ============================================================
// 1. Seleção dos elementos do DOM
// ============================================================
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const addColumnBtn = document.getElementById('add-column-btn');
const kanbanBoard = document.getElementById('kanban-board');
const metricsGrid = document.getElementById('metrics-grid');
const searchInput = document.getElementById('search-input');

// ============================================================
// 2. Variáveis de estado global
// ============================================================
let draggedTaskId = null;
let draggedColumnId = null;
let columns = [];
let tasks = [];
let searchQuery = '';
let searchDebounce = null;

const API_BASE = 'api';
const CARDS_PER_PAGE = 5;

// ============================================================
// 3. Auxiliares
// ============================================================
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatDuration(startTimestamp, endTimestamp) {
    if (!startTimestamp || !endTimestamp) return '-';
    const diffMs = endTimestamp - startTimestamp;
    if (diffMs < 0) return '-';
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    return `${days}d ${hours}h ${minutes}min`;
}

// Escape simples para highlight
function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(re, '<mark class="search-highlight">$1</mark>');
}

// ============================================================
// 4. Inicialização
// ============================================================
async function initData() {
    try {
        const [resCols, resTasks] = await Promise.all([
            fetch(`${API_BASE}/columns.php`),
            fetch(`${API_BASE}/tasks.php`)
        ]);
        if (resCols.ok && resTasks.ok) {
            columns = await resCols.json();
            tasks = await resTasks.json();
            renderBoard();
        } else {
            console.error('Erro ao carregar dados do MariaDB.');
        }
    } catch (err) {
        console.error('Falha de comunicação com a API:', err);
    }
}

// ============================================================
// 5. Dashboard de Métricas
// ============================================================
function renderDashboard() {
    metricsGrid.innerHTML = '';

    const totalCard = document.createElement('div');
    totalCard.className = 'metric-card metric-total';
    totalCard.innerHTML = `<span class="metric-label">Total Geral</span>
                           <span class="metric-value">${tasks.length}</span>`;
    metricsGrid.appendChild(totalCard);

    columns.forEach((column) => {
        const count = tasks.filter(t => t.columnId === column.id).length;
        const colCard = document.createElement('div');
        colCard.className = 'metric-card';
        colCard.innerHTML = `<span class="metric-label">${escapeHtml(column.title)}</span>
                             <span class="metric-value">${count}</span>`;
        metricsGrid.appendChild(colCard);
    });
}

// ============================================================
// 6. Renderização do Quadro Kanban
// ============================================================
function renderBoard() {
    renderDashboard();
    kanbanBoard.innerHTML = '';

    const query = searchQuery.trim().toLowerCase();

    columns.forEach((column) => {
        if (!column.currentPage) column.currentPage = 1;

        const colDiv = document.createElement('div');
        colDiv.className = 'kanban-column';
        colDiv.dataset.columnId = column.id;

        // ── Cabeçalho da coluna (arrasto de coluna) ──
        const colHeader = document.createElement('div');
        colHeader.className = 'column-header';
        colHeader.draggable = true;
        colHeader.title = 'Arraste para reordenar a coluna';

        colHeader.addEventListener('dragstart', (e) => {
            draggedColumnId = column.id;
            draggedTaskId = null;
            colDiv.classList.add('column-dragging');
            e.dataTransfer.setData('text/plain', `col:${column.id}`);
            e.dataTransfer.effectAllowed = 'move';
        });

        colHeader.addEventListener('dragend', () => {
            colDiv.classList.remove('column-dragging');
            draggedColumnId = null;
        });

        colDiv.addEventListener('dragover', (e) => {
            if (draggedColumnId !== null && draggedColumnId !== column.id) {
                e.preventDefault();
                colDiv.classList.add('column-drag-over');
            }
        });

        colDiv.addEventListener('dragleave', (e) => {
            if (!colDiv.contains(e.relatedTarget)) {
                colDiv.classList.remove('column-drag-over');
            }
        });

        colDiv.addEventListener('drop', (e) => {
            colDiv.classList.remove('column-drag-over');
            if (draggedColumnId !== null && draggedColumnId !== column.id) {
                e.preventDefault();
                e.stopPropagation();
                reorderColumns(draggedColumnId, column.id);
            }
        });

        const titleContainer = document.createElement('div');
        titleContainer.className = 'column-title-container';

        const dragHandle = document.createElement('span');
        dragHandle.className = 'column-drag-handle';
        dragHandle.innerHTML = '⠿';
        dragHandle.title = 'Arrastar coluna';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'column-title';
        titleSpan.textContent = column.title;

        const colTasks = tasks.filter(t => t.columnId === column.id);

        // Filtrar por busca
        const visibleTasks = query
            ? colTasks.filter(t =>
                t.text.toLowerCase().includes(query) ||
                (t.description && t.description.toLowerCase().includes(query)))
            : colTasks;

        const badge = document.createElement('span');
        badge.className = 'column-badge';
        badge.textContent = query ? `${visibleTasks.length}/${colTasks.length}` : colTasks.length;

        titleContainer.appendChild(dragHandle);
        titleContainer.appendChild(titleSpan);
        titleContainer.appendChild(badge);

        const actionsMenu = document.createElement('div');
        actionsMenu.className = 'column-actions-menu';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-icon';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Renomear coluna';
        editBtn.addEventListener('click', (e) => { e.stopPropagation(); renameColumn(column.id); });

        const deleteColBtn = document.createElement('button');
        deleteColBtn.className = 'btn-icon btn-icon-danger';
        deleteColBtn.innerHTML = '🗑️';
        deleteColBtn.title = 'Excluir coluna';
        deleteColBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteColumn(column.id); });

        actionsMenu.appendChild(editBtn);
        actionsMenu.appendChild(deleteColBtn);

        colHeader.appendChild(titleContainer);
        colHeader.appendChild(actionsMenu);

        // ── Corpo da coluna (drop de cards) ──
        const colBody = document.createElement('div');
        colBody.className = 'column-body';
        colBody.dataset.columnId = column.id;

        colBody.addEventListener('dragover', (e) => {
            if (draggedTaskId !== null) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                colBody.classList.add('drag-over');
            }
        });

        colBody.addEventListener('dragleave', () => colBody.classList.remove('drag-over'));

        colBody.addEventListener('drop', (e) => {
            colBody.classList.remove('drag-over');
            if (draggedTaskId !== null) {
                e.preventDefault();
                moveTaskToColumn(draggedTaskId, column.id);
            }
        });

        // Paginação sobre tasks visíveis
        const totalPages = Math.max(1, Math.ceil(visibleTasks.length / CARDS_PER_PAGE));
        if (column.currentPage > totalPages) column.currentPage = totalPages;

        const startIdx = (column.currentPage - 1) * CARDS_PER_PAGE;
        const pageTasks = visibleTasks.slice(startIdx, startIdx + CARDS_PER_PAGE);

        if (visibleTasks.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-column';
            emptyState.textContent = query ? '🔍 Nenhum resultado nesta coluna' : 'Arraste tarefas para cá';
            colBody.appendChild(emptyState);
        } else {
            pageTasks.forEach((task) => {
                const taskCard = createTaskCard(task, query);
                colBody.appendChild(taskCard);
            });
        }

        // ── Rodapé de Paginação ──
        const pagination = document.createElement('div');
        pagination.className = 'column-pagination';

        if (totalPages > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'pagination-btn';
            prevBtn.textContent = '‹';
            prevBtn.title = 'Página anterior';
            prevBtn.disabled = column.currentPage === 1;
            prevBtn.addEventListener('click', () => {
                column.currentPage--;
                renderBoard();
            });

            const pageInfo = document.createElement('span');
            pageInfo.className = 'pagination-info';
            pageInfo.textContent = `${column.currentPage} / ${totalPages}`;

            const nextBtn = document.createElement('button');
            nextBtn.className = 'pagination-btn';
            nextBtn.textContent = '›';
            nextBtn.title = 'Próxima página';
            nextBtn.disabled = column.currentPage === totalPages;
            nextBtn.addEventListener('click', () => {
                column.currentPage++;
                renderBoard();
            });

            pagination.appendChild(prevBtn);
            pagination.appendChild(pageInfo);
            pagination.appendChild(nextBtn);
        }

        colDiv.appendChild(colHeader);
        colDiv.appendChild(colBody);
        colDiv.appendChild(pagination);
        kanbanBoard.appendChild(colDiv);
    });
}

// ============================================================
// 7. Criação do Card de Tarefa
// ============================================================
function createTaskCard(task, query = '') {
    const isEditing = !!task.isEditing;

    const card = document.createElement('div');
    card.className = 'task-card' + (isEditing ? ' is-editing' : '');
    card.draggable = !isEditing;
    card.dataset.taskId = task.id;

    // ── Cabeçalho ──
    const cardHeader = document.createElement('div');
    cardHeader.className = 'task-card-header';

    const idBadge = document.createElement('span');
    idBadge.className = 'task-card-id';
    idBadge.textContent = `#${task.id}`;

    const textSpan = document.createElement('span');
    textSpan.className = 'task-card-text clickable';
    if (query) {
        textSpan.innerHTML = highlightText(task.text, query);
    } else {
        textSpan.textContent = task.text;
    }
    textSpan.title = 'Clique para visualizar detalhes';
    textSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        openTaskModal(task);
    });

    const headerActions = document.createElement('div');
    headerActions.className = 'task-card-header-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'task-card-view-btn';
    viewBtn.textContent = '👁';
    viewBtn.title = 'Visualizar detalhes';
    viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTaskModal(task);
    });

    const editToggleBtn = document.createElement('button');
    editToggleBtn.className = 'task-card-edit-toggle';
    editToggleBtn.textContent = isEditing ? '▲' : '✏️';
    editToggleBtn.title = isEditing ? 'Fechar edição' : 'Editar tarefa';
    editToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        task.isEditing = !task.isEditing;
        renderBoard();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-card-delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Excluir tarefa';
    deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); removeTask(task.id); });

    headerActions.appendChild(viewBtn);
    headerActions.appendChild(editToggleBtn);
    headerActions.appendChild(deleteBtn);
    cardHeader.appendChild(idBadge);
    cardHeader.appendChild(textSpan);
    cardHeader.appendChild(headerActions);

    // ── Badges compactos (somente ícones) ──
    const badgesRow = document.createElement('div');
    badgesRow.className = 'task-card-badges';

    const complexityIcons = { alta: '🔴', normal: '🔵', baixa: '🟢' };
    const complexityTitles = { alta: 'Complexidade: Alta', normal: 'Complexidade: Normal', baixa: 'Complexidade: Baixa' };
    const criticalityIcons = { alta: '🔥', normal: '🔵', baixa: '🟢' };
    const criticalityTitles = { alta: 'Criticidade: Alta', normal: 'Criticidade: Normal', baixa: 'Criticidade: Baixa' };
    const priorityIcons = { alta: '🚨', normal: '🔵', baixa: '🟢' };
    const priorityTitles = { alta: 'Prioridade: Alta', normal: 'Prioridade: Normal', baixa: 'Prioridade: Baixa' };

    const cxVal = task.complexity || 'normal';
    const crVal = task.criticality || 'normal';
    const prVal = task.priority || 'normal';

    const cxBadge = document.createElement('span');
    cxBadge.className = `badge badge-complexity-${cxVal}`;
    cxBadge.textContent = complexityIcons[cxVal];
    cxBadge.title = complexityTitles[cxVal];

    const crBadge = document.createElement('span');
    crBadge.className = `badge badge-criticality-${crVal}`;
    crBadge.textContent = criticalityIcons[crVal];
    crBadge.title = criticalityTitles[crVal];

    const prBadge = document.createElement('span');
    prBadge.className = `badge badge-priority-${prVal}`;
    prBadge.textContent = priorityIcons[prVal];
    prBadge.title = priorityTitles[prVal];

    badgesRow.appendChild(cxBadge);
    badgesRow.appendChild(crBadge);
    badgesRow.appendChild(prBadge);

    // ── Área expandida ──
    const expandable = document.createElement('div');
    expandable.className = 'task-card-expandable';

    // Seletores de classificação
    const classGrid = document.createElement('div');
    classGrid.className = 'classification-grid';

    function makeClassSelect(label, fieldName, currentVal, options) {
        const item = document.createElement('div');
        item.className = 'classification-item';

        const lbl = document.createElement('label');
        lbl.className = 'classification-label';
        lbl.textContent = label;

        const sel = document.createElement('select');
        sel.className = 'classification-select';

        options.forEach(([val, text]) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = text;
            if (val === currentVal) opt.selected = true;
            sel.appendChild(opt);
        });

        sel.addEventListener('change', async (e) => {
            e.stopPropagation();
            task[fieldName] = sel.value;
            await updateTaskClassification(task.id, fieldName, sel.value);
            // Atualizar badge correspondente sem rerenderizar
            const prefixMap = { complexity: 'badge-complexity', criticality: 'badge-criticality', priority: 'badge-priority' };
            const iconMaps = { complexity: complexityIcons, criticality: criticalityIcons, priority: priorityIcons };
            const titleMaps = { complexity: complexityTitles, criticality: criticalityTitles, priority: priorityTitles };
            const prefix = prefixMap[fieldName];
            const oldBadge = card.querySelector(`[class*="${prefix}"]`);
            if (oldBadge) {
                oldBadge.className = `badge ${prefix}-${sel.value}`;
                oldBadge.textContent = iconMaps[fieldName][sel.value];
                oldBadge.title = titleMaps[fieldName][sel.value];
            }
        });

        item.appendChild(lbl);
        item.appendChild(sel);
        return item;
    }

    classGrid.appendChild(makeClassSelect('Complexidade', 'complexity', cxVal, [['alta', 'Alta'], ['normal', 'Normal'], ['baixa', 'Baixa']]));
    classGrid.appendChild(makeClassSelect('Criticidade', 'criticality', crVal, [['alta', 'Alta'], ['normal', 'Normal'], ['baixa', 'Baixa']]));
    classGrid.appendChild(makeClassSelect('Prioridade', 'priority', prVal, [['alta', 'Alta'], ['normal', 'Normal'], ['baixa', 'Baixa']]));
    expandable.appendChild(classGrid);

    // Descrição
    const descSection = document.createElement('div');
    descSection.className = 'task-description-section';

    const descHeader = document.createElement('div');
    descHeader.className = 'description-header';

    const descTitle = document.createElement('span');
    descTitle.textContent = '📋 Explicação do Incidente';

    const editDescBtn = document.createElement('button');
    editDescBtn.className = 'btn-icon';
    editDescBtn.textContent = task.isEditingDescription ? 'Cancelar' : '✏️ Editar';
    editDescBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        task.isEditingDescription = !task.isEditingDescription;
        renderBoard();
    });

    descHeader.appendChild(descTitle);
    descHeader.appendChild(editDescBtn);
    descSection.appendChild(descHeader);

    if (task.isEditingDescription) {
        const descEditor = document.createElement('div');
        descEditor.className = 'description-editor';

        const textarea = document.createElement('textarea');
        textarea.className = 'description-textarea';
        textarea.placeholder = 'Digite aqui a explicação detalhada do incidente...';
        textarea.value = task.description || '';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'description-actions';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary btn-sm';
        saveBtn.textContent = 'Salvar';
        saveBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await updateTaskDescription(task.id, textarea.value.trim());
        });

        actionsDiv.appendChild(saveBtn);
        descEditor.appendChild(textarea);
        descEditor.appendChild(actionsDiv);
        descSection.appendChild(descEditor);
    } else {
        if (task.description && task.description.trim() !== '') {
            const descText = document.createElement('div');
            descText.className = 'description-text';
            if (query) {
                descText.innerHTML = highlightText(task.description, query);
            } else {
                descText.textContent = task.description;
            }
            descSection.appendChild(descText);
        } else {
            const emptyDesc = document.createElement('div');
            emptyDesc.className = 'description-empty';
            emptyDesc.textContent = '+ Clique em Editar para adicionar os detalhes do incidente.';
            emptyDesc.addEventListener('click', (e) => {
                e.stopPropagation();
                task.isEditingDescription = true;
                renderBoard();
            });
            descSection.appendChild(emptyDesc);
        }
    }

    // Anexos
    const attachSection = document.createElement('div');
    attachSection.className = 'task-attachments-section';

    const attachHeader = document.createElement('div');
    attachHeader.className = 'attachments-header';

    const attachTitle = document.createElement('span');
    attachTitle.textContent = `📎 Anexos (${task.attachments ? task.attachments.length : 0})`;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.style.display = 'none';

    const addAttachBtn = document.createElement('button');
    addAttachBtn.className = 'btn-icon';
    addAttachBtn.textContent = '+ Anexar';
    addAttachBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });

    fileInput.addEventListener('change', async (e) => {
        e.stopPropagation();
        if (e.target.files.length > 0) await uploadAttachments(task.id, e.target.files);
    });

    attachHeader.appendChild(attachTitle);
    attachHeader.appendChild(addAttachBtn);
    attachSection.appendChild(attachHeader);
    attachSection.appendChild(fileInput);

    if (task.attachments && task.attachments.length > 0) {
        const attachList = document.createElement('div');
        attachList.className = 'attachment-list';

        task.attachments.forEach((attachment) => {
            const item = document.createElement('div');
            item.className = 'attachment-item';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'attachment-info';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'attachment-name';
            nameSpan.textContent = `📄 ${attachment.name}`;
            nameSpan.title = attachment.name;

            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'attachment-size';
            sizeSpan.textContent = `(${attachment.size})`;

            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(sizeSpan);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'attachment-actions';

            const openLink = document.createElement('a');
            openLink.className = 'attachment-link';
            openLink.textContent = 'Abrir';
            openLink.href = attachment.url;
            openLink.target = '_blank';
            openLink.addEventListener('click', (e) => e.stopPropagation());

            const removeBtn = document.createElement('button');
            removeBtn.className = 'attachment-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remover anexo';
            removeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await removeAttachment(task.id, attachment.id);
            });

            actionsDiv.appendChild(openLink);
            actionsDiv.appendChild(removeBtn);
            item.appendChild(infoDiv);
            item.appendChild(actionsDiv);
            attachList.appendChild(item);
        });

        attachSection.appendChild(attachList);
    }

    // Metadados
    const cardMeta = document.createElement('div');
    cardMeta.className = 'task-card-meta';
    cardMeta.innerHTML = `
        <div class="meta-row"><span><strong>Criada:</strong> ${task.createdAt}</span></div>
        <div class="meta-row"><span><strong>Concluída:</strong> ${task.completedAt}</span></div>
        <div class="meta-row"><span><strong>Duração:</strong> ${task.duration}</span></div>`;

    expandable.appendChild(descSection);
    expandable.appendChild(attachSection);
    expandable.appendChild(cardMeta);

    card.appendChild(cardHeader);
    card.appendChild(badgesRow);
    card.appendChild(expandable);

    // Drag & Drop de cards
    card.addEventListener('dragstart', (e) => {
        if (isEditing) { e.preventDefault(); return; }
        draggedTaskId = task.id;
        draggedColumnId = null;
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedTaskId = null;
    });

    return card;
}

// ============================================================
// 8. Reordenar Colunas (arrastar)
// ============================================================
function reorderColumns(fromId, toId) {
    const fromIdx = columns.findIndex(c => c.id === fromId);
    const toIdx = columns.findIndex(c => c.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    // Troca no array local
    const [moved] = columns.splice(fromIdx, 1);
    columns.splice(toIdx, 0, moved);

    // Atualiza posições
    columns.forEach((col, idx) => { col.position = idx + 1; });

    renderBoard();

    // Persiste no banco
    fetch(`${API_BASE}/columns.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'reorder',
            positions: columns.map((c, i) => ({ id: c.id, position: i + 1 }))
        })
    }).catch(err => console.error('Erro ao reordenar colunas:', err));
}

// ============================================================
// 9. Busca
// ============================================================
function applySearch(value) {
    searchQuery = value.trim().toLowerCase();
    // Reset de página ao buscar
    columns.forEach(c => c.currentPage = 1);
    renderBoard();
}

// ============================================================
// 10. Adicionar Tarefa
// ============================================================
async function addTask(text) {
    if (columns.length === 0) {
        alert('Crie ao menos uma coluna antes de adicionar tarefas.');
        return;
    }
    const firstColumn = columns[0];
    try {
        const res = await fetch(`${API_BASE}/tasks.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, columnId: firstColumn.id })
        });
        if (res.ok) {
            tasks.push(await res.json());
            renderBoard();
        }
    } catch (err) {
        console.error('Erro ao adicionar tarefa:', err);
    }
}

// ============================================================
// 11. Mover Tarefa entre Colunas
// ============================================================
async function moveTaskToColumn(taskId, targetColumnId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.columnId === targetColumnId) return;

    const targetColumn = columns.find(c => c.id === targetColumnId);
    if (!targetColumn) return;

    task.columnId = targetColumnId;

    let completedTimestamp = null, completedAtStr = '-', durationStr = '-';
    if (targetColumn.isDoneColumn) {
        const now = Date.now();
        completedTimestamp = now;
        completedAtStr = formatDate(now);
        durationStr = formatDuration(task.createdTimestamp, now);
    }
    task.completedTimestamp = completedTimestamp;
    task.completedAt = completedAtStr;
    task.duration = durationStr;

    renderBoard();

    try {
        await fetch(`${API_BASE}/tasks.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: task.id,
                columnId: targetColumnId,
                completedTimestamp,
                duration: durationStr
            })
        });
    } catch (err) {
        console.error('Erro ao mover tarefa:', err);
    }
}

// ============================================================
// 12. Atualizar Descrição
// ============================================================
async function updateTaskDescription(taskId, newDescription) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    task.description = newDescription;
    task.isEditingDescription = false;
    renderBoard();
    try {
        await fetch(`${API_BASE}/tasks.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: taskId, description: newDescription })
        });
    } catch (err) {
        console.error('Erro ao salvar descrição:', err);
    }
}

// ============================================================
// 13. Atualizar Classificação
// ============================================================
async function updateTaskClassification(taskId, field, value) {
    try {
        await fetch(`${API_BASE}/tasks.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: taskId, [field]: value })
        });
    } catch (err) {
        console.error('Erro ao salvar classificação:', err);
    }
}

// ============================================================
// 14. Upload de Anexos
// ============================================================
async function uploadAttachments(taskId, files) {
    const formData = new FormData();
    formData.append('taskId', taskId);
    Array.from(files).forEach((file) => formData.append('files[]', file));
    try {
        const res = await fetch(`${API_BASE}/attachments.php`, { method: 'POST', body: formData });
        if (res.ok) {
            const newAttachments = await res.json();
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                if (!task.attachments) task.attachments = [];
                task.attachments.push(...newAttachments);
                renderBoard();
            }
        }
    } catch (err) {
        console.error('Erro ao fazer upload de anexo:', err);
    }
}

// ============================================================
// 15. Remover Anexo
// ============================================================
async function removeAttachment(taskId, attachmentId) {
    try {
        const res = await fetch(`${API_BASE}/attachments.php?id=${attachmentId}`, { method: 'DELETE' });
        if (res.ok) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.attachments = task.attachments.filter(att => att.id !== attachmentId);
                renderBoard();
            }
        }
    } catch (err) {
        console.error('Erro ao remover anexo:', err);
    }
}

// ============================================================
// 16. Remover Tarefa
// ============================================================
async function removeTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!confirm(`Tem certeza que deseja excluir a tarefa #${task.id} ("${task.text}") do banco de dados?`)) return;
    try {
        const res = await fetch(`${API_BASE}/tasks.php?id=${taskId}`, { method: 'DELETE' });
        if (res.ok) {
            tasks = tasks.filter(t => t.id !== taskId);
            renderBoard();
        }
    } catch (err) {
        console.error('Erro ao remover tarefa:', err);
    }
}

// ============================================================
// 17. Modal de Visualização de Tarefa
// ============================================================
const taskModalOverlay = document.getElementById('task-modal-overlay');
const taskModalIdBadge  = document.getElementById('task-modal-id');
const taskModalTitleEl  = document.getElementById('task-modal-title');
const taskModalBody     = document.getElementById('task-modal-body');
const taskModalCloseBtn = document.getElementById('task-modal-close');

function openTaskModal(task) {
    taskModalIdBadge.textContent = `#${task.id}`;
    taskModalTitleEl.textContent = task.text;
    taskModalBody.innerHTML = '';

    // ── Badges ──
    const badgesSection = document.createElement('div');
    badgesSection.className = 'task-modal-badges';

    const complexityMap = { alta: { icon: '🔴', label: 'Alta Complexidade' }, normal: { icon: '🔵', label: 'Complexidade Normal' }, baixa: { icon: '🟢', label: 'Baixa Complexidade' } };
    const criticalityMap = { alta: { icon: '🔥', label: 'Alta Criticidade' }, normal: { icon: '🔵', label: 'Criticidade Normal' }, baixa: { icon: '🟢', label: 'Baixa Criticidade' } };
    const priorityMap = { alta: { icon: '🚨', label: 'Alta Prioridade' }, normal: { icon: '🔵', label: 'Prioridade Normal' }, baixa: { icon: '🟢', label: 'Baixa Prioridade' } };

    const cxVal = task.complexity  || 'normal';
    const crVal = task.criticality || 'normal';
    const prVal = task.priority    || 'normal';

    [[complexityMap, cxVal], [criticalityMap, crVal], [priorityMap, prVal]].forEach(([map, val]) => {
        const badge = document.createElement('span');
        badge.className = `task-modal-badge-item badge-${val}`;
        badge.textContent = `${map[val].icon} ${map[val].label}`;
        badgesSection.appendChild(badge);
    });

    taskModalBody.appendChild(badgesSection);
    taskModalBody.appendChild(createModalDivider());

    // ── Descrição ──
    const descSection = document.createElement('div');
    descSection.className = 'task-modal-section';
    const descLabel = document.createElement('div');
    descLabel.className = 'task-modal-section-label';
    descLabel.textContent = '📋 Explicação do Incidente';
    const descContent = document.createElement('div');
    descContent.className = 'task-modal-section-content' + (task.description && task.description.trim() ? '' : ' empty');
    descContent.textContent = (task.description && task.description.trim()) ? task.description : 'Nenhuma descrição adicionada.';
    descSection.appendChild(descLabel);
    descSection.appendChild(descContent);
    taskModalBody.appendChild(descSection);

    // ── Anexos ──
    if (task.attachments && task.attachments.length > 0) {
        taskModalBody.appendChild(createModalDivider());
        const attachSection = document.createElement('div');
        attachSection.className = 'task-modal-section';
        const attachLabel = document.createElement('div');
        attachLabel.className = 'task-modal-section-label';
        attachLabel.textContent = `📎 Anexos (${task.attachments.length})`;
        attachSection.appendChild(attachLabel);

        const attachList = document.createElement('div');
        attachList.className = 'task-modal-attach-list';
        task.attachments.forEach(att => {
            const item = document.createElement('div');
            item.className = 'task-modal-attach-item';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'task-modal-attach-name';
            nameSpan.textContent = `📄 ${att.name}`;
            nameSpan.title = att.name;
            const link = document.createElement('a');
            link.className = 'task-modal-attach-link';
            link.textContent = 'Abrir';
            link.href = att.url;
            link.target = '_blank';
            item.appendChild(nameSpan);
            item.appendChild(link);
            attachList.appendChild(item);
        });
        attachSection.appendChild(attachList);
        taskModalBody.appendChild(attachSection);
    }

    // ── Metadados ──
    taskModalBody.appendChild(createModalDivider());
    const metaGrid = document.createElement('div');
    metaGrid.className = 'task-modal-meta';
    [
        { label: 'Criada em', value: task.createdAt || '-' },
        { label: 'Concluída em', value: task.completedAt || '-' },
        { label: 'Duração', value: task.duration || '-' }
    ].forEach(({ label, value }) => {
        const item = document.createElement('div');
        item.className = 'task-modal-meta-item';
        const lbl = document.createElement('div');
        lbl.className = 'task-modal-meta-label';
        lbl.textContent = label;
        const val = document.createElement('div');
        val.className = 'task-modal-meta-value';
        val.textContent = value;
        item.appendChild(lbl);
        item.appendChild(val);
        metaGrid.appendChild(item);
    });
    taskModalBody.appendChild(metaGrid);

    // Abre o modal
    taskModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function createModalDivider() {
    const hr = document.createElement('hr');
    hr.className = 'task-modal-divider';
    return hr;
}

function closeTaskModal() {
    taskModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

taskModalCloseBtn.addEventListener('click', closeTaskModal);
taskModalOverlay.addEventListener('click', (e) => { if (e.target === taskModalOverlay) closeTaskModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTaskModal(); });

// ============================================================
// 18. Adicionar Coluna
// ============================================================
async function addColumn() {
    const title = prompt('Digite o nome da nova coluna:');
    if (!title || !title.trim()) return;
    const newColTitle = title.trim();
    const lower = newColTitle.toLowerCase();
    const isDone = lower.includes('conclua') || lower.includes('conclu') || lower.includes('pronto') || lower.includes('feito');
    try {
        const res = await fetch(`${API_BASE}/columns.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newColTitle, isDoneColumn: isDone })
        });
        if (res.ok) {
            columns.push(await res.json());
            renderBoard();
        }
    } catch (err) {
        console.error('Erro ao adicionar coluna:', err);
    }
}

// ============================================================
// 19. Renomear Coluna
// ============================================================
async function renameColumn(columnId) {
    const column = columns.find(c => c.id === columnId);
    if (!column) return;
    const newTitle = prompt('Digite o novo nome para a coluna:', column.title);
    if (!newTitle || !newTitle.trim()) return;
    const trimmed = newTitle.trim();
    const lower = trimmed.toLowerCase();
    const isDone = lower.includes('conclua') || lower.includes('conclu') || lower.includes('pronto') || lower.includes('feito');
    try {
        const res = await fetch(`${API_BASE}/columns.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: columnId, title: trimmed, isDoneColumn: isDone })
        });
        if (res.ok) {
            column.title = trimmed;
            column.isDoneColumn = isDone;
            renderBoard();
        }
    } catch (err) {
        console.error('Erro ao renomear coluna:', err);
    }
}

// ============================================================
// 20. Excluir Coluna
// ============================================================
async function deleteColumn(columnId) {
    if (columns.length <= 1) {
        alert('Não é possível excluir a única coluna restante no quadro.');
        return;
    }
    const colToDelete = columns.find(c => c.id === columnId);
    if (!colToDelete) return;

    const colTasks = tasks.filter(t => t.columnId === columnId);
    const fallbackColumn = columns.find(c => c.id !== columnId);

    if (colTasks.length > 0) {
        if (!confirm(`A coluna "${colToDelete.title}" possui ${colTasks.length} tarefa(s).\nAs tarefas serão movidas para "${fallbackColumn.title}". Deseja continuar?`)) return;
    } else {
        if (!confirm(`Tem certeza que deseja excluir a coluna "${colToDelete.title}"?`)) return;
    }

    try {
        const res = await fetch(`${API_BASE}/columns.php?id=${columnId}`, { method: 'DELETE' });
        if (res.ok) {
            tasks.forEach(t => { if (t.columnId === columnId) t.columnId = fallbackColumn.id; });
            columns = columns.filter(c => c.id !== columnId);
            renderBoard();
        }
    } catch (err) {
        console.error('Erro ao excluir coluna:', err);
    }
}

// ============================================================
// 21. EventListeners Globais
// ============================================================
document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const textValue = taskInput.value.trim();
    if (textValue !== '') {
        addTask(textValue);
        taskInput.value = '';
        taskInput.focus();
    }
});

addColumnBtn.addEventListener('click', addColumn);

searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => applySearch(e.target.value), 250);
});

// Limpar busca com Escape
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        searchInput.value = '';
        applySearch('');
    }
});

// Botão ✕ de limpar busca
const searchClearBtn = document.getElementById('search-clear-btn');
if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        applySearch('');
        searchInput.focus();
    });
}

// Inicializar
initData();
