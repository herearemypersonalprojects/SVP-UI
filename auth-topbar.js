(function () {
    const authBox = document.querySelector('.sv-auth');
    if (!authBox) {
        return;
    }

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const parseJwtPayload = (token) => {
        if (!token || token.split('.').length !== 3) {
            return null;
        }
        try {
            const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(encoded));
        } catch (_) {
            return null;
        }
    };

    const removeSession = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userNickname');
        localStorage.removeItem('userId');
    };

    const accessToken = localStorage.getItem('accessToken') || '';
    const payload = parseJwtPayload(accessToken) || {};
    const exp = Number(payload.exp || 0);
    if (Number.isFinite(exp) && exp > 0 && exp * 1000 < Date.now()) {
        removeSession();
    }

    const freshToken = localStorage.getItem('accessToken') || '';
    const freshPayload = parseJwtPayload(freshToken) || {};
    const nickname = (localStorage.getItem('userNickname') || freshPayload.nickname || '').trim();
    const email = (localStorage.getItem('userEmail') || freshPayload.email || '').trim();

    if (!freshToken || (!nickname && !email)) {
        const signupBtn = authBox.querySelector('.btn-outline-secondary');
        const loginBtn = authBox.querySelector('.btn-primary');
        if (signupBtn && signupBtn.tagName !== 'A') {
            signupBtn.addEventListener('click', () => { window.location.href = 'signup.html'; });
        }
        if (loginBtn && loginBtn.tagName !== 'A') {
            loginBtn.addEventListener('click', () => { window.location.href = 'login.html'; });
        }
        return;
    }

    const displayName = nickname || email;
    const initial = (displayName.charAt(0) || 'U').toUpperCase();
    authBox.innerHTML = (
        '<div class="sv-auth-user" title="' + escapeHtml(email || displayName) + '">' +
        '<span class="sv-auth-avatar">' + escapeHtml(initial) + '</span>' +
        '<span class="sv-auth-name">' + escapeHtml(displayName) + '</span>' +
        '<button id="sv-auth-logout" class="sv-auth-logout" type="button">Dang xuat</button>' +
        '</div>'
    );

    const logoutBtn = document.getElementById('sv-auth-logout');
    if (!logoutBtn) {
        return;
    }
    logoutBtn.addEventListener('click', () => {
        removeSession();
        window.location.reload();
    });
})();

