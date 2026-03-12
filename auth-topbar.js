(function () {
    const API_BASE_URL = window.SVP_API_BASE_URL || "http://localhost:8080";
    const REFRESH_SKEW_MS = 60 * 1000;
    const MIN_REFRESH_DELAY_MS = 5 * 1000;
    const RETRY_REFRESH_DELAY_MS = 30 * 1000;
    const authBox = document.querySelector(".sv-auth");
    const guestAuthMarkup = authBox ? authBox.innerHTML : "";
    let refreshTimer = null;
    let refreshInFlight = null;

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

    const removeSession = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userNickname");
        localStorage.removeItem("userId");
    };

    const saveSession = (payload) => {
        if (!payload || typeof payload !== "object") {
            return false;
        }
        const accessToken = String(payload.accessToken || "").trim();
        const refreshToken = String(payload.refreshToken || "").trim();
        if (!accessToken || !refreshToken) {
            return false;
        }
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        if (payload.email) {
            localStorage.setItem("userEmail", payload.email);
        }
        if (payload.nickname) {
            localStorage.setItem("userNickname", payload.nickname);
        }
        if (payload.userId !== undefined && payload.userId !== null) {
            localStorage.setItem("userId", String(payload.userId));
        }
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
            if (guestAuthMarkup) {
                authBox.innerHTML = guestAuthMarkup;
            }
            return;
        }

        const payload = parseJwtPayload(token) || {};
        const nickname = (localStorage.getItem("userNickname") || payload.nickname || "").trim();
        const email = (localStorage.getItem("userEmail") || payload.email || "").trim();
        const displayName = (profileOverride && profileOverride.displayName)
            ? String(profileOverride.displayName).trim()
            : (localStorage.getItem("userDisplayName") || nickname || email || "Tai khoan");
        const initial = (displayName.charAt(0) || "U").toUpperCase();
        const profileHref = nickname
            ? "profile.html?nickname=" + encodeURIComponent(nickname)
            : "profile.html";
        const role = String(payload.role || "").toUpperCase();
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

        authBox.innerHTML = (
            '<div class="sv-auth-user" title="' + escapeHtml(email || displayName) + '">' +
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
            removeSession();
            window.location.reload();
        });
    };

    window.SVPAuth = {
        parseJwtPayload,
        removeSession,
        refreshAccessToken,
        getValidAccessToken
    };

    const refreshProfileAvatar = async () => {
        const existingAvatar = localStorage.getItem("userAvatarUrl");
        if (existingAvatar) {
            return;
        }
        const accessToken = await getValidAccessToken();
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
            if (payload.displayName) {
                localStorage.setItem("userDisplayName", String(payload.displayName));
            } else if (payload.nickname) {
                localStorage.removeItem("userDisplayName");
            }
            if (payload.avatarUrl) {
                localStorage.setItem("userAvatarUrl", String(payload.avatarUrl));
            } else {
                localStorage.removeItem("userAvatarUrl");
            }
            renderTopbar({
                displayName: payload.displayName || payload.nickname || payload.email,
                avatarUrl: payload.avatarUrl
            });
        } catch (_) {
        }
    };

    const trackVisit = () => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const path = window.location.pathname + window.location.search;
            const key = "svp.visit." + today + "." + encodeURIComponent(path);
            if (localStorage.getItem(key)) {
                return;
            }
            const payload = {
                path,
                referrer: document.referrer || ""
            };
            const url = API_BASE_URL + "/stats/visit";
            if (navigator.sendBeacon) {
                const ok = navigator.sendBeacon(
                    url,
                    new Blob([JSON.stringify(payload)], { type: "text/plain;charset=UTF-8" })
                );
                if (ok) {
                    localStorage.setItem(key, "1");
                    return;
                }
            }
            fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true
            }).then(() => {
                localStorage.setItem(key, "1");
            }).catch(() => {});
        } catch (_) {
        }
    };

    (async () => {
        await getValidAccessToken();
        renderTopbar();
        void refreshProfileAvatar();
        trackVisit();
    })();
})();
