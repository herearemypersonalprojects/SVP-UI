(function () {
    const API_BASE_URL = window.SVP_API_BASE_URL || 'http://localhost:8080';
    const urlHelpers = window.SVPSeo && window.SVPSeo.urls ? window.SVPSeo.urls : null;
    const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
    const CATEGORY_NAMES = {
        1: 'Học tập và nghiên cứu tại Pháp',
        2: 'Kinh nghiệm xin học bổng và du học',
        3: 'Cuộc sống tại Pháp',
        4: 'Cơ hội việc làm và thực tập',
        5: 'Các vấn đề pháp lý, quốc tịch và thuế khóa',
        6: 'Văn hóa và ngôn ngữ Pháp',
        7: 'Sự kiện và giao lưu',
        8: 'Nhà cửa',
        9: 'Mua bán, rao vặt',
        10: 'Đầu tư tại Pháp',
        11: 'Chia sẻ trải nghiệm, câu chuyện cá nhân',
        12: 'Công nghệ, kỹ năng và tri thức mở',
        13: 'Giải trí, du lịch',
        14: 'Góc văn học và nghệ thuật',
        15: 'Nơi gặp gỡ, hẹn hò nghiêm túc',
        16: 'Chém gió, tán gẫu',
        17: 'Góp ý xây dựng SVP'
    };

    const avatarEl = document.getElementById('profile-avatar');
    const nameEl = document.getElementById('profile-display-name');
    const nicknameEl = document.getElementById('profile-nickname');
    const roleEl = document.getElementById('profile-role');
    const emailEl = document.getElementById('profile-email');
    const blogCountEl = document.getElementById('profile-blog-count');
    const followerCountEl = document.getElementById('profile-follower-count');
    const messageActionsEl = document.getElementById('profile-message-actions');
    const writeLinkEl = document.getElementById('profile-write-link');
    const followBtnEl = document.getElementById('profile-follow-btn');
    const followLoginEl = document.getElementById('profile-follow-login');
    const messageLinkEl = document.getElementById('profile-message-link');
    const panelHeadEl = document.getElementById('profile-panel-head');
    const panelTitleEl = document.getElementById('profile-panel-title');
    const headlineEl = document.getElementById('profile-headline');
    const spaceTitleEl = document.getElementById('profile-space-title');
    const spaceNoteEl = document.getElementById('profile-space-note');
    const tabsEl = document.getElementById('profile-tabs');
    const blogTabEl = document.getElementById('profile-tab-blog');
    const manageTabEl = document.getElementById('profile-tab-manage');
    const blogPanelEl = document.getElementById('profile-panel-blog');
    const managePanelEl = document.getElementById('profile-panel-manage');
    const blogListEl = document.getElementById('profile-blog-list');
    const formEl = document.getElementById('profile-form');
    const readonlyEl = document.getElementById('profile-readonly');
    const displayInput = document.getElementById('profile-display-input');
    const avatarUrlInput = document.getElementById('profile-avatar-url');
    const avatarFileInput = document.getElementById('profile-avatar-file');
    const previewAvatar = document.getElementById('profile-preview-avatar');
    const previewLabel = document.getElementById('profile-preview-label');
    const statusEl = document.getElementById('profile-status');
    const clearAvatarBtn = document.getElementById('profile-clear-avatar');

    if (!avatarEl || !nameEl || !nicknameEl || !roleEl || !emailEl || !blogCountEl || !followerCountEl
        || !messageActionsEl || !writeLinkEl || !followBtnEl || !followLoginEl || !messageLinkEl
        || !panelHeadEl || !panelTitleEl || !headlineEl || !spaceTitleEl || !spaceNoteEl
        || !tabsEl || !blogTabEl || !manageTabEl || !blogPanelEl || !managePanelEl
        || !blogListEl || !formEl || !readonlyEl
        || !displayInput || !avatarUrlInput || !avatarFileInput || !previewAvatar || !previewLabel
        || !statusEl || !clearAvatarBtn) {
        return;
    }

    let accessToken = '';
    let me = null;
    let space = null;
    let profile = null;
    let isSelf = false;
    let followInFlight = false;
    let activeTab = 'blog';

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const sanitizeUrl = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        try {
            const parsed = new URL(raw, window.location.href);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
        } catch (_) {
            return '';
        }
    };

    const setStatus = (text, type) => {
        statusEl.textContent = text || '';
        statusEl.className = 'sv-profile-status small';
        if (type === 'error') statusEl.classList.add('text-danger');
        if (type === 'success') statusEl.classList.add('text-success');
    };

    const setSpaceNote = (text) => {
        spaceNoteEl.textContent = text || '';
    };

    const getCategoryName = (categoryId) => CATEGORY_NAMES[Number(categoryId)] || 'Chuyên mục khác';

    const buildProfileHref = (nickname, userId) => {
        if (userId) return `profile.html?user_id=${encodeURIComponent(userId)}`;
        if (nickname) return `profile.html?nickname=${encodeURIComponent(nickname)}`;
        return 'profile.html';
    };

    const buildChatHref = (nickname, userId) => {
        if (nickname) return `chat.html?nickname=${encodeURIComponent(nickname)}`;
        if (userId) return `chat.html?userId=${encodeURIComponent(userId)}`;
        return 'chat.html';
    };

    const buildArticleHref = (postId, title) => urlHelpers
        ? urlHelpers.buildDetailPath('article', postId, title)
        : `post_detail.html?postId=${encodeURIComponent(postId)}`;
    const BLOG_EDITOR_HREF = 'create_new_article.html?mode=blog';

    const setActiveTab = (tabName) => {
        const nextTab = tabName === 'manage' && isSelf ? 'manage' : 'blog';
        activeTab = nextTab;
        const onBlog = nextTab === 'blog';

        blogTabEl.classList.toggle('is-active', onBlog);
        blogTabEl.setAttribute('aria-selected', onBlog ? 'true' : 'false');
        blogPanelEl.classList.toggle('d-none', !onBlog);

        manageTabEl.classList.toggle('is-active', !onBlog);
        manageTabEl.setAttribute('aria-selected', onBlog ? 'false' : 'true');
        managePanelEl.classList.toggle('d-none', onBlog);
    };

    const toPlainText = (html) => String(html ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

    const excerptText = (html, maxLength = 220) => {
        const plain = toPlainText(html);
        if (plain.length <= maxLength) return plain;
        return `${plain.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
    };

    const formatDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    };

    const renderAvatar = (targetEl, displayName, avatarUrl, seed) => {
        const safeName = String(displayName || '').trim();
        const fallbackInitial = window.SVPAvatar?.initial ? window.SVPAvatar.initial(safeName) : (safeName.charAt(0) || 'U').toUpperCase();
        const palette = window.SVPAvatar?.palette ? window.SVPAvatar.palette(seed || safeName) : { bg: '#e2e8f0', fg: '#475569' };
        const safeAvatarUrl = sanitizeUrl(avatarUrl);
        if (safeAvatarUrl) {
            targetEl.style.backgroundImage = `url('${escapeHtml(safeAvatarUrl)}')`;
            targetEl.style.backgroundColor = '#e2e8f0';
            targetEl.textContent = '';
            targetEl.style.color = '#fff';
        } else {
            targetEl.style.backgroundImage = '';
            targetEl.style.backgroundColor = palette.bg;
            targetEl.textContent = fallbackInitial;
            targetEl.style.color = palette.fg;
        }
    };

    const fetchMe = async () => {
        if (!window.SVPAuth?.getValidAccessToken) return null;
        accessToken = await window.SVPAuth.getValidAccessToken();
        if (!accessToken) return null;
        const response = await fetch(`${API_BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
            return await response.json();
        }
        const payload = window.SVPAuth?.parseJwtPayload
            ? window.SVPAuth.parseJwtPayload(accessToken) || {}
            : {};
        return {
            userId: payload.userId || null,
            email: payload.email || localStorage.getItem('userEmail') || '',
            nickname: payload.nickname || localStorage.getItem('userNickname') || '',
            displayName: payload.displayName || localStorage.getItem('userDisplayName') || ''
        };
    };

    const fetchUserSpace = async (nickname, userId) => {
        const params = new URLSearchParams();
        if (nickname) params.set('nickname', nickname);
        if (!nickname && userId) params.set('userId', userId);
        params.set('limit', '12');
        const response = await fetch(`${API_BASE_URL}/users/espace?${params.toString()}`, {
            headers: {
                Accept: 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || 'Không thể tải espace thành viên.');
        }
        return payload;
    };

    const uploadAvatarFile = async (file) => {
        if (!file) return '';
        if (file.size > AVATAR_MAX_BYTES) {
            throw new Error('Ảnh vượt quá 2MB.');
        }
        const presignResponse = await fetch(`${API_BASE_URL}/api/upload/post-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify({ filename: file.name, contentType: file.type })
        });
        const presignPayload = await presignResponse.json().catch(() => ({}));
        if (!presignResponse.ok) {
            throw new Error(presignPayload.error || 'Không thể tạo link upload.');
        }
        await fetch(presignPayload.uploadUrl, {
            method: presignPayload.method || 'PUT',
            headers: { 'Content-Type': presignPayload.contentType || file.type },
            body: file
        });
        return presignPayload.publicUrl || '';
    };

    const updateProfile = async (displayName, avatarUrl) => {
        if (!accessToken) throw new Error('Bạn cần đăng nhập để cập nhật hồ sơ.');
        const response = await fetch(`${API_BASE_URL}/me/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({ displayName, avatarUrl })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || 'Không thể cập nhật hồ sơ.');
        }
        return payload;
    };

    const updateFollow = async (following) => {
        if (!accessToken) throw new Error('Bạn cần đăng nhập để theo dõi.');
        if (!profile?.userId) throw new Error('Không xác định được thành viên cần theo dõi.');
        const response = await fetch(`${API_BASE_URL}/users/follows`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                targetUserId: profile.userId,
                following
            })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || 'Không thể cập nhật trạng thái theo dõi.');
        }
        return payload;
    };

    const renderBlogList = () => {
        const articles = Array.isArray(space?.articles) ? space.articles : [];
        if (articles.length === 0) {
            const cta = isSelf
                ? `<a class="btn btn-primary mt-3" href="${BLOG_EDITOR_HREF}">Viết blog đầu tiên</a>`
                : '';
            blogListEl.innerHTML = `<div class="sv-profile-empty">Chưa có blog nào được xuất bản.${cta}</div>`;
            return;
        }

        blogListEl.innerHTML = articles.map((item) => {
            const detailHref = buildArticleHref(item.postId, item.title);
            const coverUrl = sanitizeUrl(item.coverImageUrl);
            const coverNode = coverUrl
                ? `<a class="sv-profile-blog-cover" href="${detailHref}" style="background-image:url('${escapeHtml(coverUrl)}')"></a>`
                : `<a class="sv-profile-blog-cover is-empty" href="${detailHref}" aria-label="Mở blog"><i class="fa-regular fa-pen-to-square"></i></a>`;
            return `
                <article class="sv-profile-blog-card">
                    ${coverNode}
                    <div class="sv-profile-blog-body">
                        <div class="sv-profile-blog-top">
                            <span class="sv-pill"><i class="fa-regular fa-folder-open"></i>${escapeHtml(getCategoryName(item.categoryId))}</span>
                            <span class="sv-meta">${escapeHtml(formatDate(item.createdAt))}</span>
                        </div>
                        <div class="sv-profile-blog-title">
                            <a href="${detailHref}">${escapeHtml(item.title || 'Bài blog mới')}</a>
                        </div>
                        <div class="sv-profile-blog-excerpt">${escapeHtml(excerptText(item.contentHtml, 240) || 'Bài viết đang được cập nhật nội dung.')}</div>
                        <div class="sv-profile-blog-meta">
                            <span><strong>${Number(item.viewCount || 0).toLocaleString('vi-VN')}</strong> lượt xem</span>
                            <span><strong>${Number(item.likeCount || 0).toLocaleString('vi-VN')}</strong> thích</span>
                            <span><strong>${Number(item.commentCount || 0).toLocaleString('vi-VN')}</strong> bình luận</span>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    };

    const renderActions = () => {
        const viewer = space?.viewer || {};
        const showWrite = Boolean(isSelf);
        const showMessage = !isSelf && Boolean(accessToken) && Boolean(profile?.nickname || profile?.userId);
        const showFollow = !isSelf && Boolean(viewer.canFollow);
        const showFollowLogin = !isSelf && !viewer.authenticated;

        writeLinkEl.classList.toggle('d-none', !showWrite);
        if (showWrite) {
            writeLinkEl.href = BLOG_EDITOR_HREF;
        }
        messageLinkEl.classList.toggle('d-none', !showMessage);
        if (showMessage) {
            messageLinkEl.href = buildChatHref(profile?.nickname, profile?.userId);
        }

        followBtnEl.classList.toggle('d-none', !showFollow);
        if (showFollow) {
            const following = Boolean(viewer.following);
            followBtnEl.disabled = followInFlight;
            followBtnEl.textContent = following ? 'Bỏ theo dõi' : 'Theo dõi';
            followBtnEl.classList.toggle('btn-outline-primary', following);
            followBtnEl.classList.toggle('btn-primary', !following);
        }

        followLoginEl.classList.toggle('d-none', !showFollowLogin);
        followLoginEl.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;

        const hasVisibleAction = [writeLinkEl, followBtnEl, followLoginEl, messageLinkEl]
            .some((element) => element && !element.classList.contains('d-none'));
        messageActionsEl.classList.toggle('d-none', !hasVisibleAction);
    };

    const renderProfile = () => {
        if (!profile) return;
        const displayName = profile.displayName || profile.nickname || 'Thành viên';
        nameEl.textContent = displayName;
        nicknameEl.textContent = profile.nickname ? `@${profile.nickname}` : '';
        roleEl.textContent = profile.role ? `Vai trò: ${profile.role}` : '';
        blogCountEl.textContent = Number(space?.stats?.blogCount || 0).toLocaleString('vi-VN');
        followerCountEl.textContent = Number(space?.stats?.followerCount || 0).toLocaleString('vi-VN');
        emailEl.textContent = isSelf && me?.email ? me.email : '';
        panelHeadEl.classList.add('d-none');
        headlineEl.classList.add('d-none');
        panelTitleEl.textContent = '';
        spaceTitleEl.textContent = '';
        setSpaceNote('');
        document.title = `${displayName} - Espace SVP`;

        renderAvatar(avatarEl, displayName, profile.avatarUrl, profile.nickname || profile.userId);
        renderAvatar(previewAvatar, displayName, profile.avatarUrl, profile.nickname || profile.userId);
        displayInput.value = displayName;
        avatarUrlInput.value = profile.avatarUrl || '';

        if (isSelf) {
            localStorage.setItem('userDisplayName', displayName);
            if (profile.avatarUrl) {
                localStorage.setItem('userAvatarUrl', profile.avatarUrl);
            } else {
                localStorage.removeItem('userAvatarUrl');
            }
        }

        tabsEl.classList.toggle('d-none', !isSelf);
        manageTabEl.classList.toggle('d-none', !isSelf);
        if (!isSelf && activeTab === 'manage') {
            activeTab = 'blog';
        }
        setActiveTab(activeTab);
        renderActions();
        renderBlogList();
    };

    const updatePreview = () => {
        const displayName = displayInput.value.trim() || profile?.displayName || profile?.nickname || 'Thành viên';
        const avatarUrl = sanitizeUrl(avatarUrlInput.value.trim());
        renderAvatar(previewAvatar, displayName, avatarUrl, profile?.nickname || profile?.userId);
        previewLabel.textContent = avatarUrl ? 'Sẽ dùng URL ảnh mới.' : 'Ảnh đại diện sẽ theo chữ cái và màu mặc định.';
    };

    const setEditable = (editable) => {
        formEl.classList.toggle('d-none', !editable);
        readonlyEl.classList.toggle('d-none', editable);
        manageTabEl.classList.toggle('d-none', !editable);
        if (!editable && activeTab === 'manage') {
            setActiveTab('blog');
        }
    };

    const init = async () => {
        const params = new URLSearchParams(window.location.search);
        let nickname = params.get('nickname');
        let userId = params.get('user_id') || params.get('userId');

        me = await fetchMe();
        if (!nickname && !userId && me?.userId) {
            userId = me.userId;
            window.history.replaceState({}, '', buildProfileHref(me?.nickname, userId));
        } else if (!nickname && !userId && me?.nickname) {
            nickname = me.nickname;
            window.history.replaceState({}, '', buildProfileHref(nickname));
        }

        if (!nickname && !userId) {
            setStatus('Thiếu thông tin thành viên.', 'error');
            setSpaceNote('Hãy mở link profile của một thành viên hoặc đăng nhập để vào espace của bạn.');
            setEditable(false);
            blogListEl.innerHTML = '<div class="sv-profile-empty">Không có espace nào để hiển thị.</div>';
            return;
        }

        try {
            space = await fetchUserSpace(nickname, userId);
        } catch (error) {
            setStatus(error.message || 'Không thể tải espace.', 'error');
            setSpaceNote('Không thể tải espace thành viên vào lúc này.');
            setEditable(false);
            blogListEl.innerHTML = '<div class="sv-profile-empty">Không thể tải danh sách blog.</div>';
            return;
        }

        profile = space && typeof space.profile === 'object' ? space.profile : null;
        isSelf = Boolean(space?.viewer?.self);
        if (profile?.userId) {
            window.history.replaceState({}, '', buildProfileHref(profile.nickname, profile.userId));
        }
        setEditable(isSelf);
        renderProfile();
        updatePreview();
    };

    avatarUrlInput.addEventListener('input', updatePreview);
    displayInput.addEventListener('input', updatePreview);
    blogTabEl.addEventListener('click', () => {
        setActiveTab('blog');
    });
    manageTabEl.addEventListener('click', () => {
        if (!isSelf) return;
        setActiveTab('manage');
    });
    avatarFileInput.addEventListener('change', () => {
        const file = avatarFileInput.files && avatarFileInput.files[0] ? avatarFileInput.files[0] : null;
        previewLabel.textContent = file ? `Sẵn sàng tải ảnh: ${file.name}` : 'Chưa có thay đổi';
    });
    clearAvatarBtn.addEventListener('click', () => {
        avatarUrlInput.value = '';
        avatarFileInput.value = '';
        updatePreview();
    });
    followBtnEl.addEventListener('click', async () => {
        if (!space?.viewer?.canFollow || followInFlight) return;
        const nextFollowing = !Boolean(space.viewer.following);
        followInFlight = true;
        renderActions();
        setStatus(nextFollowing ? 'Đang theo dõi...' : 'Đang bỏ theo dõi...', '');
        try {
            const payload = await updateFollow(nextFollowing);
            if (space?.viewer) {
                space.viewer.following = Boolean(payload.following);
            }
            if (space?.stats) {
                space.stats.followerCount = Number(payload.followerCount || 0);
            }
            renderProfile();
            setStatus(nextFollowing ? 'Đã theo dõi thành viên này.' : 'Đã bỏ theo dõi thành viên này.', 'success');
        } catch (error) {
            setStatus(error.message || 'Không thể cập nhật theo dõi.', 'error');
        } finally {
            followInFlight = false;
            renderActions();
        }
    });
    formEl.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isSelf) return;
        setStatus('Đang lưu...', '');
        try {
            let avatarUrl = sanitizeUrl(avatarUrlInput.value.trim());
            const file = avatarFileInput.files && avatarFileInput.files[0] ? avatarFileInput.files[0] : null;
            if (file) {
                previewLabel.textContent = 'Đang tải ảnh lên...';
                avatarUrl = await uploadAvatarFile(file);
                avatarUrlInput.value = avatarUrl;
            }
            const displayName = displayInput.value.trim();
            const updated = await updateProfile(displayName, avatarUrl);
            profile = updated;
            if (space) {
                space.profile = updated;
            }
            renderProfile();
            updatePreview();
            setStatus('Đã cập nhật hồ sơ.', 'success');
        } catch (error) {
            setStatus(error.message || 'Không thể cập nhật hồ sơ.', 'error');
        }
    });

    init();
})();
