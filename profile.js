(function () {
    const API_BASE_URL = window.SVP_API_BASE_URL || 'http://localhost:8080';
    const urlHelpers = window.SVPSeo && window.SVPSeo.urls ? window.SVPSeo.urls : null;
    const PROFILE_LIST_LIMIT = 24;
    const AVATAR_SELECTION_MAX_BYTES = 10 * 1024 * 1024;
    const AVATAR_UPLOAD_MAX_BYTES = 10 * 1024;
    const AVATAR_OUTPUT_SIZE = 96;
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
    const joinedAtEl = document.getElementById('profile-joined-at');
    const lastActiveEl = document.getElementById('profile-last-active');
    const emailRowEl = document.getElementById('profile-email-row');
    const emailEl = document.getElementById('profile-email');
    const postCountEl = document.getElementById('profile-post-count');
    const followerCountEl = document.getElementById('profile-follower-count');
    const postKpiEl = document.getElementById('profile-kpi-posts');
    const followerKpiEl = document.getElementById('profile-kpi-followers');
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
    const followerTabEl = document.getElementById('profile-tab-followers');
    const manageTabEl = document.getElementById('profile-tab-manage');
    const blogPanelEl = document.getElementById('profile-panel-blog');
    const followerPanelEl = document.getElementById('profile-panel-followers');
    const managePanelEl = document.getElementById('profile-panel-manage');
    const blogListEl = document.getElementById('profile-blog-list');
    const followerListEl = document.getElementById('profile-follower-list');
    const formEl = document.getElementById('profile-form');
    const passwordFormEl = document.getElementById('profile-password-form');
    const readonlyEl = document.getElementById('profile-readonly');
    const displayInput = document.getElementById('profile-display-input');
    const avatarUrlInput = document.getElementById('profile-avatar-url');
    const avatarFileInput = document.getElementById('profile-avatar-file');
    const previewAvatar = document.getElementById('profile-preview-avatar');
    const previewLabel = document.getElementById('profile-preview-label');
    const statusEl = document.getElementById('profile-status');
    const currentPasswordInput = document.getElementById('profile-current-password');
    const newPasswordInput = document.getElementById('profile-new-password');
    const confirmPasswordInput = document.getElementById('profile-confirm-password');
    const passwordStatusEl = document.getElementById('profile-password-status');
    const clearAvatarBtn = document.getElementById('profile-clear-avatar');

    if (!avatarEl || !nameEl || !nicknameEl || !roleEl || !joinedAtEl || !lastActiveEl
        || !emailRowEl || !emailEl || !postCountEl || !followerCountEl || !postKpiEl || !followerKpiEl
        || !messageActionsEl || !writeLinkEl || !followBtnEl || !followLoginEl || !messageLinkEl
        || !panelHeadEl || !panelTitleEl || !headlineEl || !spaceTitleEl || !spaceNoteEl
        || !tabsEl || !blogTabEl || !followerTabEl || !manageTabEl || !blogPanelEl || !followerPanelEl || !managePanelEl
        || !blogListEl || !followerListEl || !formEl || !passwordFormEl || !readonlyEl
        || !displayInput || !avatarUrlInput || !avatarFileInput || !previewAvatar || !previewLabel
        || !statusEl || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput
        || !passwordStatusEl || !clearAvatarBtn) {
        return;
    }

    let accessToken = '';
    let me = null;
    let space = null;
    let profile = null;
    let isSelf = false;
    let followInFlight = false;
    let activeTab = 'blog';
    let previewAvatarObjectUrl = '';

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
    const isUuidLike = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(String(value || '').trim());
    const isPositiveIntegerLike = (value) => /^[1-9]\d*$/.test(String(value || '').trim());

    const setStatusMessage = (targetEl, text, type) => {
        targetEl.textContent = text || '';
        targetEl.className = 'sv-profile-status small';
        if (type === 'error') targetEl.classList.add('text-danger');
        if (type === 'success') targetEl.classList.add('text-success');
    };
    const setStatus = (text, type) => {
        setStatusMessage(statusEl, text, type);
    };
    const setPasswordStatus = (text, type) => {
        setStatusMessage(passwordStatusEl, text, type);
    };

    const setSpaceNote = (text) => {
        spaceNoteEl.textContent = text || '';
    };

    const formatSize = (value) => {
        const bytes = Number(value);
        if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
        if (bytes < 1024) return `${Math.round(bytes)} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const imageExtForMime = (mimeType) => {
        const mime = String(mimeType || '').toLowerCase();
        if (mime === 'image/png') return 'png';
        if (mime === 'image/webp') return 'webp';
        if (mime === 'image/gif') return 'gif';
        return 'jpg';
    };

    const revokePreviewAvatarObjectUrl = () => {
        if (!previewAvatarObjectUrl) {
            return;
        }
        URL.revokeObjectURL(previewAvatarObjectUrl);
        previewAvatarObjectUrl = '';
    };

    const resolveAccessToken = async () => {
        if (window.SVPAuth?.getValidAccessToken) {
            accessToken = await window.SVPAuth.getValidAccessToken();
        } else if (!accessToken) {
            accessToken = String(window.localStorage?.getItem('accessToken') || '').trim();
        }
        return accessToken;
    };

    const clearPasswordForm = () => {
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
    };

    const loadImageFromFile = (file) => new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Không đọc được ảnh avatar.'));
        };
        image.src = objectUrl;
    });

    const canvasToBlob = (canvas, mimeType, quality) => new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });

    const compressAvatarFile = async (file, maxBytes) => {
        if (!(file instanceof File)) {
            throw new Error('File avatar không hợp lệ.');
        }
        const image = await loadImageFromFile(file);
        const sourceWidth = image.naturalWidth || image.width;
        const sourceHeight = image.naturalHeight || image.height;
        if (!sourceWidth || !sourceHeight) {
            throw new Error('Không xác định được kích thước ảnh avatar.');
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Trình duyệt không hỗ trợ nén ảnh avatar.');
        }

        canvas.width = AVATAR_OUTPUT_SIZE;
        canvas.height = AVATAR_OUTPUT_SIZE;

        const cropSize = Math.min(sourceWidth, sourceHeight);
        const cropX = Math.max(0, Math.round((sourceWidth - cropSize) / 2));
        const cropY = Math.max(0, Math.round((sourceHeight - cropSize) / 2));
        const qualities = [0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36, 0.28, 0.2, 0.14, 0.1, 0.08];
        const mimeTypes = ['image/webp', 'image/jpeg'];
        let bestBlob = null;
        let bestMimeType = '';

        for (const mimeType of mimeTypes) {
            context.clearRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
            if (mimeType === 'image/jpeg') {
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
            }
            context.drawImage(
                image,
                cropX,
                cropY,
                cropSize,
                cropSize,
                0,
                0,
                AVATAR_OUTPUT_SIZE,
                AVATAR_OUTPUT_SIZE
            );

            for (const quality of qualities) {
                const blob = await canvasToBlob(canvas, mimeType, quality);
                if (!blob) {
                    continue;
                }
                if (!bestBlob || blob.size < bestBlob.size) {
                    bestBlob = blob;
                    bestMimeType = mimeType;
                }
                if (blob.size <= maxBytes) {
                    return new File(
                        [blob],
                        `avatar-${Date.now()}.${imageExtForMime(mimeType)}`,
                        { type: mimeType }
                    );
                }
            }
        }

        if (bestBlob && bestBlob.size <= maxBytes) {
            return new File(
                [bestBlob],
                `avatar-${Date.now()}.${imageExtForMime(bestMimeType)}`,
                { type: bestMimeType }
            );
        }
        throw new Error(`Không thể nén ảnh avatar xuống dưới ${formatSize(maxBytes)}.`);
    };

    const getCategoryName = (categoryId) => CATEGORY_NAMES[Number(categoryId)] || 'Chuyên mục khác';

    const buildProfileHref = (nickname, userId, authUserId) => {
        if (window.SVPAuth?.buildProfileHref) {
            return window.SVPAuth.buildProfileHref({ nickname, userId, authUserId }, 'profile.html');
        }
        const safeAuthUserId = String(authUserId || '').trim();
        const safeUserId = String(userId || '').trim();
        const safeNickname = String(nickname || '').trim();
        if (isPositiveIntegerLike(safeAuthUserId)) return `profile.html?auth_user_id=${encodeURIComponent(safeAuthUserId)}`;
        if (isUuidLike(safeUserId)) return `profile.html?user_id=${encodeURIComponent(safeUserId)}`;
        if (safeNickname) return `profile.html?nickname=${encodeURIComponent(safeNickname)}`;
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
    const ARTICLE_EDITOR_HREF = 'create_new_article.html';
    const BLOG_EDITOR_HREF = 'create_new_article.html?mode=blog';

    const setActiveTab = (tabName) => {
        const nextTab = tabName === 'followers'
            ? 'followers'
            : (tabName === 'manage' && isSelf ? 'manage' : 'blog');
        activeTab = nextTab;
        const onBlog = nextTab === 'blog';
        const onFollowers = nextTab === 'followers';
        const onManage = nextTab === 'manage' && isSelf;

        blogTabEl.classList.toggle('is-active', onBlog);
        blogTabEl.setAttribute('aria-selected', onBlog ? 'true' : 'false');
        blogPanelEl.classList.toggle('d-none', !onBlog);

        followerTabEl.classList.toggle('is-active', onFollowers);
        followerTabEl.setAttribute('aria-selected', onFollowers ? 'true' : 'false');
        followerPanelEl.classList.toggle('d-none', !onFollowers);

        manageTabEl.classList.toggle('is-active', onManage);
        manageTabEl.setAttribute('aria-selected', onManage ? 'true' : 'false');
        managePanelEl.classList.toggle('d-none', !onManage);

        postKpiEl.classList.toggle('is-active', onBlog);
        followerKpiEl.classList.toggle('is-active', onFollowers);
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

    const formatDateTime = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const formatRoleLabel = (value) => {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'SUPERADMIN') return 'Super Admin';
        if (normalized === 'ADMIN') return 'Quản trị viên';
        if (normalized === 'MODERATOR') return 'Điều hành viên';
        if (normalized === 'USER') return 'Thành viên';
        return normalized || 'Thành viên';
    };

    const resolveAvatarPresentation = (displayName, avatarUrl, seed, options = {}) => {
        const safeName = String(displayName || '').trim();
        const fallbackInitial = window.SVPAvatar?.initial ? window.SVPAvatar.initial(safeName) : (safeName.charAt(0) || 'U').toUpperCase();
        const palette = window.SVPAvatar?.palette ? window.SVPAvatar.palette(seed || safeName) : { bg: '#e2e8f0', fg: '#475569' };
        const safeAvatarUrl = options.allowObjectUrl
            ? String(avatarUrl || '').trim()
            : sanitizeUrl(avatarUrl);
        return {
            text: fallbackInitial,
            bg: palette.bg,
            fg: palette.fg,
            url: safeAvatarUrl
        };
    };

    const renderAvatar = (targetEl, displayName, avatarUrl, seed, options = {}) => {
        const avatar = resolveAvatarPresentation(displayName, avatarUrl, seed, options);
        if (avatar.url) {
            targetEl.style.backgroundImage = `url('${avatar.url.replace(/'/g, "\\'")}')`;
            targetEl.style.backgroundColor = '#e2e8f0';
            targetEl.textContent = '';
            targetEl.style.color = '#fff';
        } else {
            targetEl.style.backgroundImage = '';
            targetEl.style.backgroundColor = avatar.bg;
            targetEl.textContent = avatar.text;
            targetEl.style.color = avatar.fg;
        }
    };

    const renderAvatarMarkup = (displayName, avatarUrl, seed) => {
        const avatar = resolveAvatarPresentation(displayName, avatarUrl, seed);
        if (avatar.url) {
            return `<div class="sv-profile-avatar" style="background-image:url('${escapeHtml(avatar.url)}');background-color:#e2e8f0;color:#fff;"></div>`;
        }
        return `<div class="sv-profile-avatar" style="background-color:${escapeHtml(avatar.bg)};color:${escapeHtml(avatar.fg)};">${escapeHtml(avatar.text)}</div>`;
    };

    const fetchMe = async () => {
        const token = await resolveAccessToken();
        if (!token) return null;
        const response = await fetch(`${API_BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
            return await response.json();
        }
        const storedUserId = String(window.localStorage?.getItem('userId') || '').trim();
        const storedAuthUserId = String(window.localStorage?.getItem('authUserId') || '').trim();
        const storedEmail = String(window.localStorage?.getItem('userEmail') || '').trim();
        const storedNickname = String(window.localStorage?.getItem('userNickname') || '').trim();
        const storedDisplayName = String(window.localStorage?.getItem('userDisplayName') || '').trim();
        const payload = window.SVPAuth?.parseJwtPayload
            ? window.SVPAuth.parseJwtPayload(token) || {}
            : {};
        const tokenUserId = window.SVPAuth?.resolvePublicUserId
            ? window.SVPAuth.resolvePublicUserId(storedUserId, payload.userId, payload.publicUserId)
            : (isUuidLike(storedUserId) ? storedUserId : (isUuidLike(payload.userId) ? payload.userId : null));
        const tokenAuthUserId = window.SVPAuth?.resolveAuthUserId
            ? window.SVPAuth.resolveAuthUserId(storedAuthUserId, payload.authUserId, payload.sub)
            : String(storedAuthUserId || payload.authUserId || payload.sub || '').trim();
        return {
            userId: tokenUserId,
            authUserId: tokenAuthUserId,
            email: payload.email || storedEmail || '',
            nickname: payload.nickname || storedNickname || '',
            displayName: payload.displayName || storedDisplayName || ''
        };
    };

    const fetchUserSpace = async (authUserId, nickname, userId) => {
        const params = new URLSearchParams();
        if (authUserId) {
            params.set('authUserId', authUserId);
        } else if (nickname) {
            params.set('nickname', nickname);
        } else if (userId) {
            params.set('userId', userId);
        }
        params.set('limit', String(PROFILE_LIST_LIMIT));
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
        if (!String(file.type || '').toLowerCase().startsWith('image/')) {
            throw new Error('Chỉ hỗ trợ file ảnh làm avatar.');
        }
        if (file.size > AVATAR_SELECTION_MAX_BYTES) {
            throw new Error(`Avatar vượt quá ${formatSize(AVATAR_SELECTION_MAX_BYTES)}.`);
        }
        const token = await resolveAccessToken();
        if (!token) {
            throw new Error('Bạn cần đăng nhập để cập nhật hồ sơ.');
        }
        setStatus(
            `Đang nén avatar về ${AVATAR_OUTPUT_SIZE}x${AVATAR_OUTPUT_SIZE} dưới ${formatSize(AVATAR_UPLOAD_MAX_BYTES)}...`,
            ''
        );
        const uploadFile = await compressAvatarFile(file, AVATAR_UPLOAD_MAX_BYTES);
        setStatus(
            `Avatar đã nén còn ${formatSize(uploadFile.size)} ở ${AVATAR_OUTPUT_SIZE}x${AVATAR_OUTPUT_SIZE}. Đang chuẩn bị upload...`,
            ''
        );
        const presignResponse = await fetch(`${API_BASE_URL}/api/upload/post-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                filename: `avatar-${Date.now()}.${imageExtForMime(uploadFile.type || file.type)}`,
                contentType: uploadFile.type || file.type || 'image/jpeg'
            })
        });
        const presignPayload = await presignResponse.json().catch(() => ({}));
        if (!presignResponse.ok) {
            throw new Error(presignPayload.error || 'Không thể tạo link upload.');
        }
        if (!presignPayload.uploadUrl || !presignPayload.publicUrl) {
            throw new Error('Thiếu thông tin upload avatar từ máy chủ.');
        }
        setStatus(`Đang upload avatar (${formatSize(uploadFile.size)})...`, '');
        const uploadResponse = await fetch(presignPayload.uploadUrl, {
            method: presignPayload.method || 'PUT',
            headers: { 'Content-Type': presignPayload.contentType || uploadFile.type || file.type || 'image/jpeg' },
            body: uploadFile
        });
        if (!uploadResponse.ok) {
            throw new Error(`Upload avatar thất bại (${uploadResponse.status}).`);
        }
        return presignPayload.publicUrl || '';
    };

    const updateProfile = async (displayName, avatarUrl) => {
        const token = await resolveAccessToken();
        if (!token) throw new Error('Bạn cần đăng nhập để cập nhật hồ sơ.');
        const response = await fetch(`${API_BASE_URL}/me/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
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
        const token = await resolveAccessToken();
        if (!token) throw new Error('Bạn cần đăng nhập để theo dõi.');
        if (!profile?.userId) throw new Error('Không xác định được thành viên cần theo dõi.');
        const response = await fetch(`${API_BASE_URL}/users/follows`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
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

    const changePassword = async (currentPassword, newPassword) => {
        const token = await resolveAccessToken();
        if (!token) throw new Error('Bạn cần đăng nhập để đổi mật khẩu.');
        const response = await fetch(`${API_BASE_URL}/me/password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || 'Không thể đổi mật khẩu.');
        }
        return payload;
    };

    const renderBlogList = () => {
        const posts = Array.isArray(space?.posts)
            ? space.posts
            : (Array.isArray(space?.articles) ? space.articles : []);
        const totalPosts = Number(space?.stats?.postCount ?? space?.stats?.blogCount ?? posts.length ?? 0);
        const hiddenCount = Math.max(0, totalPosts - posts.length);
        if (posts.length === 0) {
            const cta = isSelf
                ? `<a class="btn btn-primary mt-3" href="${ARTICLE_EDITOR_HREF}">Tạo bài viết đầu tiên</a>`
                : '';
            blogListEl.innerHTML = `<div class="sv-profile-empty">Chưa có bài viết nào được xuất bản.${cta}</div>`;
            return;
        }

        const note = hiddenCount > 0
            ? `<div class="sv-profile-list-note">Hiển thị ${posts.length.toLocaleString('vi-VN')} bài viết mới nhất trên trang này.</div>`
            : '';

        blogListEl.innerHTML = note + posts.map((item) => {
            const detailHref = buildArticleHref(item.postId, item.title);
            const coverUrl = sanitizeUrl(item.coverImageUrl);
            const coverNode = coverUrl
                ? `<a class="sv-profile-blog-cover" href="${detailHref}" style="background-image:url('${escapeHtml(coverUrl)}')"></a>`
                : '';
            const isBlogPost = Boolean(item.isBlog ?? item.is_blog ?? true);
            const typeLabel = isBlogPost ? 'Blog' : 'Bài viết';
            const typeIcon = isBlogPost ? 'fa-solid fa-feather-pointed' : 'fa-regular fa-newspaper';
            return `
                <article class="sv-profile-blog-card">
                    ${coverNode}
                    <div class="sv-profile-blog-body">
                        <div class="sv-profile-blog-top">
                            <span class="sv-pill"><i class="${typeIcon}"></i>${typeLabel}</span>
                            <span class="sv-pill"><i class="fa-regular fa-folder-open"></i>${escapeHtml(getCategoryName(item.categoryId))}</span>
                            <span class="sv-meta">${escapeHtml(formatDate(item.createdAt))}</span>
                        </div>
                        <div class="sv-profile-blog-title">
                            <a href="${detailHref}">${escapeHtml(item.title || 'Bài viết mới')}</a>
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

    const renderFollowerList = () => {
        const followers = Array.isArray(space?.followers) ? space.followers : [];
        const totalFollowers = Number(space?.stats?.followerCount ?? followers.length ?? 0);
        const hiddenCount = Math.max(0, totalFollowers - followers.length);
        if (followers.length === 0) {
            followerListEl.innerHTML = '<div class="sv-profile-empty">Chưa có người theo dõi nào.</div>';
            return;
        }

        const note = hiddenCount > 0
            ? `<div class="sv-profile-list-note">Hiển thị ${followers.length.toLocaleString('vi-VN')} người theo dõi mới nhất trên trang này.</div>`
            : '';

        followerListEl.innerHTML = note + followers.map((item) => {
            const displayName = item.displayName || item.nickname || 'Thành viên';
            const profileHref = buildProfileHref(item.nickname, item.userId, item.authUserId);
            const avatarMarkup = renderAvatarMarkup(displayName, item.avatarUrl, item.nickname || item.authUserId || item.userId);
            return `
                <article class="sv-profile-follower-card">
                    ${avatarMarkup}
                    <div class="sv-profile-follower-main">
                        <a class="sv-profile-follower-name" href="${profileHref}">${escapeHtml(displayName)}</a>
                        <div class="sv-profile-follower-meta">
                            <span>${escapeHtml(formatRoleLabel(item.role))}</span>
                            <span>Theo dõi từ ${escapeHtml(formatDate(item.followedAt))}</span>
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
        revokePreviewAvatarObjectUrl();
        const displayName = profile.displayName || profile.nickname || 'Thành viên';
        nameEl.textContent = displayName;
        nicknameEl.textContent = '';
        nicknameEl.classList.add('d-none');
        roleEl.textContent = formatRoleLabel(profile.role);
        joinedAtEl.textContent = formatDate(profile.createdAt);
        lastActiveEl.textContent = profile.lastActiveAt ? formatDateTime(profile.lastActiveAt) : 'Chưa có dữ liệu';
        postCountEl.textContent = Number(space?.stats?.postCount ?? space?.stats?.blogCount ?? 0).toLocaleString('vi-VN');
        followerCountEl.textContent = Number(space?.stats?.followerCount || 0).toLocaleString('vi-VN');
        emailEl.textContent = isSelf && me?.email ? me.email : '';
        emailRowEl.classList.toggle('d-none', !(isSelf && me?.email));
        panelHeadEl.classList.add('d-none');
        headlineEl.classList.add('d-none');
        panelTitleEl.textContent = '';
        spaceTitleEl.textContent = '';
        setSpaceNote('');
        document.title = `${displayName} - Espace SVP`;

        renderAvatar(avatarEl, displayName, profile.avatarUrl, profile.nickname || profile.authUserId || profile.userId);
        renderAvatar(previewAvatar, displayName, profile.avatarUrl, profile.nickname || profile.authUserId || profile.userId);
        displayInput.value = displayName;
        avatarUrlInput.value = profile.avatarUrl || '';
        avatarFileInput.value = '';
        previewLabel.textContent = 'Chưa có thay đổi';
        clearPasswordForm();
        setPasswordStatus('', '');

        if (isSelf) {
            window.localStorage?.setItem('userDisplayName', displayName);
            if (profile.authUserId) {
                window.localStorage?.setItem('authUserId', String(profile.authUserId));
            }
            if (profile.avatarUrl) {
                window.localStorage?.setItem('userAvatarUrl', profile.avatarUrl);
            } else {
                window.localStorage?.removeItem('userAvatarUrl');
            }
        }

        tabsEl.classList.remove('d-none');
        manageTabEl.classList.toggle('d-none', !isSelf);
        if (!isSelf && activeTab === 'manage') {
            activeTab = 'blog';
        }
        setActiveTab(activeTab);
        renderActions();
        renderBlogList();
        renderFollowerList();
    };

    const updatePreview = () => {
        const displayName = displayInput.value.trim() || profile?.displayName || profile?.nickname || 'Thành viên';
        const avatarFile = avatarFileInput.files && avatarFileInput.files[0] ? avatarFileInput.files[0] : null;
        if (avatarFile) {
            revokePreviewAvatarObjectUrl();
            previewAvatarObjectUrl = URL.createObjectURL(avatarFile);
            renderAvatar(
                previewAvatar,
                displayName,
                previewAvatarObjectUrl,
                profile?.nickname || profile?.authUserId || profile?.userId,
                { allowObjectUrl: true }
            );
            previewLabel.textContent = `Đã chọn: ${avatarFile.name} (${formatSize(avatarFile.size)}). Ảnh sẽ được crop về ${AVATAR_OUTPUT_SIZE}x${AVATAR_OUTPUT_SIZE} và nén xuống dưới ${formatSize(AVATAR_UPLOAD_MAX_BYTES)} trước khi upload.`;
            return;
        }
        revokePreviewAvatarObjectUrl();
        const avatarUrl = sanitizeUrl(avatarUrlInput.value.trim());
        renderAvatar(previewAvatar, displayName, avatarUrl, profile?.nickname || profile?.authUserId || profile?.userId);
        previewLabel.textContent = avatarUrl ? 'Sẽ dùng URL ảnh mới.' : 'Ảnh đại diện sẽ theo chữ cái và màu mặc định.';
    };

    const setEditable = (editable) => {
        formEl.classList.toggle('d-none', !editable);
        passwordFormEl.classList.toggle('d-none', !editable);
        readonlyEl.classList.toggle('d-none', editable);
        manageTabEl.classList.toggle('d-none', !editable);
        if (!editable && activeTab === 'manage') {
            setActiveTab('blog');
        }
    };

    const init = async () => {
        const params = new URLSearchParams(window.location.search);
        let authUserId = params.get('auth_user_id') || params.get('authUserId');
        let nickname = params.get('nickname');
        let userId = params.get('user_id') || params.get('userId');

        try {
            me = await fetchMe();
        } catch (error) {
            console.warn('Cannot resolve current session for profile page.', error);
            me = null;
        }

        if (!authUserId && !nickname && !userId && isPositiveIntegerLike(me?.authUserId)) {
            authUserId = me.authUserId;
            window.history.replaceState({}, '', buildProfileHref(me?.nickname, me?.userId, authUserId));
        } else if (!authUserId && !nickname && !userId && isUuidLike(me?.userId)) {
            userId = me.userId;
            window.history.replaceState({}, '', buildProfileHref(me?.nickname, userId, me?.authUserId));
        } else if (!authUserId && !nickname && !userId && me?.nickname) {
            nickname = me.nickname;
            window.history.replaceState({}, '', buildProfileHref(nickname, me?.userId, me?.authUserId));
        }

        if (!authUserId && !nickname && !userId) {
            setStatus('Thiếu thông tin thành viên.', 'error');
            setSpaceNote('Hãy mở link profile của một thành viên hoặc đăng nhập để vào espace của bạn.');
            setEditable(false);
            blogListEl.innerHTML = '<div class="sv-profile-empty">Không có espace nào để hiển thị.</div>';
            followerListEl.innerHTML = '<div class="sv-profile-empty">Không có danh sách người theo dõi để hiển thị.</div>';
            return;
        }

        try {
            space = await fetchUserSpace(authUserId, nickname, userId);
        } catch (error) {
            setStatus(error.message || 'Không thể tải espace.', 'error');
            setSpaceNote('Không thể tải espace thành viên vào lúc này.');
            setEditable(false);
            blogListEl.innerHTML = '<div class="sv-profile-empty">Không thể tải danh sách bài viết.</div>';
            followerListEl.innerHTML = '<div class="sv-profile-empty">Không thể tải danh sách người theo dõi.</div>';
            return;
        }

        profile = space && typeof space.profile === 'object' ? space.profile : null;
        isSelf = Boolean(space?.viewer?.self);
        if (profile?.authUserId || profile?.userId || profile?.nickname) {
            window.history.replaceState({}, '', buildProfileHref(profile.nickname, profile.userId, profile.authUserId));
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
    followerTabEl.addEventListener('click', () => {
        setActiveTab('followers');
    });
    manageTabEl.addEventListener('click', () => {
        if (!isSelf) return;
        setActiveTab('manage');
    });
    postKpiEl.addEventListener('click', () => {
        setActiveTab('blog');
    });
    followerKpiEl.addEventListener('click', () => {
        setActiveTab('followers');
    });
    avatarFileInput.addEventListener('change', () => {
        const file = avatarFileInput.files && avatarFileInput.files[0] ? avatarFileInput.files[0] : null;
        if (file && file.size > AVATAR_SELECTION_MAX_BYTES) {
            avatarFileInput.value = '';
            revokePreviewAvatarObjectUrl();
            setStatus(`Avatar vượt quá ${formatSize(AVATAR_SELECTION_MAX_BYTES)}.`, 'error');
            updatePreview();
            return;
        }
        updatePreview();
    });
    clearAvatarBtn.addEventListener('click', () => {
        revokePreviewAvatarObjectUrl();
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
                avatarFileInput.value = '';
                revokePreviewAvatarObjectUrl();
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
    passwordFormEl.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isSelf) return;

        const currentPassword = currentPasswordInput.value || '';
        const newPassword = newPasswordInput.value || '';
        const confirmPassword = confirmPasswordInput.value || '';

        if (!newPassword.trim()) {
            setPasswordStatus('Mật khẩu mới không được để trống.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordStatus('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordStatus('Mật khẩu xác nhận không khớp.', 'error');
            return;
        }

        setPasswordStatus('Đang cập nhật mật khẩu...', '');
        try {
            const payload = await changePassword(currentPassword, newPassword);
            clearPasswordForm();
            setPasswordStatus(
                payload && payload.passwordCreated
                    ? 'Đã tạo mật khẩu mới cho tài khoản.'
                    : 'Đã đổi mật khẩu.',
                'success'
            );
        } catch (error) {
            setPasswordStatus(error.message || 'Không thể đổi mật khẩu.', 'error');
        }
    });

    init().catch((error) => {
        console.error('Cannot initialize profile page.', error);
        setStatus('Không thể tải hồ sơ thành viên.', 'error');
        setSpaceNote('Không thể tải espace thành viên vào lúc này.');
        setEditable(false);
        blogListEl.innerHTML = '<div class="sv-profile-empty">Không thể tải danh sách bài viết.</div>';
        followerListEl.innerHTML = '<div class="sv-profile-empty">Không thể tải danh sách người theo dõi.</div>';
    });

    if (typeof window.addEventListener === 'function') {
        window.addEventListener('beforeunload', () => {
            revokePreviewAvatarObjectUrl();
        });
    }
})();
