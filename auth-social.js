(function () {
    const fallbackBase = (() => {
        const origin = window.location.origin || '';
        const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
        if (isLocal) return 'http://localhost:8080';
        if (origin && origin !== 'null') return origin;
        return 'http://localhost:8080';
    })();
    const API_BASE_URL = window.SVP_API_BASE_URL || fallbackBase;
    const FACEBOOK_SDK_VERSION = 'v23.0';
    const GOOGLE_SCRIPT_ID = 'svp-google-gsi';
    const FACEBOOK_SCRIPT_ID = 'svp-facebook-sdk';
    let providerConfigPromise = null;
    let facebookSdkPromise = null;

    const byId = (id) => document.getElementById(id);

    const loadScript = (src, id, readyCheck) => new Promise((resolve, reject) => {
        if (typeof readyCheck === 'function' && readyCheck()) {
            resolve();
            return;
        }
        let script = document.getElementById(id);
        if (script) {
            script.addEventListener('load', () => resolve(), { once: true });
            script.addEventListener('error', () => reject(new Error(`Cannot load ${src}`)), { once: true });
            return;
        }
        script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Cannot load ${src}`));
        document.head.appendChild(script);
    });

    const saveSession = (payload) => {
        localStorage.setItem('accessToken', String(payload?.accessToken || ''));
        localStorage.setItem('refreshToken', String(payload?.refreshToken || ''));
        localStorage.removeItem('userAvatarUrl');
        if (payload?.email) localStorage.setItem('userEmail', String(payload.email));
        if (payload?.nickname) localStorage.setItem('userNickname', String(payload.nickname));
        if (payload?.displayName) localStorage.setItem('userDisplayName', String(payload.displayName));
        if (payload?.userId !== undefined && payload?.userId !== null) {
            localStorage.setItem('userId', String(payload.userId));
        }
    };

    const fetchProviderConfig = async () => {
        if (!providerConfigPromise) {
            providerConfigPromise = fetch(`${API_BASE_URL}/auth/providers`, {
                headers: { Accept: 'application/json' }
            }).then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload.error || 'Cannot load auth providers.');
                }
                return payload || {};
            });
        }
        return providerConfigPromise;
    };

    const exchangeProviderToken = async (provider, token) => {
        const response = await fetch(`${API_BASE_URL}/auth/social`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ provider, token })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || `Không thể xác thực với ${provider}.`);
        }
        saveSession(payload);
        return payload;
    };

    const ensureFacebookSdk = (appId) => {
        if (window.FB && typeof window.FB.init === 'function') {
            window.FB.init({ appId, cookie: false, xfbml: false, version: FACEBOOK_SDK_VERSION });
            return Promise.resolve(window.FB);
        }
        if (facebookSdkPromise) {
            return facebookSdkPromise;
        }
        facebookSdkPromise = new Promise((resolve, reject) => {
            let settled = false;
            const finish = (fn, value) => {
                if (settled) return;
                settled = true;
                fn(value);
            };
            const initSdk = () => {
                if (!window.FB || typeof window.FB.init !== 'function') {
                    finish(reject, new Error('Facebook SDK unavailable.'));
                    return;
                }
                window.FB.init({ appId, cookie: false, xfbml: false, version: FACEBOOK_SDK_VERSION });
                finish(resolve, window.FB);
            };
            window.fbAsyncInit = initSdk;
            loadScript(
                'https://connect.facebook.net/en_US/sdk.js',
                FACEBOOK_SCRIPT_ID,
                () => Boolean(window.FB && typeof window.FB.init === 'function')
            ).then(() => {
                if (window.FB && typeof window.FB.init === 'function') {
                    initSdk();
                }
            }).catch((error) => finish(reject, error));
        });
        return facebookSdkPromise;
    };

    const setBusyState = (elements, busy) => {
        elements.forEach((element) => {
            if (!element) return;
            if ('disabled' in element) {
                element.disabled = busy;
            }
        });
    };

    const redirectAfterAuth = (target) => {
        window.location.replace(target || 'index.html');
    };

    const initGoogle = async (provider, options, state) => {
        if (!provider?.enabled || !provider?.clientId || !state.googleContainer) {
            if (state.googleRow) state.googleRow.hidden = true;
            return false;
        }
        await loadScript(
            'https://accounts.google.com/gsi/client',
            GOOGLE_SCRIPT_ID,
            () => Boolean(window.google && window.google.accounts && window.google.accounts.id)
        );
        if (!window.google || !window.google.accounts || !window.google.accounts.id) {
            throw new Error('Google SDK unavailable.');
        }
        window.google.accounts.id.initialize({
            client_id: provider.clientId,
            callback: async (response) => {
                if (!response || !response.credential) {
                    options.setMessage('Đăng nhập Google đã bị hủy.', false);
                    return;
                }
                setBusyState(state.busyTargets, true);
                state.googleContainer.classList.add('is-busy');
                options.setMessage('Đang xác thực với Google...', true);
                try {
                    await exchangeProviderToken('google', response.credential);
                    options.setMessage('Xác thực Google thành công, đang chuyển trang...', true);
                    redirectAfterAuth(options.redirectUrl);
                } catch (error) {
                    options.setMessage(error?.message || 'Không thể xác thực với Google.', false);
                } finally {
                    setBusyState(state.busyTargets, false);
                    state.googleContainer.classList.remove('is-busy');
                }
            }
        });
        state.googleContainer.innerHTML = '';
        window.google.accounts.id.renderButton(state.googleContainer, {
            theme: 'outline',
            size: 'large',
            shape: 'rectangular',
            width: Math.max(240, Math.min(state.googleContainer.clientWidth || 320, 360)),
            text: options.mode === 'signup' ? 'signup_with' : 'signin_with'
        });
        return true;
    };

    const initFacebook = async (provider, options, state) => {
        if (!provider?.enabled || !provider?.appId || !state.facebookButton) {
            if (state.facebookButton) state.facebookButton.hidden = true;
            return false;
        }
        state.facebookButton.addEventListener('click', async () => {
            setBusyState(state.busyTargets, true);
            options.setMessage('Đang mở Facebook...', true);
            try {
                const fb = await ensureFacebookSdk(provider.appId);
                fb.login(async (loginResponse) => {
                    const accessToken = loginResponse?.authResponse?.accessToken || '';
                    if (!accessToken) {
                        setBusyState(state.busyTargets, false);
                        options.setMessage('Đăng nhập Facebook đã bị hủy.', false);
                        return;
                    }
                    options.setMessage('Đang xác thực với Facebook...', true);
                    try {
                        await exchangeProviderToken('facebook', accessToken);
                        options.setMessage('Xác thực Facebook thành công, đang chuyển trang...', true);
                        redirectAfterAuth(options.redirectUrl);
                    } catch (error) {
                        options.setMessage(error?.message || 'Không thể xác thực với Facebook.', false);
                    } finally {
                        setBusyState(state.busyTargets, false);
                    }
                }, { scope: 'email,public_profile', return_scopes: true });
            } catch (error) {
                setBusyState(state.busyTargets, false);
                options.setMessage(error?.message || 'Không thể tải Facebook SDK.', false);
            }
        });
        return true;
    };

    const init = async (options) => {
        const section = byId(options.sectionId);
        if (!section) return;

        const state = {
            googleRow: byId(options.googleRowId),
            googleContainer: byId(options.googleContainerId),
            facebookButton: byId(options.facebookButtonId),
            divider: byId(options.dividerId),
            busyTargets: (options.busyIds || []).map(byId).filter(Boolean)
        };
        if (state.facebookButton) {
            state.busyTargets.push(state.facebookButton);
        }

        let config;
        try {
            config = await fetchProviderConfig();
        } catch (error) {
            console.error('Cannot load social auth providers:', error);
            section.hidden = true;
            return;
        }

        let googleReady = false;
        let facebookReady = false;
        try {
            googleReady = await initGoogle(config.google || {}, options, state);
        } catch (error) {
            console.error('Cannot init Google auth:', error);
            if (state.googleRow) state.googleRow.hidden = true;
        }
        try {
            facebookReady = await initFacebook(config.facebook || {}, options, state);
        } catch (error) {
            console.error('Cannot init Facebook auth:', error);
            if (state.facebookButton) state.facebookButton.hidden = true;
        }

        const hasAnyProvider = googleReady || facebookReady;
        section.hidden = !hasAnyProvider;
        if (state.divider) {
            state.divider.hidden = !hasAnyProvider;
        }
    };

    window.SVPSocialAuth = {
        init
    };
})();
