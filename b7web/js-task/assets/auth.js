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
            <button id="btn-logout" class="btn-logout" title="Encerrar Sessão">🚪 Sair</button>
        `;

        headerNav.appendChild(profileContainer);

        document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());
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
