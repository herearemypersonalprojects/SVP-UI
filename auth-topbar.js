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
    const PROFILE_CACHE_KEY = "svp.auth.profileCache.v1";
    const PROFILE_CACHE_TTL_MS = 15 * 60 * 1000;
    const NON_CRITICAL_IDLE_TIMEOUT_MS = 1500;
    const INBOX_POLL_INTERVAL_MS = 30 * 1000;
    const INBOX_REFRESH_DEBOUNCE_MS = 250;
    const authBox = document.querySelector(".sv-auth");
    const guestAuthMarkup = authBox ? authBox.innerHTML : "";
    let refreshTimer = null;
    let refreshInFlight = null;
    let inboxPollTimer = null;
    let inboxRefreshTimer = null;
    let unreadRefreshInFlight = null;
    let unreadCount = 0;
    let inboxLifecycleBound = false;

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
        const payload = parseJwtPayload(accessToken) || {};
        const exp = Number(payload.exp || 0);
        if (!Number.isFinite(exp) || exp <= 0) {
            return;
        }
        const dueMs = exp * 1000 - Date.now() - REFRESH_SKEW_MS;
        const delay = Math.max(MIN_REFRESH_DELAY_MS, dueMs);
        refreshTimer = setTimeout(() => {
            void refreshAccessToken();
        }, delay);
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

        const payload = parseJwtPayload(accessToken) || {};
        const exp = Number(payload.exp || 0);
        if (!Number.isFinite(exp) || exp <= 0) {
            const refreshed = await refreshAccessToken();
            return refreshed ? (localStorage.getItem("accessToken") || "") : "";
        }

        if (exp * 1000 <= Date.now() + REFRESH_SKEW_MS) {
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
        const payload = parseJwtPayload(accessToken) || {};
        const exp = Number(payload.exp || 0);
        const needsRefresh = !accessToken
            || !Number.isFinite(exp)
            || exp <= 0
            || exp * 1000 <= Date.now() + REFRESH_SKEW_MS;
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
            if (!["accessToken", "refreshToken", "userId", "authUserId"].includes(event.key)) {
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

    const trackVisit = () => {
        try {
            const path = window.location.pathname + window.location.search;
            const clientVisitId = (window.crypto && typeof window.crypto.randomUUID === "function")
                ? window.crypto.randomUUID()
                : ("visit-" + Date.now() + "-" + Math.random().toString(36).slice(2));
            const payload = {
                path,
                referrer: document.referrer || "",
                clientVisitId
            };
            const url = API_BASE_URL + "/stats/visit";
            fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        } catch (_) {
        }
    };

    bindInboxLifecycle();

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

    trackVisit();
})();
