(function () {
    const shared = window.SVPHousing;
    const commentEditorApi = window.SVPCommentEditor || null;
    const richContent = window.SVPRichContent || null;
    const seo = window.SVPSeo || null;
    if (!shared) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const listingId = (params.get('listingId') || '').trim();

    const feedbackEl = document.getElementById('housing-detail-feedback');
    const breadcrumbEl = document.getElementById('housing-detail-breadcrumb');
    const titleEl = document.getElementById('housing-detail-title');
    const statusWrapEl = document.getElementById('housing-detail-status-wrap');
    const metaEl = document.getElementById('housing-detail-meta');
    const priceEl = document.getElementById('housing-detail-price');
    const actionsEl = document.getElementById('housing-detail-actions');
    const shareSectionEl = document.getElementById('housing-detail-share');
    const shareFbEl = document.getElementById('housing-detail-share-fb');
    const shareMessengerEl = document.getElementById('housing-detail-share-messenger');
    const shareCopyBtn = document.getElementById('housing-detail-share-copy');
    const tagsEl = document.getElementById('housing-detail-tags');
    const galleryEl = document.getElementById('housing-detail-gallery');
    const descriptionEl = document.getElementById('housing-detail-description');
    const transitEl = document.getElementById('housing-detail-transit');
    const contactEl = document.getElementById('housing-detail-contact');
    const ownerEl = document.getElementById('housing-detail-owner');
    const mapEl = document.getElementById('housing-detail-map');
    const commentsListEl = document.getElementById('housing-comments-list');
    const commentBadgeEl = document.getElementById('housing-comment-badge');
    const replyBoxEl = document.getElementById('housing-reply-box');
    const replyForm = document.getElementById('housing-reply-form');
    const replyGuestFieldsEl = document.getElementById('housing-reply-guest-fields');
    const replySessionHintEl = document.getElementById('housing-reply-session-hint');
    const replyNameEl = document.getElementById('housing-reply-name');
    const replyCaptchaQuestionEl = document.getElementById('housing-reply-captcha-q');
    const replyCaptchaAnswerEl = document.getElementById('housing-reply-captcha-a');
    const replyMessageEl = document.getElementById('housing-reply-message');
    const replyCharCountEl = document.getElementById('housing-reply-char-count');
    const replyFeedbackEl = document.getElementById('housing-reply-feedback');
    const replySubmitBtn = document.getElementById('housing-reply-submit');
    const replyClearBtn = document.getElementById('housing-reply-clear');
    const commentEditModalEl = document.getElementById('housing-comment-edit-modal');
    const commentEditMessageEl = document.getElementById('housing-comment-edit-message');
    const commentEditFeedbackEl = document.getElementById('housing-comment-edit-feedback');
    const commentEditSaveBtn = document.getElementById('housing-comment-edit-save');

    if (!listingId
        || !feedbackEl
        || !breadcrumbEl
        || !titleEl
        || !statusWrapEl
        || !metaEl
        || !priceEl
        || !actionsEl
        || !shareSectionEl
        || !tagsEl
        || !galleryEl
        || !descriptionEl
        || !transitEl
        || !contactEl
        || !ownerEl
        || !mapEl
        || !commentsListEl
        || !commentBadgeEl
        || !replyBoxEl
        || !replyForm
        || !replyGuestFieldsEl
        || !replySessionHintEl
        || !replyNameEl
        || !replyCaptchaQuestionEl
        || !replyCaptchaAnswerEl
        || !replyMessageEl
        || !replyCharCountEl
        || !replyFeedbackEl
        || !replySubmitBtn
        || !replyClearBtn
        || !commentEditModalEl
        || !commentEditMessageEl
        || !commentEditFeedbackEl
        || !commentEditSaveBtn) {
        return;
    }

    const API_BASE_URL = shared.API_BASE_URL;
    const MAX_COMMENT_TEXT_LENGTH = 2000;
    const escapeHtml = shared.escapeHtml;
    const richContentSanitizeOptions = {
        allowedTags: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
            'h2', 'h3', 'a', 'div', 'span', 'img', 'figure', 'figcaption', 'iframe'
        ],
        allowGoogleDriveEmbeds: true
    };

    let currentCanonicalUrl = shared.buildHousingCanonicalUrl(listingId);
    let currentShareUrl = shared.buildHousingShareUrl(listingId, '');
    let facebookAppIdPromise = null;
    let currentDetail = null;
    let currentComments = [];
    let replyCaptchaAnswer = null;
    let replyComposer = null;
    let commentEditComposer = null;
    let commentEditModal = null;
    let editingCommentId = 0;

    const map = window.L.map(mapEl, { scrollWheelZoom: false }).setView([48.8566, 2.3522], 13);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    const marker = window.L.marker([48.8566, 2.3522]).addTo(map);

    const decodeBase64Url = (value) => {
        if (!value) return '';
        let base = String(value).replace(/-/g, '+').replace(/_/g, '/');
        const pad = base.length % 4;
        if (pad) base += '='.repeat(4 - pad);
        return base;
    };

    const parseJwtPayload = (token) => {
        if (!token || String(token).split('.').length !== 3) return null;
        try {
            return JSON.parse(atob(decodeBase64Url(String(token).split('.')[1])));
        } catch (_) {
            return null;
        }
    };

    const getCallerInfo = () => {
        const token = String(localStorage.getItem('accessToken') || '').trim();
        const payload = parseJwtPayload(token) || {};
        const resolvedUserId = window.SVPAuth && typeof window.SVPAuth.resolvePublicUserId === 'function'
            ? window.SVPAuth.resolvePublicUserId(localStorage.getItem('userId'), payload.userId, payload.publicUserId)
            : String(localStorage.getItem('userId') || payload.userId || payload.publicUserId || '').trim();
        return {
            userId: String(resolvedUserId || '').trim(),
            nickname: String(payload.nickname || localStorage.getItem('userNickname') || '').trim(),
            role: String(payload.role || '').trim().toUpperCase()
        };
    };

    const avatarPalette = (seed) => {
        const value = String(seed || 'svp');
        let hash = 0;
        for (let index = 0; index < value.length; index += 1) {
            hash = ((hash << 5) - hash) + value.charCodeAt(index);
            hash |= 0;
        }
        const hue = Math.abs(hash) % 360;
        return {
            bg: `hsl(${hue} 62% 93%)`,
            fg: `hsl(${hue} 44% 26%)`
        };
    };

    const getInitial = (value) => String(value || '?').trim().charAt(0).toUpperCase() || '?';

    const htmlToPlainText = (value) => {
        if (commentEditorApi && typeof commentEditorApi.htmlToPlainText === 'function') {
            return commentEditorApi.htmlToPlainText(value);
        }
        if (richContent && typeof richContent.htmlToPlainText === 'function') {
            return richContent.htmlToPlainText(value);
        }
        const template = document.createElement('template');
        template.innerHTML = String(value || '');
        return String(template.content.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const textToCommentHtml = (value) => {
        if (commentEditorApi && typeof commentEditorApi.textToParagraphsHtml === 'function') {
            return commentEditorApi.textToParagraphsHtml(value);
        }
        return String(value || '')
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => `<p>${escapeHtml(line)}</p>`)
            .join('');
    };

    const sanitizeCommentHtml = (value) => {
        if (commentEditorApi && typeof commentEditorApi.sanitizeHtml === 'function') {
            return commentEditorApi.sanitizeHtml(value);
        }
        return textToCommentHtml(value);
    };

    const hasRenderableCommentContent = (value) => {
        if (commentEditorApi && typeof commentEditorApi.hasRenderableContent === 'function') {
            return commentEditorApi.hasRenderableContent(value);
        }
        return Boolean(htmlToPlainText(value));
    };

    const formatDate = (iso) => {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    };

    const timeAgo = (iso) => {
        const parsed = Date.parse(String(iso || ''));
        if (!parsed) return '';
        const diffMinutes = Math.max(0, Math.floor((Date.now() - parsed) / 60000));
        if (diffMinutes < 1) return 'Vừa xong';
        if (diffMinutes < 60) return `${diffMinutes} phút trước`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        return `${Math.floor(diffHours / 24)} ngày trước`;
    };

    const formatViewCountLabel = (value) => `${(Number.isFinite(Number(value)) ? Number(value) : 0).toLocaleString('vi-VN')} lượt xem`;

    const setFeedback = (element, message, type = 'info') => {
        element.textContent = message || '';
        element.style.color = type === 'error' ? '#b91c1c' : type === 'success' ? '#15803d' : '#64748b';
    };

    const setPageFeedback = (message, type = 'info') => {
        if (!message) {
            feedbackEl.hidden = true;
            feedbackEl.textContent = '';
            feedbackEl.style.color = '';
            return;
        }
        feedbackEl.hidden = false;
        setFeedback(feedbackEl, message, type);
    };

    const normalizeComment = (item) => {
        const author = item && item.author ? item.author : {};
        const contentHtml = sanitizeCommentHtml(item?.contentHtml || item?.content_html || '') || '<p>Nội dung đang được cập nhật.</p>';
        return {
            commentId: Number(item?.commentId || item?.id || 0),
            listingId: String(item?.listingId || item?.listing_id || listingId),
            userId: String(item?.userId || item?.user_id || ''),
            contentHtml,
            contentText: htmlToPlainText(contentHtml),
            createdAt: String(item?.createdAt || item?.created_at || ''),
            modifiedAt: String(item?.modifiedAt || item?.modified_at || ''),
            hidden: Boolean(item?.hidden),
            authorUserId: String(author.userId || author.user_id || ''),
            authorNickname: String(author.nickname || ''),
            authorAuthUserId: String(author.authUserId || author.auth_user_id || ''),
            authorDisplayName: String(author.displayName || author.display_name || author.nickname || 'Ẩn danh'),
            authorAvatarUrl: String(author.avatarUrl || author.avatar_url || '')
        };
    };

    const peekAuthenticatedReplyIdentity = () => {
        const accessToken = String(localStorage.getItem('accessToken') || '').trim();
        const refreshToken = String(localStorage.getItem('refreshToken') || '').trim();
        if (!accessToken && !refreshToken) {
            return { isAuthenticated: false, label: '' };
        }
        const payload = parseJwtPayload(accessToken) || {};
        const displayName = String(
            localStorage.getItem('userDisplayName')
            || payload.displayName
            || localStorage.getItem('userNickname')
            || payload.nickname
            || ''
        ).trim();
        const email = String(localStorage.getItem('userEmail') || payload.email || '').trim();
        return {
            isAuthenticated: true,
            label: displayName || email || 'tài khoản hiện tại'
        };
    };

    const generateReplyCaptcha = () => {
        const left = Math.floor(Math.random() * 9) + 1;
        const right = Math.floor(Math.random() * 9) + 1;
        replyCaptchaAnswer = left + right;
        replyCaptchaQuestionEl.textContent = `${left} + ${right} = ?`;
        replyCaptchaAnswerEl.value = '';
    };

    const syncReplyIdentityUi = () => {
        const identity = peekAuthenticatedReplyIdentity();
        if (identity.isAuthenticated) {
            replyGuestFieldsEl.classList.add('d-none');
            replyNameEl.required = false;
            replyNameEl.disabled = true;
            replyCaptchaAnswerEl.required = false;
            replyCaptchaAnswerEl.disabled = true;
            replySessionHintEl.classList.remove('d-none');
            replySessionHintEl.innerHTML = `<i class="fa-solid fa-circle-check me-1 text-success"></i>Đang bình luận với <strong>${escapeHtml(identity.label)}</strong>.`;
            return identity;
        }
        replyGuestFieldsEl.classList.remove('d-none');
        replyNameEl.required = true;
        replyNameEl.disabled = false;
        replyCaptchaAnswerEl.required = true;
        replyCaptchaAnswerEl.disabled = false;
        replySessionHintEl.classList.add('d-none');
        replySessionHintEl.textContent = '';
        if (replyCaptchaAnswer === null || !String(replyCaptchaQuestionEl.textContent || '').trim()) {
            generateReplyCaptcha();
        }
        return identity;
    };

    const initReplyComposer = () => {
        if (!commentEditorApi || typeof commentEditorApi.create !== 'function') {
            updateReplyCharCount();
            return Promise.resolve(null);
        }
        replyComposer = commentEditorApi.create({
            target: replyMessageEl,
            minHeight: 220,
            placeholder: replyMessageEl.getAttribute('placeholder') || '',
            onChange: () => {
                updateReplyCharCount();
                setFeedback(replyFeedbackEl, '', 'info');
            }
        });
        return replyComposer ? replyComposer.whenReady : Promise.resolve(null);
    };

    const ensureCommentEditComposer = async () => {
        if (!commentEditorApi || typeof commentEditorApi.create !== 'function') return null;
        if (!commentEditComposer) {
            commentEditComposer = commentEditorApi.create({
                target: commentEditMessageEl,
                minHeight: 260,
                placeholder: '',
                onChange: () => setFeedback(commentEditFeedbackEl, '', 'info')
            });
        }
        if (commentEditComposer) await commentEditComposer.whenReady;
        return commentEditComposer;
    };

    const focusReplyComposer = () => {
        if (replyComposer && replyComposer.isReady()) {
            replyComposer.focus();
            return;
        }
        replyMessageEl.focus();
    };

    const getReplySubmissionHtml = () => replyComposer && replyComposer.isReady()
        ? sanitizeCommentHtml(replyComposer.getSubmissionHtml())
        : textToCommentHtml(replyMessageEl.value || '');

    const getReplyPlainText = () => replyComposer && replyComposer.isReady()
        ? replyComposer.getText()
        : String(replyMessageEl.value || '').trim();

    const clearReplyComposer = () => {
        if (replyComposer && replyComposer.isReady()) {
            replyComposer.clear();
        } else {
            replyMessageEl.value = '';
        }
        updateReplyCharCount();
    };

    const updateReplyCharCount = () => {
        const count = replyComposer && replyComposer.isReady()
            ? replyComposer.getTextLength()
            : String(replyMessageEl.value || '').length;
        replyCharCountEl.textContent = `${count}/${MAX_COMMENT_TEXT_LENGTH} ký tự`;
    };

    const insertReplyMention = (authorName) => {
        const author = String(authorName || '').trim();
        if (!author) return;
        const mentionHtml = `<p>@${escapeHtml(author)}</p><p></p>`;
        if (replyComposer && replyComposer.isReady()) {
            replyComposer.insertHtml(mentionHtml, `@${author} `);
        } else {
            const prefix = `@${author} `;
            if (!String(replyMessageEl.value || '').startsWith(prefix)) {
                replyMessageEl.value = `${prefix}${replyMessageEl.value || ''}`;
            }
            updateReplyCharCount();
        }
    };

    const insertReplyQuote = (authorName, quoteText) => {
        const lines = String(quoteText || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (!lines.length) return;
        const headerHtml = authorName ? `<p><strong>${escapeHtml(authorName)} đã viết:</strong></p>` : '';
        const bodyHtml = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
        const quoteHtml = `<blockquote>${headerHtml}${bodyHtml}</blockquote><p></p>`;
        if (replyComposer && replyComposer.isReady()) {
            replyComposer.insertHtml(quoteHtml, `> ${lines.join(' ')}\n`);
        } else {
            replyMessageEl.value = `> ${lines.join(' ')}\n${replyMessageEl.value || ''}`.trim();
            updateReplyCharCount();
        }
    };

    const loadFacebookAppId = async () => {
        if (facebookAppIdPromise) return facebookAppIdPromise;
        facebookAppIdPromise = shared.fetchJson(`${API_BASE_URL}/auth/providers`, {
            headers: { Accept: 'application/json' }
        }).then((providers) => String(providers?.facebook?.appId || '').trim()).catch(() => '');
        return facebookAppIdPromise;
    };

    const buildMessengerShareUrl = async () => {
        const encodedShareUrl = encodeURIComponent(currentShareUrl);
        const appId = await loadFacebookAppId();
        if (!appId) return `fb-messenger://share/?link=${encodedShareUrl}`;
        return `https://www.facebook.com/dialog/send?app_id=${encodeURIComponent(appId)}&link=${encodedShareUrl}&redirect_uri=${encodeURIComponent(currentCanonicalUrl)}`;
    };

    const extractShareImageUrl = (payload) => {
        return String(payload?.imageUrl || '/assets/icons/og_housing_map.png').trim();
    };

    const normalizeHttpUrl = (value) => {
        if (richContent && typeof richContent.normalizeHttpUrl === 'function') {
            return richContent.normalizeHttpUrl(value);
        }
        const raw = String(value || '').trim();
        if (!raw) return '';
        try {
            const parsed = new URL(raw, window.location.href);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return '';
            }
            return parsed.href;
        } catch (_) {
            return '';
        }
    };

    const normalizeSafeHref = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (raw.startsWith('mailto:')) return raw;
        return normalizeHttpUrl(raw);
    };

    const hasRenderableRichContent = (value) => {
        if (richContent && typeof richContent.hasRenderableContent === 'function') {
            return richContent.hasRenderableContent(value, richContentSanitizeOptions);
        }
        return Boolean(htmlToPlainText(value));
    };

    const sanitizeRichHtml = (value) => {
        if (richContent && typeof richContent.sanitizeHtml === 'function') {
            return richContent.sanitizeHtml(value, richContentSanitizeOptions);
        }
        return String(value || '').trim();
    };

    const applyRichLayouts = (root) => {
        if (!root || !richContent || typeof richContent.applyImageLayouts !== 'function') {
            return;
        }
        richContent.applyImageLayouts(root);
    };

    const excerptText = (value, maxLength = 180) => {
        const text = htmlToPlainText(value);
        if (!text) return '';
        if (seo && typeof seo.excerpt === 'function') {
            return seo.excerpt(text, maxLength);
        }
        if (text.length <= maxLength) return text;
        return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
    };

    const formatAreaLabel = (value) => {
        const area = Number(value);
        if (!Number.isFinite(area) || area <= 0) return '';
        return `${area % 1 === 0 ? area.toFixed(0) : area.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m²`;
    };

    const formatLocationLabel = (city, arrondissement) => {
        const parts = [String(city || '').trim(), String(arrondissement || '').trim()].filter(Boolean);
        return parts.join(' ');
    };

    const isPositiveIntegerLike = (value) => /^[1-9]\d*$/.test(String(value || '').trim());

    const buildProfileHref = (nickname, userId, authUserId) => {
        if (window.SVPAuth?.buildProfileHref) {
            return window.SVPAuth.buildProfileHref({ nickname, userId, authUserId }, '');
        }
        const safeAuthUserId = String(authUserId || '').trim();
        const safeUserId = String(userId || '').trim();
        const safeNickname = String(nickname || '').trim();
        if (isPositiveIntegerLike(safeAuthUserId)) {
            return `profile.html?auth_user_id=${encodeURIComponent(safeAuthUserId)}`;
        }
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeUserId)) {
            return `profile.html?user_id=${encodeURIComponent(safeUserId)}`;
        }
        if (safeNickname) {
            return `profile.html?nickname=${encodeURIComponent(safeNickname)}`;
        }
        return '';
    };

    const renderEmptyState = (message) => `<div class="sv-housing-empty">${escapeHtml(message || 'Đang cập nhật.')}</div>`;

    const normalizeDetail = (payload) => {
        const images = (Array.isArray(payload?.images) ? payload.images : [])
            .map((item, index) => ({
                imageUrl: normalizeHttpUrl(item?.imageUrl || item?.image_url || ''),
                primary: Boolean(item?.primary),
                sortOrder: Number(item?.sortOrder ?? item?.sort_order ?? index)
            }))
            .filter((item) => item.imageUrl)
            .sort((left, right) => {
                if (left.primary !== right.primary) return left.primary ? -1 : 1;
                return left.sortOrder - right.sortOrder;
            });

        const transitPoints = (Array.isArray(payload?.transitPoints) ? payload.transitPoints : [])
            .map((item, index) => ({
                stationName: String(item?.stationName || item?.station_name || '').trim(),
                transportType: String(item?.transportType || item?.transport_type || '').trim(),
                transportTypeLabel: String(item?.transportTypeLabel || item?.transport_type_label || '').trim(),
                transportIcon: String(item?.transportIcon || item?.transport_icon || '').trim(),
                lineLabel: String(item?.lineLabel || item?.line_label || '').trim(),
                walkingMinutes: Number(item?.walkingMinutes ?? item?.walking_minutes ?? 0),
                primary: Boolean(item?.primary),
                sortOrder: Number(item?.sortOrder ?? item?.sort_order ?? index)
            }))
            .filter((item) => item.stationName)
            .sort((left, right) => {
                if (left.primary !== right.primary) return left.primary ? -1 : 1;
                return left.sortOrder - right.sortOrder;
            });

        return {
            id: String(payload?.id || listingId),
            title: String(payload?.title || 'Tin thuê nhà').trim() || 'Tin thuê nhà',
            status: String(payload?.status || 'AVAILABLE').trim().toUpperCase() || 'AVAILABLE',
            statusLabel: String(payload?.statusLabel || payload?.status_label || '').trim(),
            price: Number(payload?.price),
            priceLabel: String(payload?.priceLabel || payload?.price_label || shared.formatPrice(payload?.price) || 'Liên hệ').trim() || 'Liên hệ',
            city: String(payload?.city || '').trim(),
            arrondissement: String(payload?.arrondissement || '').trim(),
            areaM2: Number(payload?.areaM2 ?? payload?.area_m2 ?? 0),
            viewCount: Number(payload?.viewCount ?? payload?.view_count ?? 0),
            propertyType: String(payload?.propertyType || payload?.property_type || '').trim(),
            propertyTypeLabel: String(payload?.propertyTypeLabel || payload?.property_type_label || shared.propertyTypeLabel(payload?.propertyType) || '').trim(),
            cafEligible: Boolean(payload?.cafEligible ?? payload?.caf_eligible),
            tags: (Array.isArray(payload?.tags) ? payload.tags : []).map((item) => String(item || '').trim()).filter(Boolean),
            description: String(payload?.description ?? payload?.descriptionHtml ?? payload?.description_html ?? '').trim(),
            imageUrl: normalizeHttpUrl(payload?.imageUrl || payload?.image_url || ''),
            images,
            transitPoints,
            contact: payload?.contact || {},
            owner: payload?.owner || {},
            latitude: Number(payload?.latitude),
            longitude: Number(payload?.longitude),
            addressText: String(payload?.addressText || payload?.address_text || '').trim(),
            createdAt: String(payload?.createdAt || payload?.created_at || '').trim(),
            updatedAt: String(payload?.updatedAt || payload?.updated_at || '').trim(),
            viewerCanEdit: Boolean(payload?.viewerCanEdit ?? payload?.viewer_can_edit)
        };
    };

    const renderStatus = () => {
        const meta = shared.statusMeta(currentDetail?.status);
        const label = currentDetail?.statusLabel || meta.label;
        statusWrapEl.innerHTML = `<span class="sv-housing-badge ${escapeHtml(meta.className)}">${escapeHtml(label)}</span>`;
    };

    const renderMeta = () => {
        if (!currentDetail) {
            metaEl.innerHTML = '';
            return;
        }
        const items = [
            currentDetail.propertyTypeLabel
                ? `<span><i class="fa-solid fa-house me-1"></i>${escapeHtml(currentDetail.propertyTypeLabel)}</span>`
                : '',
            formatAreaLabel(currentDetail.areaM2)
                ? `<span><i class="fa-solid fa-ruler-combined me-1"></i>${escapeHtml(formatAreaLabel(currentDetail.areaM2))}</span>`
                : '',
            formatLocationLabel(currentDetail.city, currentDetail.arrondissement)
                ? `<span><i class="fa-solid fa-location-dot me-1"></i>${escapeHtml(formatLocationLabel(currentDetail.city, currentDetail.arrondissement))}</span>`
                : '',
            currentDetail.createdAt
                ? `<span title="${escapeHtml(formatDate(currentDetail.createdAt))}"><i class="fa-regular fa-calendar me-1"></i>${escapeHtml(timeAgo(currentDetail.createdAt) || formatDate(currentDetail.createdAt))}</span>`
                : '',
            `<span data-role="housing-view-count"><i class="fa-regular fa-eye me-1"></i>${escapeHtml(formatViewCountLabel(currentDetail.viewCount))}</span>`
        ].filter(Boolean);
        metaEl.innerHTML = items.join('<span class="mx-1 text-body-tertiary">•</span>');
    };

    const renderTags = () => {
        if (!currentDetail) {
            tagsEl.innerHTML = '';
            tagsEl.classList.add('d-none');
            return;
        }
        const tags = [];
        if (currentDetail.cafEligible) {
            tags.push('CAF');
        }
        currentDetail.tags.forEach((tag) => {
            if (!tags.includes(tag)) {
                tags.push(tag);
            }
        });
        if (!tags.length) {
            tagsEl.innerHTML = '';
            tagsEl.classList.add('d-none');
            return;
        }
        tagsEl.classList.remove('d-none');
        tagsEl.innerHTML = tags.map((tag) => `<span class="sv-housing-tag">${escapeHtml(tag)}</span>`).join('');
    };

    const renderGallery = () => {
        if (!currentDetail) {
            galleryEl.innerHTML = renderEmptyState('Không có ảnh để hiển thị.');
            return;
        }

        if (currentDetail.images.length) {
            galleryEl.innerHTML = `
                <div class="sv-housing-image-list">
                    ${currentDetail.images.map((item, index) => `
                        <figure class="sv-housing-image-item">
                            <img class="sv-housing-image-thumb" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(`${currentDetail.title} - ảnh ${index + 1}`)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
                            <figcaption class="sv-housing-note mt-2">${item.primary || index === 0 ? 'Ảnh chính của tin thuê nhà.' : `Ảnh ${index + 1}`}</figcaption>
                        </figure>
                    `).join('')}
                </div>
            `;
            return;
        }

        if (currentDetail.imageUrl) {
            galleryEl.innerHTML = `
                <div class="sv-housing-image-list">
                    <figure class="sv-housing-image-item">
                        <img class="sv-housing-image-thumb" src="${escapeHtml(currentDetail.imageUrl)}" alt="${escapeHtml(currentDetail.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
                        <figcaption class="sv-housing-note mt-2">Ảnh chính của tin thuê nhà.</figcaption>
                    </figure>
                </div>
            `;
            return;
        }

        galleryEl.innerHTML = renderEmptyState('Tin này chưa có gallery ảnh riêng.');
    };

    const renderDescription = () => {
        if (!currentDetail) {
            descriptionEl.innerHTML = renderEmptyState('Không có mô tả để hiển thị.');
            return;
        }
        const safeHtml = sanitizeRichHtml(currentDetail.description);
        if (!hasRenderableRichContent(safeHtml)) {
            descriptionEl.innerHTML = renderEmptyState('Mô tả chi tiết đang được cập nhật.');
            return;
        }
        descriptionEl.innerHTML = safeHtml;
        applyRichLayouts(descriptionEl);
    };

    const renderTransit = () => {
        if (!currentDetail?.transitPoints?.length) {
            transitEl.innerHTML = renderEmptyState('Chưa có thông tin ga hoặc trạm gần nhà.');
            return;
        }
        transitEl.innerHTML = currentDetail.transitPoints.map((item) => `
            <div class="sv-housing-transit-item">
                <div class="d-flex justify-content-between gap-3 flex-wrap align-items-start">
                    <div>
                        <strong>${escapeHtml(item.transportIcon || '🚏')} ${escapeHtml(item.stationName)}</strong>
                        <div class="sv-housing-note mt-1">${escapeHtml(item.transportTypeLabel || item.transportType || 'Trạm giao thông')}${item.lineLabel ? ` • ${escapeHtml(item.lineLabel)}` : ''}</div>
                    </div>
                    <span class="sv-housing-tag">${escapeHtml(`${Math.max(0, Number(item.walkingMinutes || 0))} phút đi bộ`)}</span>
                </div>
            </div>
        `).join('');
    };

    const renderContact = () => {
        if (!currentDetail) {
            contactEl.innerHTML = renderEmptyState('Không có thông tin liên hệ.');
            return;
        }
        const contact = currentDetail.contact || {};
        const rows = [];
        if (contact.contactName) {
            rows.push(`<div><strong>${escapeHtml(contact.contactName)}</strong></div>`);
        }
        if (contact.contactPhone) {
            rows.push(`<div><i class="fa-solid fa-phone me-2 text-primary"></i>${escapeHtml(contact.contactPhone)}</div>`);
        }
        if (contact.contactEmail) {
            rows.push(`<div><i class="fa-regular fa-envelope me-2 text-primary"></i><a href="mailto:${escapeHtml(contact.contactEmail)}">${escapeHtml(contact.contactEmail)}</a></div>`);
        }
        if (contact.contactNote) {
            rows.push(`<div><i class="fa-regular fa-note-sticky me-2 text-primary"></i>${escapeHtml(contact.contactNote)}</div>`);
        }
        contactEl.innerHTML = rows.length ? rows.join('<div class="mt-2"></div>') : renderEmptyState('Người đăng chưa bổ sung thông tin liên hệ.');
    };

    const renderOwner = () => {
        if (!currentDetail) {
            ownerEl.innerHTML = renderEmptyState('Không có thông tin người đăng.');
            return;
        }
        const owner = currentDetail.owner || {};
        const displayName = String(owner.displayName || owner.nickname || 'Thành viên SVP').trim();
        const nickname = String(owner.nickname || '').trim();
        const profileHref = buildProfileHref(nickname, owner.userId, owner.authUserId);
        const ownerNameHtml = profileHref
            ? `<a href="${escapeHtml(profileHref)}"><strong>${escapeHtml(displayName)}</strong></a>`
            : `<strong>${escapeHtml(displayName)}</strong>`;
        ownerEl.innerHTML = `
            <div>${ownerNameHtml}</div>
            ${nickname ? `<div class="sv-housing-note mt-1">@${escapeHtml(nickname)}</div>` : ''}
            ${currentDetail.createdAt ? `<div class="sv-housing-note mt-2">Đăng lúc ${escapeHtml(formatDate(currentDetail.createdAt))}</div>` : ''}
        `;
    };

    const updateMap = () => {
        if (!currentDetail) return;
        const lat = Number(currentDetail.latitude);
        const lng = Number(currentDetail.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
        }
        marker.setLatLng([lat, lng]);
        if (typeof marker.bindPopup === 'function') {
            marker.bindPopup(escapeHtml(currentDetail.addressText || currentDetail.title || 'Vị trí nhà thuê'));
        }
        map.setView([lat, lng], 14);
        window.setTimeout(() => {
            if (typeof map.invalidateSize === 'function') {
                map.invalidateSize();
            }
        }, 80);
    };

    const setShareLinks = async () => {
        shareSectionEl.classList.remove('d-none');
        shareFbEl.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentShareUrl)}`;
        shareMessengerEl.href = '#';
        try {
            shareMessengerEl.href = await buildMessengerShareUrl();
        } catch (_) {
            shareMessengerEl.href = `fb-messenger://share/?link=${encodeURIComponent(currentShareUrl)}`;
        }
    };

    const syncSeo = () => {
        if (!currentDetail || !seo || typeof seo.setPage !== 'function') {
            return;
        }
        const description = excerptText(
            currentDetail.description
            || `${currentDetail.propertyTypeLabel || 'Tin thuê nhà'} tại ${formatLocationLabel(currentDetail.city, currentDetail.arrondissement)}`,
            180
        ) || 'Chi tiết tin thuê nhà trên SVP.';
        const image = seo.absoluteUrl
            ? seo.absoluteUrl(extractShareImageUrl(currentDetail))
            : extractShareImageUrl(currentDetail);
        seo.setPage({
            title: `${currentDetail.title} | Thuê nhà | SVP`,
            description,
            url: currentCanonicalUrl,
            image,
            type: 'article',
            publishedTime: currentDetail.createdAt || undefined,
            modifiedTime: currentDetail.updatedAt || undefined
        });
    };

    const isAdminRole = (role) => role === 'ADMIN' || role === 'SUPERADMIN';

    const updateStatus = async (nextStatus, triggerBtn) => {
        if (!currentDetail?.viewerCanEdit) {
            return;
        }
        const targetStatus = String(nextStatus || '').trim().toUpperCase();
        if (!targetStatus || targetStatus === currentDetail.status) {
            return;
        }
        const originalLabel = triggerBtn ? triggerBtn.innerHTML : '';
        if (triggerBtn) {
            triggerBtn.disabled = true;
            triggerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang cập nhật...';
        }
        try {
            const payload = await shared.requestWithAuth(`${API_BASE_URL}/api/housing/${encodeURIComponent(currentDetail.id)}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: targetStatus })
            });
            currentDetail.status = String(payload?.status || targetStatus).trim().toUpperCase() || targetStatus;
            currentDetail.statusLabel = String(payload?.statusLabel || payload?.status_label || shared.statusMeta(currentDetail.status).label).trim();
            renderStatus();
            renderActions();
            setPageFeedback(`Đã cập nhật trạng thái sang "${currentDetail.statusLabel}".`, 'success');
        } catch (error) {
            setPageFeedback(String(error?.message || 'Không thể cập nhật trạng thái tin thuê nhà.'), 'error');
        } finally {
            if (triggerBtn) {
                triggerBtn.disabled = false;
                triggerBtn.innerHTML = originalLabel;
            }
        }
    };

    const renderActions = () => {
        if (!currentDetail) {
            actionsEl.innerHTML = '';
            return;
        }

        const statusOptions = ['AVAILABLE', 'RENTED', 'HIDDEN'].map((status) => {
            const meta = shared.statusMeta(status);
            return `<option value="${status}" ${currentDetail.status === status ? 'selected' : ''}>${escapeHtml(meta.label)}</option>`;
        }).join('');

        actionsEl.innerHTML = `
            <a class="btn btn-outline-secondary" href="ban-do-thue-nha.html">
                <i class="fa-solid fa-arrow-left me-2"></i>Quay lại bản đồ
            </a>
            ${currentDetail.viewerCanEdit ? `
                <a class="btn btn-primary" href="${escapeHtml(shared.buildHousingFormHref(currentDetail.id))}">
                    <i class="fa-solid fa-pen-to-square me-2"></i>Chỉnh sửa tin
                </a>
                <select id="housing-detail-status-select" class="form-select" aria-label="Cập nhật trạng thái tin thuê nhà">
                    ${statusOptions}
                </select>
                <button id="housing-detail-status-save" class="btn btn-outline-primary" type="button">
                    <i class="fa-solid fa-check me-2"></i>Lưu trạng thái
                </button>
            ` : ''}
        `;

        const statusSelect = document.getElementById('housing-detail-status-select');
        const statusSaveBtn = document.getElementById('housing-detail-status-save');
        if (statusSelect && statusSaveBtn) {
            statusSaveBtn.addEventListener('click', () => updateStatus(statusSelect.value, statusSaveBtn));
        }
    };

    const renderDetail = () => {
        if (!currentDetail) return;
        currentCanonicalUrl = shared.buildHousingCanonicalUrl(currentDetail.id);
        currentShareUrl = shared.buildHousingShareUrl(currentDetail.id, currentDetail.title);
        breadcrumbEl.textContent = currentDetail.title;
        titleEl.textContent = currentDetail.title;
        priceEl.textContent = currentDetail.priceLabel;
        renderStatus();
        renderMeta();
        renderTags();
        renderGallery();
        renderDescription();
        renderTransit();
        renderContact();
        renderOwner();
        updateMap();
        renderActions();
        void setShareLinks();
        syncSeo();
        setPageFeedback('', 'info');
    };

    const loadHousingDetail = async () => {
        setPageFeedback('Đang tải chi tiết tin thuê nhà...', 'info');
        const payload = await shared.requestWithAuth(`${API_BASE_URL}/api/housing/${encodeURIComponent(listingId)}`, {
            headers: { Accept: 'application/json' }
        });
        currentDetail = normalizeDetail(payload);
        renderDetail();
        return currentDetail;
    };

    const buildCommentAvatarHtml = (comment) => {
        const avatarUrl = normalizeHttpUrl(comment.authorAvatarUrl);
        if (avatarUrl) {
            return `<img class="sv-housing-comment-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(comment.authorDisplayName)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
        }
        const palette = window.SVPAvatar?.palette ? window.SVPAvatar.palette(comment.authorNickname || comment.authorUserId || comment.authorDisplayName) : avatarPalette(comment.authorDisplayName);
        const initial = window.SVPAvatar?.initial ? window.SVPAvatar.initial(comment.authorDisplayName) : getInitial(comment.authorDisplayName);
        return `<span class="sv-housing-comment-avatar" style="background:${escapeHtml(palette.bg)};color:${escapeHtml(palette.fg)}">${escapeHtml(initial)}</span>`;
    };

    const canEditComment = (comment) => {
        const caller = getCallerInfo();
        if (isAdminRole(caller.role)) {
            return true;
        }
        if (caller.userId && comment.authorUserId) {
            return caller.userId === comment.authorUserId;
        }
        return Boolean(caller.nickname && comment.authorNickname && caller.nickname === comment.authorNickname);
    };

    const renderCommentBadge = (count) => {
        const safeCount = Math.max(0, Number.isFinite(Number(count)) ? Number(count) : currentComments.length);
        commentBadgeEl.textContent = `${safeCount.toLocaleString('vi-VN')} bình luận`;
    };

    const renderCommentsList = () => {
        if (!currentComments.length) {
            commentsListEl.innerHTML = '<div class="sv-housing-note">Chưa có bình luận nào. Bạn có thể là người mở đầu trao đổi đầu tiên.</div>';
            renderCommentBadge(0);
            return;
        }

        commentsListEl.innerHTML = currentComments.map((comment) => {
            const profileHref = buildProfileHref(comment.authorNickname, comment.authorUserId, comment.authorAuthUserId);
            const authorHtml = profileHref
                ? `<a href="${escapeHtml(profileHref)}"><strong>${escapeHtml(comment.authorDisplayName)}</strong></a>`
                : `<strong>${escapeHtml(comment.authorDisplayName)}</strong>`;
            const actionButtons = [
                `<button type="button" data-comment-action="reply" data-comment-id="${comment.commentId}"><i class="fa-solid fa-reply me-1"></i>Trả lời</button>`,
                comment.contentText
                    ? `<button type="button" data-comment-action="quote" data-comment-id="${comment.commentId}"><i class="fa-solid fa-quote-left me-1"></i>Trích dẫn</button>`
                    : '',
                canEditComment(comment)
                    ? `<button type="button" data-comment-action="edit" data-comment-id="${comment.commentId}"><i class="fa-solid fa-pen me-1"></i>Sửa</button>`
                    : '',
                isAdminRole(getCallerInfo().role)
                    ? `<button type="button" data-comment-action="toggle-visibility" data-comment-id="${comment.commentId}">${comment.hidden ? '<i class="fa-solid fa-eye me-1"></i>Hiện lại' : '<i class="fa-solid fa-eye-slash me-1"></i>Ẩn'}</button>`
                    : ''
            ].filter(Boolean).join('');

            return `
                <article class="sv-housing-comment-item ${comment.hidden ? 'is-hidden' : ''}" data-comment-id="${comment.commentId}">
                    <div class="sv-housing-comment-item__head">
                        ${buildCommentAvatarHtml(comment)}
                        <div class="sv-housing-comment-author">
                            ${authorHtml}
                            <div class="sv-housing-comment-date" title="${escapeHtml(formatDate(comment.modifiedAt || comment.createdAt))}">
                                ${escapeHtml(timeAgo(comment.modifiedAt || comment.createdAt) || formatDate(comment.modifiedAt || comment.createdAt))}
                                ${comment.modifiedAt ? ' • đã chỉnh sửa' : ''}
                            </div>
                        </div>
                    </div>
                    ${comment.hidden ? '<div class="sv-housing-comment-status">Bình luận này đang bị ẩn với người xem thường.</div>' : ''}
                    <div class="sv-housing-comment-body">${comment.contentHtml}</div>
                    ${actionButtons ? `<div class="sv-housing-comment-actions">${actionButtons}</div>` : ''}
                </article>
            `;
        }).join('');

        commentsListEl.querySelectorAll('.sv-housing-comment-body').forEach((node) => applyRichLayouts(node));
        renderCommentBadge(currentComments.length);
    };

    const findCommentById = (commentId) => currentComments.find((item) => Number(item.commentId) === Number(commentId)) || null;

    const sortComments = (items) => items
        .slice()
        .sort((left, right) => {
            const leftTime = Date.parse(String(left?.createdAt || '')) || 0;
            const rightTime = Date.parse(String(right?.createdAt || '')) || 0;
            if (leftTime !== rightTime) {
                return leftTime - rightTime;
            }
            return Number(left?.commentId || 0) - Number(right?.commentId || 0);
        });

    const mergeComments = (incomingItems) => {
        const merged = new Map();
        currentComments.forEach((item) => {
            merged.set(Number(item.commentId || 0), item);
        });
        (Array.isArray(incomingItems) ? incomingItems : []).forEach((item) => {
            merged.set(Number(item.commentId || 0), item);
        });
        currentComments = sortComments(Array.from(merged.values()).filter((item) => Number(item?.commentId || 0) > 0));
        return currentComments;
    };

    const openCommentEditModal = async (comment) => {
        if (!comment) {
            return;
        }
        editingCommentId = Number(comment.commentId || 0);
        setFeedback(commentEditFeedbackEl, '', 'info');
        const composer = await ensureCommentEditComposer();
        if (composer && composer.isReady()) {
            composer.setHtml(comment.contentHtml || textToCommentHtml(comment.contentText));
        } else {
            commentEditMessageEl.value = htmlToPlainText(comment.contentHtml || '');
        }
        if (!commentEditModal && window.bootstrap?.Modal) {
            commentEditModal = new window.bootstrap.Modal(commentEditModalEl);
        }
        if (commentEditModal) {
            commentEditModal.show();
        } else {
            commentEditModalEl.style.display = 'block';
            commentEditModalEl.classList.add('show');
        }
        window.setTimeout(() => {
            if (composer && composer.isReady()) {
                composer.focus();
                return;
            }
            commentEditMessageEl.focus();
        }, 120);
    };

    const closeCommentEditModal = () => {
        if (commentEditModal) {
            commentEditModal.hide();
            return;
        }
        commentEditModalEl.classList.remove('show');
        commentEditModalEl.style.display = 'none';
    };

    const saveEditedComment = async () => {
        const comment = findCommentById(editingCommentId);
        if (!comment) {
            setFeedback(commentEditFeedbackEl, 'Không tìm thấy bình luận cần sửa.', 'error');
            return;
        }
        const editorReady = Boolean(commentEditComposer && commentEditComposer.isReady());
        const contentHtml = editorReady
            ? sanitizeCommentHtml(commentEditComposer.getSubmissionHtml())
            : textToCommentHtml(commentEditMessageEl.value || '');
        if (!hasRenderableCommentContent(contentHtml)) {
            setFeedback(commentEditFeedbackEl, 'Nội dung bình luận không được để trống.', 'error');
            return;
        }

        const originalLabel = commentEditSaveBtn.innerHTML;
        commentEditSaveBtn.disabled = true;
        commentEditSaveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang lưu...';
        try {
            await shared.requestWithAuth(`${API_BASE_URL}/api/housing/${encodeURIComponent(listingId)}/comments/${comment.commentId}`, {
                method: 'PATCH',
                body: JSON.stringify({ contentHtml })
            });
            comment.contentHtml = sanitizeCommentHtml(contentHtml);
            comment.contentText = htmlToPlainText(comment.contentHtml);
            comment.modifiedAt = new Date().toISOString();
            renderCommentsList();
            setFeedback(commentEditFeedbackEl, 'Đã cập nhật bình luận.', 'success');
            window.setTimeout(closeCommentEditModal, 180);
        } catch (error) {
            setFeedback(commentEditFeedbackEl, String(error?.message || 'Không thể lưu bình luận.'), 'error');
        } finally {
            commentEditSaveBtn.disabled = false;
            commentEditSaveBtn.innerHTML = originalLabel;
        }
    };

    const toggleCommentVisibility = async (comment) => {
        if (!comment) {
            return;
        }
        const endpoint = comment.hidden ? 'unhide' : 'hide';
        try {
            await shared.requestWithAuth(`${API_BASE_URL}/api/housing/${encodeURIComponent(listingId)}/comments/${comment.commentId}/${endpoint}`, {
                method: 'PATCH'
            });
            comment.hidden = !comment.hidden;
            renderCommentsList();
        } catch (error) {
            setPageFeedback(String(error?.message || 'Không thể cập nhật trạng thái bình luận.'), 'error');
        }
    };

    const loadComments = async () => {
        commentsListEl.innerHTML = '<div class="sv-housing-note">Đang tải bình luận...</div>';
        try {
            const payload = await shared.requestWithAuth(`${API_BASE_URL}/api/housing/${encodeURIComponent(listingId)}/comments`, {
                headers: { Accept: 'application/json' }
            });
            const items = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload?.comments) ? payload.comments : []);
            mergeComments(items.map((item) => normalizeComment(item)));
            renderCommentsList();
        } catch (error) {
            commentsListEl.innerHTML = `<div class="sv-housing-note" style="color:#b91c1c">${escapeHtml(String(error?.message || 'Không thể tải bình luận.'))}</div>`;
            renderCommentBadge(currentComments.length);
        }
    };

    const submitReply = async (event) => {
        event.preventDefault();
        const identity = syncReplyIdentityUi();
        const displayName = String(replyNameEl.value || '').trim();
        const contentHtml = getReplySubmissionHtml();
        const plainText = getReplyPlainText();

        if (!hasRenderableCommentContent(contentHtml)) {
            setFeedback(replyFeedbackEl, 'Nội dung bình luận không được để trống.', 'error');
            focusReplyComposer();
            return;
        }
        if (plainText.length > MAX_COMMENT_TEXT_LENGTH) {
            setFeedback(replyFeedbackEl, `Bình luận tối đa ${MAX_COMMENT_TEXT_LENGTH} ký tự.`, 'error');
            focusReplyComposer();
            return;
        }
        if (!identity.isAuthenticated) {
            if (displayName.length < 2) {
                setFeedback(replyFeedbackEl, 'Tên hiển thị cần ít nhất 2 ký tự.', 'error');
                replyNameEl.focus();
                return;
            }
            if (Number(replyCaptchaAnswerEl.value) !== Number(replyCaptchaAnswer)) {
                setFeedback(replyFeedbackEl, 'Kết quả xác nhận chưa đúng.', 'error');
                replyCaptchaAnswerEl.focus();
                generateReplyCaptcha();
                return;
            }
        }

        const originalLabel = replySubmitBtn.innerHTML;
        replySubmitBtn.disabled = true;
        replySubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang gửi...';
        try {
            const payload = await shared.requestWithAuth(`${API_BASE_URL}/api/housing/${encodeURIComponent(listingId)}/comments`, {
                method: 'POST',
                body: JSON.stringify({
                    displayName: identity.isAuthenticated ? '' : displayName,
                    contentHtml
                })
            });
            const createdComment = normalizeComment(payload);
            mergeComments([createdComment]);
            if (currentDetail) {
                currentDetail.viewCount = Number(payload?.viewCount ?? currentDetail.viewCount ?? 0);
                renderMeta();
            }
            renderCommentsList();
            renderCommentBadge(Math.max(currentComments.length, Number(payload?.commentCount || 0)));
            clearReplyComposer();
            if (!identity.isAuthenticated) {
                replyNameEl.value = '';
                generateReplyCaptcha();
            }
            setFeedback(replyFeedbackEl, 'Đã đăng bình luận.', 'success');
            const createdNode = commentsListEl.querySelector(`[data-comment-id="${createdComment.commentId}"]`);
            if (createdNode && typeof createdNode.scrollIntoView === 'function') {
                createdNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } catch (error) {
            if (!identity.isAuthenticated) {
                generateReplyCaptcha();
            }
            setFeedback(replyFeedbackEl, String(error?.message || 'Không thể đăng bình luận.'), 'error');
        } finally {
            replySubmitBtn.disabled = false;
            replySubmitBtn.innerHTML = originalLabel;
        }
    };

    const handleCommentAction = (event) => {
        const trigger = event.target instanceof Element ? event.target.closest('button[data-comment-action]') : null;
        if (!trigger) {
            return;
        }
        const comment = findCommentById(trigger.getAttribute('data-comment-id'));
        if (!comment) {
            return;
        }
        const action = String(trigger.getAttribute('data-comment-action') || '').trim();
        if (action === 'reply') {
            insertReplyMention(comment.authorDisplayName);
            focusReplyComposer();
            return;
        }
        if (action === 'quote') {
            insertReplyQuote(comment.authorDisplayName, comment.contentText);
            focusReplyComposer();
            return;
        }
        if (action === 'edit') {
            void openCommentEditModal(comment);
            return;
        }
        if (action === 'toggle-visibility') {
            void toggleCommentVisibility(comment);
        }
    };

    const bindEvents = () => {
        replyMessageEl.addEventListener('input', updateReplyCharCount);
        replyClearBtn.addEventListener('click', () => {
            clearReplyComposer();
            setFeedback(replyFeedbackEl, '', 'info');
            if (!peekAuthenticatedReplyIdentity().isAuthenticated) {
                generateReplyCaptcha();
            }
        });
        replyForm.addEventListener('submit', (event) => {
            void submitReply(event);
        });
        commentsListEl.addEventListener('click', handleCommentAction);
        commentEditSaveBtn.addEventListener('click', () => {
            void saveEditedComment();
        });
        shareCopyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(currentShareUrl);
                setPageFeedback('Đã copy link chia sẻ.', 'success');
            } catch (_) {
                setPageFeedback('Không thể copy link chia sẻ.', 'error');
            }
        });
        if (commentEditModalEl) {
            commentEditModalEl.addEventListener('hidden.bs.modal', () => {
                editingCommentId = 0;
                setFeedback(commentEditFeedbackEl, '', 'info');
                if (commentEditComposer && commentEditComposer.isReady()) {
                    commentEditComposer.clear();
                } else {
                    commentEditMessageEl.value = '';
                }
            });
        }
        window.addEventListener('storage', () => {
            syncReplyIdentityUi();
        });
    };

    const boot = async () => {
        if (!listingId) {
            setPageFeedback('ID tin thuê nhà không hợp lệ.', 'error');
            return;
        }
        bindEvents();
        syncReplyIdentityUi();
        await initReplyComposer();
        updateReplyCharCount();
        try {
            await loadHousingDetail();
            void loadComments();
        } catch (error) {
            setPageFeedback(String(error?.message || 'Không thể tải chi tiết tin thuê nhà.'), 'error');
            galleryEl.innerHTML = renderEmptyState('Không thể tải dữ liệu ảnh.');
            descriptionEl.innerHTML = renderEmptyState('Không thể tải dữ liệu mô tả.');
            transitEl.innerHTML = renderEmptyState('Không thể tải dữ liệu ga/trạm.');
            contactEl.innerHTML = renderEmptyState('Không thể tải dữ liệu liên hệ.');
            ownerEl.innerHTML = renderEmptyState('Không thể tải dữ liệu người đăng.');
            commentsListEl.innerHTML = `<div class="sv-housing-note" style="color:#b91c1c">${escapeHtml(String(error?.message || 'Không thể tải bình luận.'))}</div>`;
        }
    };

    void boot();
})();
