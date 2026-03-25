(function () {
    const API_BASE_URL = window.SVP_API_BASE_URL || "http://localhost:8080";
    const headerEl = document.getElementById("chat-header");
    const listEl = document.getElementById("chat-message-list");
    const statusEl = document.getElementById("chat-status");
    const refreshBtn = document.getElementById("chat-refresh");
    const loadOlderBtn = document.getElementById("chat-load-older");
    const formEl = document.getElementById("chat-form");
    const inputEl = document.getElementById("chat-input");
    const gateEl = document.getElementById("chat-login-gate");
    const emptyEl = document.getElementById("chat-empty");

    if (!headerEl || !listEl || !statusEl || !refreshBtn || !loadOlderBtn || !formEl || !inputEl || !gateEl || !emptyEl) {
        return;
    }

    const state = {
        accessToken: "",
        conversationId: null,
        conversation: null,
        messages: [],
        nextCursor: null,
        loading: false,
        sending: false
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

    const avatarMarkup = (user) => {
        const displayName = String(user?.displayName || user?.nickname || "U").trim();
        const avatarUrl = String(user?.avatarUrl || "").trim();
        if (avatarUrl) {
            return `<span class="sv-chat-avatar" style="background-image:url('${escapeHtml(avatarUrl)}')"></span>`;
        }
        const seed = user?.nickname || user?.userId || displayName;
        const palette = window.SVPAvatar?.palette ? window.SVPAvatar.palette(seed) : { bg: "#1a73e8", fg: "#fff" };
        const initial = window.SVPAvatar?.initial ? window.SVPAvatar.initial(displayName) : (displayName.charAt(0) || "U").toUpperCase();
        return `<span class="sv-chat-avatar" style="background:${escapeHtml(palette.bg)};color:${escapeHtml(palette.fg)};">${escapeHtml(initial)}</span>`;
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

    const getAccessToken = async () => {
        if (!window.SVPAuth?.getValidAccessToken) {
            return "";
        }
        state.accessToken = await window.SVPAuth.getValidAccessToken();
        return state.accessToken;
    };

    const fetchJson = async (url, options = {}) => {
        const response = await fetch(url, options);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || "Không thể tải hội thoại.");
        }
        return payload;
    };

    const compareMessages = (left, right) => {
        const leftTime = toMillis(left?.createdAt);
        const rightTime = toMillis(right?.createdAt);
        if (leftTime !== rightTime) {
            return leftTime - rightTime;
        }
        const leftNumericId = Number(left?.messageId);
        const rightNumericId = Number(right?.messageId);
        if (Number.isFinite(leftNumericId) && Number.isFinite(rightNumericId) && leftNumericId !== rightNumericId) {
            return leftNumericId - rightNumericId;
        }
        const leftId = String(left?.messageId || "");
        const rightId = String(right?.messageId || "");
        return leftId.localeCompare(rightId, "en");
    };

    const mergeMessages = (baseMessages, extraMessages) => {
        const map = new Map();
        [...baseMessages, ...extraMessages].forEach((message) => {
            map.set(String(message.messageId), message);
        });
        return Array.from(map.values()).sort(compareMessages);
    };

    const renderHeader = () => {
        const otherUser = state.conversation?.otherUser || null;
        if (!otherUser) {
            headerEl.innerHTML = `
                <div>
                    <div class="sv-section-title mb-1">Hội thoại riêng</div>
                    <div class="sv-meta">Nhập một nickname từ hộp thư để bắt đầu.</div>
                </div>
            `;
            return;
        }
        headerEl.innerHTML = `
            <div class="sv-chat-header__user">
                ${avatarMarkup(otherUser)}
                <div>
                    <div class="sv-chat-header__name">${escapeHtml(otherUser.displayName || otherUser.nickname || "Thành viên SVP")}</div>
                    <div class="sv-meta">@${escapeHtml(otherUser.nickname || "user")} • Bấm Làm mới để xem tin nhắn mới nhất.</div>
                </div>
            </div>
        `;
    };

    const renderMessages = () => {
        renderHeader();
        loadOlderBtn.hidden = !state.nextCursor;
        emptyEl.hidden = state.messages.length > 0;
        if (!state.messages.length) {
            listEl.innerHTML = "";
            return;
        }
        listEl.innerHTML = state.messages.map((message) => {
            const classes = [
                "sv-chat-bubble",
                message.ownMessage ? "sv-chat-bubble--own" : "sv-chat-bubble--other",
                message.pending ? "sv-chat-bubble--pending" : "",
                message.failed ? "sv-chat-bubble--failed" : ""
            ].filter(Boolean).join(" ");
            const meta = message.pending
                ? "Đang gửi..."
                : (message.failed ? "Gửi thất bại" : formatDateTime(message.createdAt));
            return `
                <div class="${classes}">
                    <div class="sv-chat-bubble__content">${escapeHtml(message.content)}</div>
                    <div class="sv-chat-bubble__meta">${escapeHtml(meta)}</div>
                </div>
            `;
        }).join("");
    };

    const scrollToBottom = () => {
        listEl.scrollTop = listEl.scrollHeight;
    };

    const markConversationRead = async () => {
        if (!state.conversationId || !state.accessToken) {
            return;
        }
        try {
            const payload = await fetchJson(`${API_BASE_URL}/api/messages/conversation/${state.conversationId}/read`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${state.accessToken}`,
                    Accept: "application/json"
                }
            });
            if (payload.markedCount > 0) {
                state.messages = state.messages.map((message) => (
                    message.ownMessage ? message : { ...message, read: true }
                ));
                renderMessages();
            }
            if (window.SVPInbox?.refreshUnreadCount) {
                void window.SVPInbox.refreshUnreadCount({ immediate: true });
            }
        } catch (_) {
        }
    };

    const fetchThreadPage = async (cursor) => {
        const params = new URLSearchParams({ limit: "30" });
        if (cursor) {
            params.set("cursor", cursor);
        }
        return fetchJson(`${API_BASE_URL}/api/messages/conversation/${state.conversationId}?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${state.accessToken}`,
                Accept: "application/json"
            }
        });
    };

    const loadLatest = async ({ preserveExisting = false, scroll = false } = {}) => {
        if (!state.conversationId || !state.accessToken) {
            return;
        }
        state.loading = true;
        setStatus("Đang tải hội thoại...", "muted");
        try {
            const payload = await fetchThreadPage("");
            state.conversation = payload.conversation || state.conversation;
            state.nextCursor = payload.nextCursor || null;
            const freshItems = Array.isArray(payload.items) ? payload.items : [];
            state.messages = preserveExisting
                ? mergeMessages(state.messages, freshItems)
                : freshItems;
            renderMessages();
            if (scroll) {
                scrollToBottom();
            }
            setStatus("Hội thoại đã được cập nhật.", "success");
            await markConversationRead();
        } catch (error) {
            setStatus(error.message || "Không thể tải hội thoại.", "error");
        } finally {
            state.loading = false;
        }
    };

    const loadOlder = async () => {
        if (!state.nextCursor || !state.conversationId || !state.accessToken) {
            return;
        }
        loadOlderBtn.disabled = true;
        setStatus("Đang tải tin nhắn cũ hơn...", "muted");
        try {
            const payload = await fetchThreadPage(state.nextCursor);
            state.nextCursor = payload.nextCursor || null;
            const items = Array.isArray(payload.items) ? payload.items : [];
            state.messages = mergeMessages(items, state.messages);
            renderMessages();
            setStatus("Đã tải thêm lịch sử.", "success");
        } catch (error) {
            setStatus(error.message || "Không thể tải thêm lịch sử.", "error");
        } finally {
            loadOlderBtn.disabled = false;
        }
    };

    const resolveConversation = async () => {
        const params = new URLSearchParams(window.location.search);
        const conversationIdRaw = String(params.get("conversationId") || "").trim();
        const userIdentifier = String(
            params.get("userId")
            || params.get("user")
            || params.get("nickname")
            || ""
        ).trim();

        if (conversationIdRaw) {
            const conversationId = Number(conversationIdRaw);
            if (!Number.isFinite(conversationId) || conversationId <= 0) {
                throw new Error("conversationId không hợp lệ.");
            }
            state.conversationId = conversationId;
            return;
        }

        if (!userIdentifier) {
            throw new Error("Thiếu conversationId hoặc userId.");
        }

        const payload = await fetchJson(`${API_BASE_URL}/api/messages/conversation/${encodeURIComponent(userIdentifier)}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${state.accessToken}`,
                Accept: "application/json"
            }
        });
        state.conversationId = payload.conversationId;
        state.conversation = payload;
        window.history.replaceState({}, "", `chat.html?conversationId=${encodeURIComponent(payload.conversationId)}`);
    };

    const sendMessage = async (content) => {
        if (state.sending || !state.accessToken || !state.conversationId) {
            return;
        }
        state.sending = true;
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const optimistic = {
            messageId: tempId,
            content,
            createdAt: new Date().toISOString(),
            ownMessage: true,
            read: false,
            pending: true,
            failed: false
        };
        state.messages = mergeMessages(state.messages, [optimistic]);
        renderMessages();
        scrollToBottom();
        setStatus("Đang gửi tin nhắn...", "muted");
        try {
            const payload = await fetchJson(`${API_BASE_URL}/api/messages`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${state.accessToken}`,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    conversationId: state.conversationId,
                    content
                })
            });
            state.messages = state.messages.map((message) => (
                String(message.messageId) === tempId
                    ? payload.message
                    : message
            ));
            renderMessages();
            scrollToBottom();
            setStatus("Tin nhắn đã được gửi.", "success");
            if (window.SVPInbox?.refreshUnreadCount) {
                void window.SVPInbox.refreshUnreadCount({ immediate: true });
            }
        } catch (error) {
            state.messages = state.messages.map((message) => (
                String(message.messageId) === tempId
                    ? { ...message, pending: false, failed: true }
                    : message
            ));
            renderMessages();
            setStatus(error.message || "Không thể gửi tin nhắn.", "error");
        } finally {
            state.sending = false;
        }
    };

    refreshBtn.addEventListener("click", () => {
        void loadLatest({ preserveExisting: true, scroll: false });
    });

    loadOlderBtn.addEventListener("click", () => {
        void loadOlder();
    });

    formEl.addEventListener("submit", async (event) => {
        event.preventDefault();
        const content = String(inputEl.value || "").trim();
        if (!content) {
            setStatus("Nhập nội dung tin nhắn.", "error");
            return;
        }
        inputEl.value = "";
        await sendMessage(content);
    });

    const init = async () => {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            gateEl.classList.remove("d-none");
            setStatus("Bạn cần đăng nhập để mở hội thoại.", "error");
            return;
        }
        gateEl.classList.add("d-none");
        try {
            await resolveConversation();
            await loadLatest({ preserveExisting: false, scroll: true });
            if (window.SVPInbox?.refreshUnreadCount) {
                void window.SVPInbox.refreshUnreadCount({ immediate: true });
            }
        } catch (error) {
            setStatus(error.message || "Không thể mở hội thoại.", "error");
        }
    };

    void init();
})();
