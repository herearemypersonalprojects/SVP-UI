(function () {
    const fallbackBase = (() => {
        const origin = window.location.origin || "";
        const isLocal = origin.includes("localhost")
            || origin.includes("127.0.0.1")
            || origin.includes("::1");
        if (isLocal) {
            return "http://localhost:8080";
        }
        if (origin && origin !== "null") {
            return origin;
        }
        return "http://localhost:8080";
    })();
    const API_BASE_URL = window.SVP_API_BASE_URL || fallbackBase;
    const REFRESH_SKEW_MS = 60 * 1000;
    const MIN_REFRESH_DELAY_MS = 5 * 1000;
    const RETRY_REFRESH_DELAY_MS = 30 * 1000;
    const ACCESS_TOKEN_EXPIRES_AT_KEY = "accessTokenExpiresAt";
    const PROFILE_CACHE_KEY = "svp.auth.profileCache.v1";
    const PROFILE_CACHE_TTL_MS = 15 * 60 * 1000;
    const NON_CRITICAL_IDLE_TIMEOUT_MS = 1500;
    const INBOX_POLL_INTERVAL_MS = 30 * 1000;
    const INBOX_REFRESH_DEBOUNCE_MS = 250;
    const VISIT_SESSION_STORAGE_KEY = "svp.visit.session.v1";
    const VISIT_SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
    const VISIT_SESSION_MAX_ENGAGED_MS = 12 * 60 * 60 * 1000;
    const VISIT_SESSION_MIN_FLUSH_INTERVAL_MS = 1000;
    const authBox = document.querySelector(".sv-auth");
    const topbarBrand = document.querySelector(".sv-topbar .sv-brand");
    const guestAuthMarkup = authBox ? authBox.innerHTML : "";
    let refreshTimer = null;
    let refreshInFlight = null;
    let inboxPollTimer = null;
    let inboxRefreshTimer = null;
    let unreadRefreshInFlight = null;
    let unreadCount = 0;
    let inboxLifecycleBound = false;
    let visitLifecycleBound = false;
    let visitSessionState = null;
    let visitVisibleSinceMs = 0;
    let lastVisitSessionFlushAt = 0;
    let lastVisitSessionFlushKey = "";

    const scheduleNonCritical = (task, timeoutMs = NON_CRITICAL_IDLE_TIMEOUT_MS) => {
        if (typeof task !== "function") {
            return;
        }
        if (typeof window.requestIdleCallback === "function") {
            window.requestIdleCallback(() => {
                task();
            }, { timeout: timeoutMs });
            return;
        }
        window.setTimeout(task, Math.max(0, timeoutMs));
    };

    const resolveHomeHref = () => {
        const homeNavLink = document.querySelector('.sv-nav .nav-link[href="index.html"]')
            || document.querySelector('.sv-nav .nav-link[href="./index.html"]')
            || document.querySelector('.sv-nav .nav-link[href="/"]')
            || document.querySelector('.sv-nav .nav-link');
        const href = homeNavLink ? String(homeNavLink.getAttribute("href") || "").trim() : "";
        return href || "index.html";
    };

    const initializeBrandHomeLink = () => {
        if (!topbarBrand || topbarBrand.querySelector(".sv-brand__home")) {
            return;
        }
        const link = document.createElement("a");
        link.className = "sv-brand__home";
        link.href = resolveHomeHref();
        link.setAttribute("aria-label", "Trang chủ SVP");
        while (topbarBrand.firstChild) {
            link.appendChild(topbarBrand.firstChild);
        }
        topbarBrand.appendChild(link);
    };

    const decodeBase64Url = (value) => {
        if (!value) {
            return "";
        }
        let base = value.replace(/-/g, "+").replace(/_/g, "/");
        const pad = base.length % 4;
        if (pad) {
            base += "=".repeat(4 - pad);
        }
        return base;
    };

    const parseJwtPayload = (token) => {
        if (!token || token.split(".").length !== 3) {
            return null;
        }
        try {
            const encoded = decodeBase64Url(token.split(".")[1]);
            return JSON.parse(atob(encoded));
        } catch (_) {
            return null;
        }
    };

    const asText = (value) => String(value ?? "").trim();
    const parsePositiveSeconds = (value) => {
        const seconds = Number(value);
        if (!Number.isFinite(seconds) || seconds <= 0) {
            return 0;
        }
        return Math.floor(seconds);
    };
    const parseEpochMs = (value) => {
        const parsed = Date.parse(asText(value));
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    };
    const readJwtExpiryMs = (token) => {
        const payload = parseJwtPayload(token) || {};
        const exp = Number(payload.exp || 0);
        if (!Number.isFinite(exp) || exp <= 0) {
            return 0;
        }
        return exp * 1000;
    };
    const resolveAccessTokenExpiryMs = (payload, accessTokenOverride) => {
        const source = payload && typeof payload === "object" ? payload : {};
        const expiresIn = parsePositiveSeconds(source.expiresIn);
        if (expiresIn > 0) {
            return Date.now() + (expiresIn * 1000);
        }
        const accessExpiresAtMs = parseEpochMs(source.accessExpiresAt);
        if (accessExpiresAtMs > 0) {
            return accessExpiresAtMs;
        }
        return readJwtExpiryMs(accessTokenOverride || source.accessToken || "");
    };
    const readStoredAccessTokenExpiryMs = () => {
        const expiresAtMs = Number(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY) || 0);
        return Number.isFinite(expiresAtMs) && expiresAtMs > 0 ? expiresAtMs : 0;
    };
    const readAccessTokenExpiryMs = (accessToken) => {
        const storedExpiresAtMs = readStoredAccessTokenExpiryMs();
        if (storedExpiresAtMs > 0) {
            return storedExpiresAtMs;
        }
        return readJwtExpiryMs(accessToken);
    };
    const persistAccessTokenExpiry = (payload, accessTokenOverride) => {
        const expiresAtMs = resolveAccessTokenExpiryMs(payload, accessTokenOverride);
        if (expiresAtMs > 0) {
            localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(expiresAtMs));
            return expiresAtMs;
        }
        localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
        return 0;
    };
    const isUuidLike = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(asText(value));
    const isPositiveIntegerLike = (value) => /^[1-9]\d*$/.test(asText(value));
    const resolvePublicUserId = (...candidates) => {
        for (const candidate of candidates) {
            const value = asText(candidate);
            if (isUuidLike(value)) {
                return value;
            }
        }
        return "";
    };
    const resolveAuthUserId = (...candidates) => {
        for (const candidate of candidates) {
            const value = asText(candidate);
            if (isPositiveIntegerLike(value)) {
                return value;
            }
        }
        return "";
    };
    const buildProfileHref = (identity, fallback = "profile.html") => {
        const source = identity && typeof identity === "object" ? identity : {};
        const authUserId = resolveAuthUserId(
            source.authUserId,
            source.auth_user_id,
            !isUuidLike(source.userId) ? source.userId : "",
            !isUuidLike(source.user_id) ? source.user_id : ""
        );
        if (authUserId) {
            return "profile.html?auth_user_id=" + encodeURIComponent(authUserId);
        }
        const publicUserId = resolvePublicUserId(
            source.userId,
            source.user_id,
            source.publicUserId
        );
        if (publicUserId) {
            return "profile.html?user_id=" + encodeURIComponent(publicUserId);
        }
        const nickname = asText(source.nickname);
        if (nickname) {
            return "profile.html?nickname=" + encodeURIComponent(nickname);
        }
        return fallback;
    };
    const normalizeSessionPayload = (payload) => {
        if (!payload || typeof payload !== "object") {
            return null;
        }
        const publicUserId = resolvePublicUserId(payload.userId, payload.publicUserId);
        const legacyAuthUserId = !isUuidLike(payload.userId) && isPositiveIntegerLike(payload.userId)
            ? payload.userId
            : "";
        const authUserId = resolveAuthUserId(
            payload.authUserId,
            legacyAuthUserId,
            payload.sub
        );
        return {
            accessToken: asText(payload.accessToken),
            refreshToken: asText(payload.refreshToken),
            expiresIn: parsePositiveSeconds(payload.expiresIn),
            accessExpiresAt: asText(payload.accessExpiresAt),
            refreshExpiresAt: asText(payload.refreshExpiresAt),
            email: asText(payload.email),
            nickname: asText(payload.nickname),
            displayName: asText(payload.displayName),
            userId: publicUserId,
            authUserId,
            avatarUrl: resolveAvatarUrl(payload.avatarUrl || "")
        };
    };
    const persistIdentity = (payload) => {
        const normalized = normalizeSessionPayload(payload);
        if (!normalized) {
            return null;
        }
        if (normalized.email) {
            localStorage.setItem("userEmail", normalized.email);
        } else {
            localStorage.removeItem("userEmail");
        }
        if (normalized.nickname) {
            localStorage.setItem("userNickname", normalized.nickname);
        } else {
            localStorage.removeItem("userNickname");
        }
        if (normalized.displayName) {
            localStorage.setItem("userDisplayName", normalized.displayName);
        } else {
            localStorage.removeItem("userDisplayName");
        }
        if (normalized.userId) {
            localStorage.setItem("userId", normalized.userId);
        } else {
            localStorage.removeItem("userId");
        }
        if (normalized.authUserId) {
            localStorage.setItem("authUserId", normalized.authUserId);
        } else {
            localStorage.removeItem("authUserId");
        }
        if (normalized.avatarUrl) {
            localStorage.setItem("userAvatarUrl", normalized.avatarUrl);
        }
        return normalized;
    };

    const getProfileCacheSessionKey = () => {
        const token = localStorage.getItem("accessToken") || "";
        const payload = parseJwtPayload(token) || {};
        return asText(
            resolveAuthUserId(localStorage.getItem("authUserId"), payload.authUserId, payload.sub)
            || resolvePublicUserId(localStorage.getItem("userId"), payload.userId)
            || payload.email
        );
    };

    const clearProfileCache = () => {
        localStorage.removeItem(PROFILE_CACHE_KEY);
    };

    const readFreshProfileCache = () => {
        const sessionKey = getProfileCacheSessionKey();
        if (!sessionKey) {
            return null;
        }
        try {
            const raw = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || "null");
            if (!raw || typeof raw !== "object") {
                return null;
            }
            if (String(raw.sessionKey || "") !== sessionKey) {
                return null;
            }
            const ts = Number(raw.ts || 0);
            if (!Number.isFinite(ts) || (Date.now() - ts) > PROFILE_CACHE_TTL_MS) {
                return null;
            }
            return raw.profile && typeof raw.profile === "object" ? raw.profile : null;
        } catch (_) {
            return null;
        }
    };

    const saveProfileCache = (profile) => {
        const sessionKey = getProfileCacheSessionKey();
        if (!sessionKey || !profile || typeof profile !== "object") {
            return;
        }
        try {
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
                sessionKey,
                ts: Date.now(),
                profile: {
                    displayName: asText(profile.displayName),
                    avatarUrl: resolveAvatarUrl(profile.avatarUrl || ""),
                    email: asText(profile.email),
                    nickname: asText(profile.nickname),
                    userId: resolvePublicUserId(profile.userId),
                    authUserId: resolveAuthUserId(profile.authUserId)
                }
            }));
        } catch (_) {
        }
    };

    const removeSession = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userNickname");
        localStorage.removeItem("userDisplayName");
        localStorage.removeItem("userId");
        localStorage.removeItem("authUserId");
        localStorage.removeItem("userAvatarUrl");
        clearProfileCache();
    };

    const saveSession = (payload) => {
        const normalized = normalizeSessionPayload(payload);
        if (!normalized) {
            return false;
        }
        const accessToken = normalized.accessToken;
        const refreshToken = normalized.refreshToken;
        if (!accessToken || !refreshToken) {
            return false;
        }
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        persistAccessTokenExpiry(normalized, accessToken);
        localStorage.removeItem("userAvatarUrl");
        clearProfileCache();
        persistIdentity(normalized);
        return true;
    };

    const clearRefreshTimer = () => {
        if (refreshTimer !== null) {
            clearTimeout(refreshTimer);
            refreshTimer = null;
        }
    };

    const scheduleRefreshRetry = () => {
        clearRefreshTimer();
        refreshTimer = setTimeout(() => {
            void refreshAccessToken();
        }, RETRY_REFRESH_DELAY_MS);
    };

    const scheduleRefreshFromToken = (accessToken) => {
        clearRefreshTimer();
        const expiresAtMs = readAccessTokenExpiryMs(accessToken);
        if (!Number.isFinite(expiresAtMs) || expiresAtMs <= 0) {
            return;
        }
        const dueMs = expiresAtMs - Date.now() - REFRESH_SKEW_MS;
        const delay = Math.max(MIN_REFRESH_DELAY_MS, dueMs);
        refreshTimer = setTimeout(() => {
            void refreshAccessToken();
        }, delay);
    };

    const adoptSessionRotatedInAnotherTab = (staleRefreshToken) => {
        const latestRefreshToken = localStorage.getItem("refreshToken") || "";
        const latestAccessToken = localStorage.getItem("accessToken") || "";
        if (!latestRefreshToken || latestRefreshToken === staleRefreshToken || !latestAccessToken) {
            return false;
        }
        const latestExpiresAtMs = readAccessTokenExpiryMs(latestAccessToken);
        if (Number.isFinite(latestExpiresAtMs) && latestExpiresAtMs > Date.now() + REFRESH_SKEW_MS) {
            scheduleRefreshFromToken(latestAccessToken);
        } else {
            scheduleRefreshRetry();
        }
        renderTopbar(readFreshProfileCache());
        return true;
    };

    const refreshAccessToken = async () => {
        if (refreshInFlight) {
            return refreshInFlight;
        }

        const refreshToken = localStorage.getItem("refreshToken") || "";
        if (!refreshToken) {
            removeSession();
            return false;
        }

        refreshInFlight = (async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify({ refreshToken })
                });
                const payload = await response.json().catch(() => ({}));

                if (response.ok && saveSession(payload)) {
                    scheduleRefreshFromToken(payload.accessToken);
                    return true;
                }

                if (response.status === 400 || response.status === 401 || response.status === 403) {
                    // Another tab may already have rotated the refresh token and updated localStorage.
                    if (adoptSessionRotatedInAnotherTab(refreshToken)) {
                        return true;
                    }
                    clearRefreshTimer();
                    resetInboxState();
                    removeSession();
                    renderTopbar();
                    return false;
                }

                scheduleRefreshRetry();
                return false;
            } catch (_) {
                scheduleRefreshRetry();
                return false;
            } finally {
                refreshInFlight = null;
            }
        })();

        return refreshInFlight;
    };

    const getValidAccessToken = async () => {
        const accessToken = localStorage.getItem("accessToken") || "";
        if (!accessToken) {
            clearRefreshTimer();
            const refreshToken = localStorage.getItem("refreshToken") || "";
            if (!refreshToken) {
                return "";
            }
            const refreshed = await refreshAccessToken();
            return refreshed ? (localStorage.getItem("accessToken") || "") : "";
        }

        const expiresAtMs = readAccessTokenExpiryMs(accessToken);
        if (!Number.isFinite(expiresAtMs) || expiresAtMs <= 0) {
            const refreshed = await refreshAccessToken();
            return refreshed ? (localStorage.getItem("accessToken") || "") : "";
        }

        if (expiresAtMs <= Date.now() + REFRESH_SKEW_MS) {
            const refreshed = await refreshAccessToken();
            return refreshed ? (localStorage.getItem("accessToken") || "") : "";
        }

        scheduleRefreshFromToken(accessToken);
        return accessToken;
    };

    const normalizeUnreadCount = (value) => {
        const count = Number(value);
        if (!Number.isFinite(count) || count <= 0) {
            return 0;
        }
        return Math.max(0, Math.floor(count));
    };

    const clearInboxTimers = () => {
        if (inboxPollTimer !== null) {
            clearTimeout(inboxPollTimer);
            inboxPollTimer = null;
        }
        if (inboxRefreshTimer !== null) {
            clearTimeout(inboxRefreshTimer);
            inboxRefreshTimer = null;
        }
    };

    const updateInboxBadge = () => {
        const badgeEl = authBox ? authBox.querySelector("[data-sv-inbox-badge]") : null;
        if (!badgeEl) {
            return;
        }
        const count = normalizeUnreadCount(unreadCount);
        if (count <= 0) {
            badgeEl.hidden = true;
            badgeEl.textContent = "0";
            return;
        }
        badgeEl.hidden = false;
        badgeEl.textContent = count > 99 ? "99+" : String(count);
    };

    const scheduleUnreadPoll = (delayMs = INBOX_POLL_INTERVAL_MS) => {
        clearInboxTimers();
        if (document.hidden || !localStorage.getItem("accessToken")) {
            return;
        }
        inboxPollTimer = window.setTimeout(() => {
            void refreshUnreadCount({ immediate: true });
        }, Math.max(1_000, delayMs));
    };

    const resetInboxState = () => {
        unreadCount = 0;
        unreadRefreshInFlight = null;
        clearInboxTimers();
        updateInboxBadge();
    };

    const fetchUnreadCountNow = async () => {
        if (unreadRefreshInFlight) {
            return unreadRefreshInFlight;
        }
        unreadRefreshInFlight = (async () => {
            const accessToken = await getValidAccessToken();
            if (!accessToken) {
                resetInboxState();
                return 0;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages/unread-count`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: "application/json"
                    }
                });
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        resetInboxState();
                        return unreadCount;
                    }
                    scheduleUnreadPoll(INBOX_POLL_INTERVAL_MS);
                    return unreadCount;
                }
                const payload = await response.json().catch(() => ({}));
                unreadCount = normalizeUnreadCount(payload.count);
                updateInboxBadge();
                scheduleUnreadPoll();
                return unreadCount;
            } catch (_) {
                scheduleUnreadPoll(INBOX_POLL_INTERVAL_MS);
                return unreadCount;
            } finally {
                unreadRefreshInFlight = null;
            }
        })();
        return unreadRefreshInFlight;
    };

    const refreshUnreadCount = ({ immediate = false } = {}) => {
        if (immediate) {
            return fetchUnreadCountNow();
        }
        if (inboxRefreshTimer !== null) {
            clearTimeout(inboxRefreshTimer);
        }
        return new Promise((resolve) => {
            inboxRefreshTimer = window.setTimeout(async () => {
                inboxRefreshTimer = null;
                resolve(await fetchUnreadCountNow());
            }, INBOX_REFRESH_DEBOUNCE_MS);
        });
    };

    const ensureTokenOnWake = async () => {
        const accessToken = localStorage.getItem("accessToken") || "";
        if (!accessToken && !localStorage.getItem("refreshToken")) {
            return;
        }
        const expiresAtMs = readAccessTokenExpiryMs(accessToken);
        const needsRefresh = !accessToken
            || !Number.isFinite(expiresAtMs)
            || expiresAtMs <= 0
            || expiresAtMs <= Date.now() + REFRESH_SKEW_MS;
        if (needsRefresh) {
            await refreshAccessToken();
        } else {
            scheduleRefreshFromToken(accessToken);
        }
    };

    const bindInboxLifecycle = () => {
        if (inboxLifecycleBound) {
            return;
        }
        inboxLifecycleBound = true;
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                clearInboxTimers();
                return;
            }
            void (async () => {
                await ensureTokenOnWake();
                renderTopbar(readFreshProfileCache());
                void refreshUnreadCount({ immediate: true });
            })();
        });
        window.addEventListener("focus", () => {
            void (async () => {
                await ensureTokenOnWake();
                renderTopbar(readFreshProfileCache());
                void refreshUnreadCount({ immediate: true });
            })();
        });
        window.addEventListener("storage", (event) => {
            if (!event || !event.key) {
                return;
            }
            if (!["accessToken", "refreshToken", ACCESS_TOKEN_EXPIRES_AT_KEY, "userId", "authUserId"].includes(event.key)) {
                return;
            }
            if (!localStorage.getItem("accessToken")) {
                resetInboxState();
                renderTopbar();
                return;
            }
            renderTopbar(readFreshProfileCache());
            void refreshUnreadCount({ immediate: true });
        });
    };

    const escapeHtml = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const resolveAvatarUrl = (raw) => {
        const value = String(raw || "").trim();
        if (!value) {
            return "";
        }
        try {
            const url = new URL(value, window.location.href);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return "";
            }
            return url.href;
        } catch (_) {
            return "";
        }
    };

    const renderTopbar = (profileOverride) => {
        if (!authBox) {
            return;
        }

        const token = localStorage.getItem("accessToken") || "";
        if (!token) {
            resetInboxState();
            if (guestAuthMarkup) {
                authBox.innerHTML = guestAuthMarkup;
            }
            return;
        }

        const payload = parseJwtPayload(token) || {};
        const nickname = asText(localStorage.getItem("userNickname") || payload.nickname);
        const userId = resolvePublicUserId(localStorage.getItem("userId"), profileOverride?.userId, payload.userId);
        const authUserId = resolveAuthUserId(
            localStorage.getItem("authUserId"),
            profileOverride?.authUserId,
            payload.authUserId,
            payload.sub
        );
        const email = asText(localStorage.getItem("userEmail") || payload.email);
        const displayName = (profileOverride && profileOverride.displayName)
            ? asText(profileOverride.displayName)
            : asText(localStorage.getItem("userDisplayName") || payload.displayName || nickname || email || "Tai khoan");
        const initial = (displayName.charAt(0) || "U").toUpperCase();
        const profileHref = buildProfileHref({ nickname, userId, authUserId }, "profile.html");
        const role = asText(payload.role).toUpperCase();
        const dashboardLink = role === "SUPERADMIN" || role === "ADMIN"
            ? '<a class="sv-auth-dashboard" href="admin_dashboard.html">Dashboard</a>'
            : "";
        const avatarSeed = nickname || email || displayName;
        const palette = window.SVPAvatar && typeof window.SVPAvatar.palette === "function"
            ? window.SVPAvatar.palette(avatarSeed)
            : null;
        const storedAvatarUrl = localStorage.getItem("userAvatarUrl") || "";
        const avatarUrl = resolveAvatarUrl(profileOverride?.avatarUrl || storedAvatarUrl);
        const avatarStyle = avatarUrl
            ? ' style="background-image:url(\'' + escapeHtml(avatarUrl) + '\');background-size:cover;background-position:center;color:transparent;"'
            : (palette
                ? ' style="background:' + escapeHtml(palette.bg) + ';color:' + escapeHtml(palette.fg) + ';"'
                : "");
        const inboxBadgeText = unreadCount > 99 ? "99+" : String(Math.max(0, unreadCount));
        const inboxBadgeHidden = unreadCount > 0 ? "" : " hidden";

        authBox.innerHTML = (
            '<div class="sv-auth-user" title="' + escapeHtml(email || displayName) + '">' +
            '<a class="sv-auth-inbox" href="inbox.html" aria-label="Hộp thư riêng">' +
            '<span class="sv-auth-inbox__icon" aria-hidden="true">✉</span>' +
            '<span class="sv-auth-inbox__badge" data-sv-inbox-badge' + inboxBadgeHidden + '>' + escapeHtml(inboxBadgeText) + '</span>' +
            '</a>' +
            '<a class="sv-auth-link" href="' + profileHref + '">' +
            '<span class="sv-auth-avatar"' + avatarStyle + ">" + escapeHtml(initial) + "</span>" +
            '<span class="sv-auth-name">' + escapeHtml(displayName) + "</span>" +
            "</a>" +
            dashboardLink +
            '<button id="sv-auth-logout" class="sv-auth-logout" type="button">Đăng xuất</button>' +
            "</div>"
        );

        const logoutBtn = document.getElementById("sv-auth-logout");
        if (!logoutBtn) {
            return;
        }
        logoutBtn.addEventListener("click", () => {
            clearRefreshTimer();
            resetInboxState();
            removeSession();
            window.location.reload();
        });
        updateInboxBadge();
    };

    window.SVPAuth = {
        parseJwtPayload,
        normalizeSessionPayload,
        persistIdentity,
        resolvePublicUserId,
        resolveAuthUserId,
        buildProfileHref,
        saveSession,
        removeSession,
        refreshAccessToken,
        getValidAccessToken
    };

    window.SVPInbox = {
        refreshUnreadCount,
        getUnreadCount: () => unreadCount,
        clear: resetInboxState
    };

    const refreshProfileAvatar = async (accessTokenOverride) => {
        const cachedProfile = readFreshProfileCache();
        const knownProfileId = resolveAuthUserId(localStorage.getItem("authUserId"), cachedProfile?.authUserId)
            || resolvePublicUserId(localStorage.getItem("userId"), cachedProfile?.userId);
        if (cachedProfile && knownProfileId) {
            renderTopbar(cachedProfile);
            return;
        }
        const existingAvatar = localStorage.getItem("userAvatarUrl");
        if (existingAvatar && knownProfileId) {
            return;
        }
        const accessToken = accessTokenOverride || await getValidAccessToken();
        if (!accessToken) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/me`, {
                headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
            });
            if (!response.ok) {
                return;
            }
            const payload = await response.json().catch(() => ({}));
            persistIdentity(payload);
            if (!payload.avatarUrl) {
                localStorage.removeItem("userAvatarUrl");
            }
            saveProfileCache({
                displayName: payload.displayName || payload.nickname || payload.email,
                avatarUrl: payload.avatarUrl,
                email: payload.email,
                nickname: payload.nickname,
                userId: payload.userId,
                authUserId: payload.authUserId
            });
            renderTopbar({
                displayName: payload.displayName || payload.nickname || payload.email,
                avatarUrl: payload.avatarUrl,
                userId: payload.userId,
                authUserId: payload.authUserId
            });
        } catch (_) {
        }
    };

    const createTrackingId = (prefix) => {
        const value = (window.crypto && typeof window.crypto.randomUUID === "function")
            ? window.crypto.randomUUID()
            : (Date.now() + "-" + Math.random().toString(36).slice(2));
        return prefix ? `${prefix}-${value}` : value;
    };

    const toIsoString = (value) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    };

    const readVisitSessionState = () => {
        try {
            const raw = window.sessionStorage.getItem(VISIT_SESSION_STORAGE_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") {
                return null;
            }
            const sessionId = asText(parsed.sessionId);
            const sessionStartedAt = asText(parsed.sessionStartedAt);
            if (!sessionId || !sessionStartedAt) {
                return null;
            }
            const lastActivityAtMs = Number(parsed.lastActivityAtMs || 0);
            const engagedMs = Number(parsed.engagedMs || 0);
            const pageViewCount = Number(parsed.pageViewCount || 0);
            return {
                sessionId,
                sessionStartedAt,
                lastSeenAt: asText(parsed.lastSeenAt) || sessionStartedAt,
                lastActivityAtMs: Number.isFinite(lastActivityAtMs) && lastActivityAtMs > 0 ? lastActivityAtMs : Date.now(),
                engagedMs: Number.isFinite(engagedMs) && engagedMs > 0 ? engagedMs : 0,
                pageViewCount: Number.isFinite(pageViewCount) && pageViewCount > 0 ? Math.floor(pageViewCount) : 0,
                firstPath: asText(parsed.firstPath),
                lastPath: asText(parsed.lastPath),
                authUserId: resolveAuthUserId(parsed.authUserId)
            };
        } catch (_) {
            return null;
        }
    };

    const writeVisitSessionState = (state) => {
        if (!state || typeof state !== "object") {
            return;
        }
        try {
            window.sessionStorage.setItem(VISIT_SESSION_STORAGE_KEY, JSON.stringify(state));
        } catch (_) {
        }
    };

    const resolveTrackingAuthUserId = () => {
        const payload = parseJwtPayload(localStorage.getItem("accessToken") || "") || {};
        return resolveAuthUserId(
            payload.sub,
            payload.authUserId,
            payload.auth_user_id,
            localStorage.getItem("authUserId")
        );
    };

    const buildNewVisitSessionState = (path, authUserId, nowMs) => ({
        sessionId: createTrackingId("session"),
        sessionStartedAt: toIsoString(nowMs),
        lastSeenAt: toIsoString(nowMs),
        lastActivityAtMs: nowMs,
        engagedMs: 0,
        pageViewCount: 0,
        firstPath: path,
        lastPath: path,
        authUserId: authUserId || ""
    });

    const shouldRotateVisitSession = (state, authUserId, nowMs) => {
        if (!state || !state.sessionId || !state.sessionStartedAt) {
            return true;
        }
        const lastActivityAtMs = Number(state.lastActivityAtMs || 0);
        if (!Number.isFinite(lastActivityAtMs) || lastActivityAtMs <= 0) {
            return true;
        }
        if ((nowMs - lastActivityAtMs) > VISIT_SESSION_IDLE_TIMEOUT_MS) {
            return true;
        }
        return asText(state.authUserId) !== asText(authUserId);
    };

    const ensureVisitSessionState = (path) => {
        const nowMs = Date.now();
        const authUserId = resolveTrackingAuthUserId();
        let state = readVisitSessionState();
        if (shouldRotateVisitSession(state, authUserId, nowMs)) {
            state = buildNewVisitSessionState(path, authUserId, nowMs);
        }
        state.lastSeenAt = toIsoString(nowMs);
        state.lastActivityAtMs = nowMs;
        state.lastPath = path;
        state.firstPath = state.firstPath || path;
        if (authUserId) {
            state.authUserId = authUserId;
        }
        state.pageViewCount = Math.max(0, Number(state.pageViewCount || 0)) + 1;
        visitSessionState = state;
        visitVisibleSinceMs = document.visibilityState === "hidden" ? 0 : nowMs;
        writeVisitSessionState(state);
        return state;
    };

    const buildTrackingRequest = (payload) => {
        return {
            body: JSON.stringify(payload),
            contentType: "text/plain;charset=UTF-8"
        };
    };

    const postTracking = (url, payload) => {
        const request = buildTrackingRequest(payload);
        if (window.navigator && typeof window.navigator.sendBeacon === "function") {
            try {
                const blob = new Blob([request.body], { type: request.contentType });
                if (window.navigator.sendBeacon(url, blob)) {
                    return;
                }
            } catch (_) {
            }
        }
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": request.contentType },
            body: request.body,
            keepalive: true
        }).catch(() => {});
    };

    const persistVisitSessionState = (nowMs) => {
        if (!visitSessionState) {
            return;
        }
        visitSessionState.lastSeenAt = toIsoString(nowMs);
        visitSessionState.lastActivityAtMs = nowMs;
        const authUserId = resolveTrackingAuthUserId();
        if (authUserId) {
            visitSessionState.authUserId = authUserId;
        }
        writeVisitSessionState(visitSessionState);
    };

    const accumulateVisitEngagement = (nowMs = Date.now()) => {
        if (!visitSessionState) {
            return;
        }
        if (visitVisibleSinceMs > 0) {
            const delta = Math.max(0, nowMs - visitVisibleSinceMs);
            visitSessionState.engagedMs = Math.min(
                VISIT_SESSION_MAX_ENGAGED_MS,
                Math.max(0, Number(visitSessionState.engagedMs || 0)) + delta
            );
            visitVisibleSinceMs = 0;
        }
        persistVisitSessionState(nowMs);
    };

    const buildVisitSessionPayload = () => {
        if (!visitSessionState || !visitSessionState.sessionId) {
            return null;
        }
        const authUserId = resolveAuthUserId(visitSessionState.authUserId);
        return {
            sessionId: visitSessionState.sessionId,
            authUserId: authUserId ? Number(authUserId) : undefined,
            sessionStartedAt: visitSessionState.sessionStartedAt,
            lastSeenAt: visitSessionState.lastSeenAt,
            engagedSeconds: Math.max(0, Math.round(Number(visitSessionState.engagedMs || 0) / 1000)),
            pageViewCount: Math.max(0, Number(visitSessionState.pageViewCount || 0)),
            firstPath: visitSessionState.firstPath || "",
            lastPath: visitSessionState.lastPath || ""
        };
    };

    const buildVisitSessionFlushKey = (payload) => {
        if (!payload || !payload.sessionId) {
            return "";
        }
        return JSON.stringify({
            sessionId: payload.sessionId,
            authUserId: payload.authUserId || 0,
            engagedSeconds: payload.engagedSeconds || 0,
            pageViewCount: payload.pageViewCount || 0,
            firstPath: payload.firstPath || "",
            lastPath: payload.lastPath || ""
        });
    };

    const flushVisitSession = () => {
        try {
            const nowMs = Date.now();
            if (!visitSessionState || (nowMs - lastVisitSessionFlushAt) < VISIT_SESSION_MIN_FLUSH_INTERVAL_MS) {
                return;
            }
            accumulateVisitEngagement(nowMs);
            const payload = buildVisitSessionPayload();
            if (!payload) {
                return;
            }
            const flushKey = buildVisitSessionFlushKey(payload);
            if (flushKey && flushKey === lastVisitSessionFlushKey) {
                return;
            }
            lastVisitSessionFlushAt = nowMs;
            lastVisitSessionFlushKey = flushKey;
            postTracking(API_BASE_URL + "/stats/visit-session", payload);
        } catch (_) {
        }
    };

    const resumeVisitSession = () => {
        const nowMs = Date.now();
        const path = window.location.pathname + window.location.search;
        const authUserId = resolveTrackingAuthUserId();
        if (shouldRotateVisitSession(visitSessionState, authUserId, nowMs)) {
            visitSessionState = buildNewVisitSessionState(path, authUserId, nowMs);
            visitSessionState.pageViewCount = 1;
            writeVisitSessionState(visitSessionState);
        }
        if (!visitSessionState) {
            return;
        }
        if (visitVisibleSinceMs <= 0) {
            visitVisibleSinceMs = nowMs;
        }
        persistVisitSessionState(nowMs);
    };

    const bindVisitTrackingLifecycle = () => {
        if (visitLifecycleBound) {
            return;
        }
        visitLifecycleBound = true;
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                flushVisitSession();
            } else {
                resumeVisitSession();
            }
        });
        window.addEventListener("pagehide", () => {
            flushVisitSession();
        });
        window.addEventListener("focus", () => {
            resumeVisitSession();
        });
    };

    const trackVisit = () => {
        try {
            const path = window.location.pathname + window.location.search;
            ensureVisitSessionState(path);
            const payload = {
                path,
                referrer: document.referrer || "",
                clientVisitId: createTrackingId("visit"),
                ...(buildVisitSessionPayload() || {})
            };
            postTracking(API_BASE_URL + "/stats/visit", payload);
        } catch (_) {
        }
    };

    bindInboxLifecycle();
    initializeBrandHomeLink();

    const bootstrapProfile = readFreshProfileCache();
    renderTopbar(bootstrapProfile);

    scheduleNonCritical(() => {
        void (async () => {
            const accessToken = await getValidAccessToken();
            renderTopbar(readFreshProfileCache() || bootstrapProfile);
            if (accessToken) {
                void refreshProfileAvatar(accessToken);
                void refreshUnreadCount({ immediate: true });
            }
        })();
    }, 1200);

    bindVisitTrackingLifecycle();
    trackVisit();
})();
