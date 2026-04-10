(function () {
    const API_BASE_URL = window.SVP_API_BASE_URL || "http://localhost:8080";
    const listEl = document.getElementById("inbox-conversation-list");
    const statusEl = document.getElementById("inbox-status");
    const countEl = document.getElementById("inbox-count");
    const searchEl = document.getElementById("inbox-search");
    const refreshBtn = document.getElementById("inbox-refresh");
    const composerForm = document.getElementById("inbox-start-form");
    const targetInput = document.getElementById("inbox-target");
    const composerStatusEl = document.getElementById("inbox-start-status");
    const gateEl = document.getElementById("inbox-login-gate");

    if (!listEl || !statusEl || !countEl || !searchEl || !refreshBtn || !composerForm || !targetInput || !composerStatusEl || !gateEl) {
        return;
    }

    const state = {
        accessToken: "",
        conversations: [],
        loading: false
    };

    const escapeHtml = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const toMillis = (value) => {
        const time = Date.parse(String(value || ""));
        return Number.isFinite(time) ? time : 0;
    };

    const formatDateTime = (value) => {
        const time = toMillis(value);
        if (!time) {
            return "Không rõ";
        }
        return new Intl.DateTimeFormat("vi-VN", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(new Date(time));
    };

    const timeAgo = (value) => {
        const time = toMillis(value);
        if (!time) {
            return "Không rõ";
        }
        const diffMinutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
        if (diffMinutes < 1) return "Vừa xong";
        if (diffMinutes < 60) return `${diffMinutes} phút trước`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} ngày trước`;
    };

    const avatarMarkup = (user) => {
        const displayName = String(user?.displayName || user?.nickname || "U").trim();
        const avatarUrl = String(user?.avatarUrl || "").trim();
        if (avatarUrl) {
            return `<span class="sv-inbox-avatar" style="background-image:url('${escapeHtml(avatarUrl)}')"></span>`;
        }
        const seed = user?.nickname || user?.userId || displayName;
        const palette = window.SVPAvatar?.palette ? window.SVPAvatar.palette(seed) : { bg: "#1a73e8", fg: "#fff" };
        const initial = window.SVPAvatar?.initial ? window.SVPAvatar.initial(displayName) : (displayName.charAt(0) || "U").toUpperCase();
        return `<span class="sv-inbox-avatar" style="background:${escapeHtml(palette.bg)};color:${escapeHtml(palette.fg)};">${escapeHtml(initial)}</span>`;
    };

    const setStatus = (text, type) => {
        statusEl.textContent = text || "";
        statusEl.className = "small";
        if (type === "error") {
            statusEl.classList.add("text-danger");
        } else if (type === "success") {
            statusEl.classList.add("text-success");
        } else if (type === "muted") {
            statusEl.classList.add("text-muted");
        }
    };

    const setComposerStatus = (text, type) => {
        composerStatusEl.textContent = text || "";
        composerStatusEl.className = "small";
        if (type === "error") {
            composerStatusEl.classList.add("text-danger");
        } else if (type === "success") {
            composerStatusEl.classList.add("text-success");
        } else if (type === "muted") {
            composerStatusEl.classList.add("text-muted");
        }
    };

    const getAccessToken = async () => {
        if (!window.SVPAuth?.getValidAccessToken) {
            return "";
        }
        state.accessToken = await window.SVPAuth.getValidAccessToken();
        return state.accessToken;
    };

    const filteredConversations = () => {
        const query = String(searchEl.value || "").trim().toLowerCase();
        if (!query) {
            return state.conversations;
        }
        return state.conversations.filter((conversation) => {
            const otherUser = conversation?.otherUser || {};
            const lastMessage = conversation?.lastMessage || {};
            const haystack = [
                otherUser.displayName,
                otherUser.nickname,
                lastMessage.content
            ].join(" ").toLowerCase();
            return haystack.includes(query);
        });
    };

    const renderConversations = () => {
        const items = filteredConversations();
        countEl.textContent = `${items.length} hội thoại`;
        if (!items.length) {
            listEl.innerHTML = state.loading
                ? '<div class="sv-inbox-empty">Đang tải hội thoại...</div>'
                : '<div class="sv-inbox-empty">Chưa có hội thoại nào. Hãy bắt đầu cuộc trò chuyện mới ở khung bên phải hoặc từ trang hồ sơ thành viên.</div>';
            return;
        }
        listEl.innerHTML = items.map((conversation) => {
            const otherUser = conversation.otherUser || {};
            const lastMessage = conversation.lastMessage || null;
            const preview = lastMessage?.content
                ? escapeHtml(lastMessage.content)
                : "Chưa có tin nhắn. Bấm để mở hội thoại.";
            const unreadMarkup = conversation.unreadCount > 0
                ? `<span class="sv-inbox-pill">${conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span>`
                : "";
            return `
                <a class="sv-inbox-row" href="chat.html?conversationId=${encodeURIComponent(conversation.conversationId)}">
                    <div class="sv-inbox-row__main">
                        ${avatarMarkup(otherUser)}
                        <div class="sv-inbox-row__content">
                            <div class="sv-inbox-row__head">
                                <div>
                                    <div class="sv-inbox-row__name">${escapeHtml(otherUser.displayName || otherUser.nickname || "Thành viên SVP")}</div>
                                </div>
                                ${unreadMarkup}
                            </div>
                            <div class="sv-inbox-row__preview">${preview}</div>
                        </div>
                    </div>
                    <div class="sv-inbox-row__time">
                        <div>${escapeHtml(timeAgo(lastMessage?.createdAt || conversation.updatedAt))}</div>
                        <div class="sv-meta">${escapeHtml(formatDateTime(lastMessage?.createdAt || conversation.updatedAt))}</div>
                    </div>
                </a>
            `;
        }).join("");
    };

    const fetchJson = async (url, options = {}) => {
        const response = await fetch(url, options);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || "Không thể kết nối hộp thư.");
        }
        return payload;
    };

    const loadConversations = async () => {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            gateEl.classList.remove("d-none");
            listEl.innerHTML = '<div class="sv-inbox-empty">Bạn cần đăng nhập để xem hộp thư.</div>';
            countEl.textContent = "0 hội thoại";
            setStatus("", "");
            return;
        }

        gateEl.classList.add("d-none");
        state.loading = true;
        renderConversations();
        setStatus("Đang tải hộp thư...", "muted");
        try {
            const payload = await fetchJson(`${API_BASE_URL}/api/messages/conversations`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/json"
                }
            });
            state.conversations = Array.isArray(payload.items) ? payload.items : [];
            state.loading = false;
            renderConversations();
            setStatus("Hộp thư đã được cập nhật.", "success");
            if (window.SVPInbox?.refreshUnreadCount) {
                void window.SVPInbox.refreshUnreadCount({ immediate: true });
            }
        } catch (error) {
            state.loading = false;
            renderConversations();
            setStatus(error.message || "Không thể tải hộp thư.", "error");
        }
    };

    const startConversation = async (identifier) => {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            throw new Error("Bạn cần đăng nhập để bắt đầu hội thoại.");
        }
        return fetchJson(`${API_BASE_URL}/api/messages/conversation/${encodeURIComponent(identifier)}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json"
            }
        });
    };

    searchEl.addEventListener("input", () => {
        renderConversations();
    });

    refreshBtn.addEventListener("click", () => {
        void loadConversations();
    });

    composerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const identifier = String(targetInput.value || "").trim();
        if (!identifier) {
            setComposerStatus("Nhập định danh thành viên, UUID hoặc auth user id.", "error");
            return;
        }
        setComposerStatus("Đang tạo hội thoại...", "muted");
        try {
            const conversation = await startConversation(identifier);
            setComposerStatus("Đang mở khung chat...", "success");
            window.location.href = `chat.html?conversationId=${encodeURIComponent(conversation.conversationId)}`;
        } catch (error) {
            setComposerStatus(error.message || "Không thể bắt đầu hội thoại.", "error");
        }
    });

    void loadConversations();
})();
