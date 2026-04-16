/**
 * SVP Frontend Configuration
 *
 * API base URL for all frontend pages.
 * - Default on localhost / 127.0.0.1: local backend
 * - Default elsewhere: Cloud Run production backend
 * - Explicit overrides:
 *   ?api=local  -> force local backend
 *   ?api=cloud  -> force Cloud Run backend
 */
(function () {
    const ensureAuthGuard = () => {
        if (window.SVPAuthGuard && typeof window.SVPAuthGuard.enforcePageAccess === 'function') {
            return window.SVPAuthGuard;
        }

        const GUEST_ONLY_PATHS = new Set([
            '/login.html',
            '/signup.html'
        ]);
        const PUBLIC_PATHS = new Set([
            '/index.html',
            '/auth_magic_link_callback.html',
            '/article_publish_verify_callback.html',
            '/post_detail.html',
            '/event_detail.html',
            '/share.html',
            '/11qyalh10yucjx9dvsey1u2ihsk4xf.html'
        ]);
        const PUBLIC_DETAIL_PREFIXES = [
            '/bai-viet/',
            '/su-kien/'
        ];
        const asText = (value) => String(value || '').trim();
        const normalizePathname = (value) => {
            const raw = asText(value);
            if (!raw || raw === '/') {
                return '/index.html';
            }
            const trimmed = raw.replace(/\/+$/g, '');
            return trimmed || '/index.html';
        };
        const hasStoredSession = () => {
            try {
                return Boolean(
                    asText(window.localStorage.getItem('accessToken'))
                    || asText(window.localStorage.getItem('refreshToken'))
                );
            } catch (_) {
                return false;
            }
        };
        const isPublicPath = (path) => {
            if (PUBLIC_PATHS.has(path)) {
                return true;
            }
            return PUBLIC_DETAIL_PREFIXES.some((prefix) => path.startsWith(prefix));
        };
        const currentRelativeTarget = () => {
            const pathname = normalizePathname(window.location.pathname);
            return `${pathname}${window.location.search || ''}${window.location.hash || ''}`;
        };
        const normalizeRedirectTarget = (value) => {
            const raw = asText(value);
            if (!raw) {
                return '/index.html';
            }
            try {
                const url = new URL(raw, window.location.href);
                if (url.origin !== window.location.origin) {
                    return '/index.html';
                }
                return `${normalizePathname(url.pathname)}${url.search || ''}${url.hash || ''}`;
            } catch (_) {
                return '/index.html';
            }
        };
        const toAbsoluteUrl = (value) => {
            try {
                return new URL(value, `${window.location.origin}/`).href;
            } catch (_) {
                return value;
            }
        };
        const redirectTo = (value) => {
            const href = toAbsoluteUrl(value);
            window.__SVP_LAST_AUTH_REDIRECT = href;
            if (window.__SVP_CAPTURE_AUTH_REDIRECTS) {
                return href;
            }
            if (window.location && typeof window.location.replace === 'function') {
                window.location.replace(href);
                return href;
            }
            window.location.href = href;
            return href;
        };
        const buildLoginRedirectUrl = () => {
            return `/login.html?redirect=${encodeURIComponent(currentRelativeTarget())}`;
        };
        const enforcePageAccess = () => {
            if (window.__SVP_BYPASS_AUTH_GUARD) {
                return '';
            }
            const currentPath = normalizePathname(window.location.pathname);
            const hasSession = hasStoredSession();

            if (hasSession && GUEST_ONLY_PATHS.has(currentPath)) {
                const params = new URLSearchParams(window.location.search || '');
                return redirectTo(normalizeRedirectTarget(params.get('redirect')));
            }
            if (isPublicPath(currentPath) || GUEST_ONLY_PATHS.has(currentPath) || hasSession) {
                return '';
            }
            return redirectTo(buildLoginRedirectUrl());
        };

        window.SVPAuthGuard = {
            normalizePathname,
            normalizeRedirectTarget,
            hasStoredSession,
            enforcePageAccess
        };
        return window.SVPAuthGuard;
    };

    var CLOUD_URL = 'https://svp-api-5nxhggmy2a-od.a.run.app';
    var LOCAL_URL = 'http://localhost:8080';

    var params = new URLSearchParams(window.location.search);
    var apiMode = (params.get('api') || '').trim().toLowerCase();
    var hostname = (window.location.hostname || '').trim().toLowerCase();
    var isLocalHost = hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '::1'
        || hostname === '[::1]';
    var forceLocal = apiMode === 'local';
    var forceCloud = apiMode === 'cloud';

    window.SVP_API_BASE_URL = forceCloud
        ? CLOUD_URL
        : ((forceLocal || isLocalHost) ? LOCAL_URL : CLOUD_URL);

    ensureAuthGuard().enforcePageAccess();
})();
