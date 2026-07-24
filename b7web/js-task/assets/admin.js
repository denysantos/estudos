/**
 * Lógica do Painel de Administração: Usuários, Definição de Metas e Relatórios de SLA
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Navegação por Abas
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetTab)?.classList.add('active');

            if (targetTab === 'tab-users') loadUsers();
            if (targetTab === 'tab-slas') loadSlaGoals();
            if (targetTab === 'tab-report') loadSlaReport();
        });
    });

    // Carregar aba inicial
    loadUsers();
    loadSlaGoals();

    // 2. Formulário de Cadastro de Usuário
    const createUserForm = document.getElementById('create-user-form');
    const userAlert = document.getElementById('user-form-alert');

    createUserForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showAlert(userAlert, '', 'none');

        const name = document.getElementById('new-user-name').value.trim();
        const username = document.getElementById('new-username').value.trim();
        const password = document.getElementById('new-password').value.trim();
        const role = document.getElementById('new-user-role').value;

        try {
            const res = await fetch('api/users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, password, role })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao cadastrar usuário.');
            }

            showAlert(userAlert, `✅ Usuário "${name}" cadastrado com sucesso!`, 'success');
            createUserForm.reset();
            loadUsers();
        } catch (err) {
            showAlert(userAlert, `❌ ${err.message}`, 'error');
        }
    });

    // 3. Formulário de Metas de SLA
    const slaGoalsForm = document.getElementById('sla-goals-form');
    const slaAlert = document.getElementById('sla-form-alert');

    slaGoalsForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showAlert(slaAlert, '', 'none');

        const hoursAlta = parseInt(document.getElementById('sla-hours-alta').value, 10);
        const hoursNormal = parseInt(document.getElementById('sla-hours-normal').value, 10);
        const hoursBaixa = parseInt(document.getElementById('sla-hours-baixa').value, 10);

        const goals = [
            { criticality: 'alta', max_hours: hoursAlta },
            { criticality: 'normal', max_hours: hoursNormal },
            { criticality: 'baixa', max_hours: hoursBaixa }
        ];

        try {
            const res = await fetch('api/slas.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goals)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao salvar metas de SLA.');
            }

            showAlert(slaAlert, '✅ Metas de SLA atualizadas com sucesso!', 'success');
        } catch (err) {
            showAlert(slaAlert, `❌ ${err.message}`, 'error');
        }
    });
});

// Carregar lista de usuários
async function loadUsers() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    try {
        const res = await fetch('api/users.php');
        const users = await res.json();

        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${users.error || 'Erro ao carregar usuários.'}</td></tr>`;
            return;
        }

        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center">Nenhum usuário cadastrado.</td></tr>`;
            return;
        }

        const currentUser = window.Auth?.currentUser;

        tbody.innerHTML = users.map(u => {
            const roleBadge = u.role === 'admin' ? '<span class="badge badge-admin">Administrador</span>' : '<span class="badge badge-user">Usuário</span>';
            const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-';
            const isSelf = currentUser && currentUser.id === parseInt(u.id, 10);

            const deleteBtn = isSelf 
                ? '<span class="text-muted" title="Sessão Atual">(Você)</span>' 
                : `<button class="btn-action btn-delete-sm" onclick="deleteUser(${u.id}, '${escapeHtml(u.name)}')">🗑️ Excluir</button>`;

            return `
                <tr>
                    <td>#${u.id}</td>
                    <td><strong>${escapeHtml(u.name)}</strong></td>
                    <td><code>${escapeHtml(u.username)}</code></td>
                    <td>${roleBadge}</td>
                    <td>${dateStr}</td>
                    <td>${deleteBtn}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro de conexão.</td></tr>`;
    }
}

// Excluir usuário
async function deleteUser(id, name) {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${name}"?`)) return;

    try {
        const res = await fetch(`api/users.php?id=${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Erro ao excluir usuário.');
            return;
        }

        loadUsers();
    } catch (err) {
        alert('Erro ao se comunicar com o servidor.');
    }
}

// Carregar definições das metas de SLA
async function loadSlaGoals() {
    try {
        const res = await fetch('api/slas.php');
        const data = await res.json();

        if (!res.ok || !data.goals) return;

        data.goals.forEach(g => {
            const input = document.getElementById(`sla-hours-${g.criticality}`);
            if (input) input.value = g.max_hours;
        });
    } catch (err) {
        console.error('Erro ao carregar metas de SLA:', err);
    }
}

// Carregar relatório comparativo de SLA
async function loadSlaReport() {
    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;

    try {
        const res = await fetch('api/slas.php');
        const data = await res.json();

        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Erro ao carregar relatório.</td></tr>`;
            return;
        }

        // Atualizar estatísticas superiores
        const summary = data.summary || {};
        document.getElementById('metric-total-completed').textContent = summary.totalCompleted || 0;
        document.getElementById('metric-completed-met').textContent = summary.completedMet || 0;
        document.getElementById('metric-completed-breached').textContent = summary.completedBreached || 0;
        document.getElementById('metric-compliance-rate').textContent = `${summary.complianceRate || 100}%`;

        const report = data.report || [];
        if (report.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center">Nenhuma tarefa encontrada para análise de SLA.</td></tr>`;
            return;
        }

        tbody.innerHTML = report.map(r => {
            let statusBadge = '';
            if (r.isDone) {
                if (r.isWithinTarget) {
                    statusBadge = `<span class="badge badge-success">🟢 Dentro da Meta</span>`;
                } else {
                    statusBadge = `<span class="badge badge-danger">🔴 SLA Estourado</span>`;
                }
            } else {
                if (r.isWithinTarget) {
                    statusBadge = `<span class="badge badge-info">⏳ Em Andamento</span>`;
                } else {
                    statusBadge = `<span class="badge badge-warning">⚠️ Fora do Prazo (Aberto)</span>`;
                }
            }

            const critClass = `crit-${r.criticality}`;
            const critLabel = r.criticality.toUpperCase();

            return `
                <tr>
                    <td>#${r.id}</td>
                    <td><strong>${escapeHtml(r.title)}</strong></td>
                    <td><span class="crit-badge ${critClass}">${critLabel}</span></td>
                    <td>${r.createdAt}</td>
                    <td>${r.completedAt}</td>
                    <td><code>${r.elapsedHours} hrs</code></td>
                    <td><code>${r.maxHours} hrs</code></td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Erro de conexão.</td></tr>`;
    }
}

function showAlert(element, message, type) {
    if (!element) return;
    if (type === 'none' || !message) {
        element.style.display = 'none';
        element.className = 'alert-box';
        return;
    }

    element.textContent = message;
    element.className = `alert-box alert-${type}`;
    element.style.display = 'block';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}
