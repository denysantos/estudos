/**
 * Gerenciador de Autenticação e Sessão do Usuário
 */
window.Auth = {
    currentUser: null,

    async init() {
        const isLoginPage = window.location.pathname.endsWith('login.html');

        try {
            const res = await fetch('api/auth.php?action=me');
            const data = await res.json();

            if (data.authenticated && data.user) {
                this.currentUser = data.user;
                if (isLoginPage) {
                    window.location.href = 'index.html';
                    return;
                }
                this.renderUserHeader();
            } else {
                this.currentUser = null;
                if (!isLoginPage) {
                    window.location.href = 'login.html';
                    return;
                }
            }
        } catch (err) {
            console.error('Erro ao verificar autenticação:', err);
            if (!isLoginPage) {
                window.location.href = 'login.html';
            }
        }
    },

    renderUserHeader() {
        const headerNav = document.querySelector('.header-nav');
        if (!headerNav || !this.currentUser) return;

        // Limpar links extras antigos do usuário se existirem
        const existingUserNav = document.getElementById('user-header-profile');
        if (existingUserNav) existingUserNav.remove();

        // Adicionar link de administração caso o usuário seja Admin
        const currentPath = window.location.pathname;
        const isAdminPage = currentPath.endsWith('admin.html');

        let adminLinkHtml = '';
        if (this.currentUser.role === 'admin') {
            const activeClass = isAdminPage ? 'nav-link-active' : '';
            adminLinkHtml = `<a href="admin.html" class="nav-link ${activeClass}">⚙️ Administração</a>`;
        }

        const profileContainer = document.createElement('div');
        profileContainer.id = 'user-header-profile';
        profileContainer.className = 'user-header-profile';
        profileContainer.innerHTML = `
            ${adminLinkHtml}
            <div class="user-badge" title="Perfil: ${this.currentUser.role === 'admin' ? 'Administrador' : 'Usuário'}">
                <span class="user-role-tag ${this.currentUser.role}">${this.currentUser.role.toUpperCase()}</span>
                <span class="user-name">👤 ${this.currentUser.name}</span>
            </div>
            <button id="btn-change-my-pass" class="btn-logout" title="Alterar minha senha">🔑 Senha</button>
            <button id="btn-logout" class="btn-logout" title="Encerrar Sessão">🚪 Sair</button>
        `;

        headerNav.appendChild(profileContainer);

        document.getElementById('btn-change-my-pass')?.addEventListener('click', () => {
            this.openChangePasswordModal(this.currentUser.id, this.currentUser.name);
        });

        document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());
    },

    async changePassword(userId, password, currentPassword = '') {
        const res = await fetch('api/users.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, password, currentPassword })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao alterar a senha.');
        }

        return data;
    },

    openChangePasswordModal(userId, userName) {
        let overlay = document.getElementById('pw-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pw-modal-overlay';
            overlay.className = 'task-modal-overlay active';
            overlay.style.zIndex = '9999';
            overlay.innerHTML = `
                <div class="task-modal" style="max-width: 400px; padding: 24px;">
                    <div class="task-modal-header" style="padding: 0 0 16px 0; border-bottom: 1px solid #eee;">
                        <h2 id="pw-modal-title" class="task-modal-title" style="font-size: 1.1rem; color: #1b5e20;">🔑 Alterar Senha</h2>
                        <button id="pw-modal-close" class="task-modal-close">×</button>
                    </div>
                    <div id="pw-modal-alert" class="alert-box" style="display: none; margin-top: 14px;"></div>
                    <form id="pw-modal-form" style="display: flex; flex-direction: column; gap: 14px; margin-top: 16px;">
                        <input type="hidden" id="pw-modal-userid">
                        <div class="form-group">
                            <label style="font-size: 0.82rem; font-weight: 600;">Nova Senha</label>
                            <input type="password" id="pw-modal-newpass" placeholder="Digite a nova senha" required minlength="4">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.82rem; font-weight: 600;">Confirmar Nova Senha</label>
                            <input type="password" id="pw-modal-confirmpass" placeholder="Repita a nova senha" required minlength="4">
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                            <button type="button" id="pw-modal-cancel" class="btn btn-secondary">Cancelar</button>
                            <button type="submit" id="pw-modal-save" class="btn btn-primary">💾 Salvar Senha</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(overlay);

            document.getElementById('pw-modal-close').addEventListener('click', () => overlay.remove());
            document.getElementById('pw-modal-cancel').addEventListener('click', () => overlay.remove());

            document.getElementById('pw-modal-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const alertEl = document.getElementById('pw-modal-alert');
                alertEl.style.display = 'none';

                const targetId = parseInt(document.getElementById('pw-modal-userid').value, 10);
                const newPass = document.getElementById('pw-modal-newpass').value.trim();
                const confirmPass = document.getElementById('pw-modal-confirmpass').value.trim();

                if (newPass !== confirmPass) {
                    alertEl.textContent = '❌ As senhas digitadas não coincidem.';
                    alertEl.className = 'alert-box alert-error';
                    alertEl.style.display = 'block';
                    return;
                }

                try {
                    await window.Auth.changePassword(targetId, newPass);
                    alert('✅ Senha alterada com sucesso!');
                    overlay.remove();
                } catch (err) {
                    alertEl.textContent = `❌ ${err.message}`;
                    alertEl.className = 'alert-box alert-error';
                    alertEl.style.display = 'block';
                }
            });
        }

        document.getElementById('pw-modal-title').textContent = `🔑 Alterar Senha — ${userName}`;
        document.getElementById('pw-modal-userid').value = userId;
        document.getElementById('pw-modal-newpass').value = '';
        document.getElementById('pw-modal-confirmpass').value = '';
        const alertEl = document.getElementById('pw-modal-alert');
        if (alertEl) alertEl.style.display = 'none';

        overlay.style.display = 'flex';
    },

    async login(username, password) {
        try {
            const res = await fetch('api/auth.php?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Falha ao efetuar login.');
            }

            this.currentUser = data.user;
            window.location.href = 'index.html';
        } catch (err) {
            throw err;
        }
    },

    async logout() {
        try {
            await fetch('api/auth.php?action=logout', { method: 'POST' });
            this.currentUser = null;
            window.location.href = 'login.html';
        } catch (err) {
            console.error('Erro no logout:', err);
            window.location.href = 'login.html';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.Auth.init();
});
