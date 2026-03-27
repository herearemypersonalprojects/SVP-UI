(function () {
    const API_BASE_URL = window.SVP_API_BASE_URL || 'http://localhost:8080';
    const urlHelpers = window.SVPSeo && window.SVPSeo.urls ? window.SVPSeo.urls : null;
    const CATEGORY_NAMES = {
        1: 'Học tập và nghiên cứu tại Pháp',
        2: 'Kinh nghiệm xin học bổng và du học',
        3: 'Cuộc sống tại Pháp',
        4: 'Cơ hội việc làm và thực tập',
        5: 'Pháp lý, quốc tịch và thuế khóa',
        6: 'Văn hóa và ngôn ngữ Pháp',
        7: 'Sự kiện và giao lưu',
        8: 'Nhà cửa',
        9: 'Mua bán, rao vặt',
        10: 'Đầu tư tại Pháp',
        11: 'Chia sẻ trải nghiệm cá nhân',
        12: 'Công nghệ, kỹ năng và tri thức mở',
        13: 'Giải trí, du lịch',
        14: 'Văn học và nghệ thuật',
        15: 'Gặp gỡ, hẹn hò nghiêm túc',
        16: 'Chém gió, tán gẫu',
        17: 'Góp ý xây dựng SVP'
    };
    const SOURCE_DEFINITIONS = [
        {
            key: 'discussions',
            label: 'Thảo luận mới nhất',
            emptyLabel: 'Hiện chưa có thảo luận mới.',
            path: '/posts/latest-discussions?limit=2',
            authRequired: false,
            readItems: (payload) => Array.isArray(payload.items) ? payload.items : []
        },
        {
            key: 'articles',
            label: 'Bài viết mới nhất',
            emptyLabel: 'Hiện chưa có bài viết mới.',
            path: '/posts/latest-articles?limit=2',
            authRequired: false,
            readItems: (payload) => Array.isArray(payload.items) ? payload.items : []
        },
        {
            key: 'events',
            label: 'Sự kiện mới được thêm',
            emptyLabel: 'Hiện chưa có sự kiện mới được thêm.',
            path: '/events/latest-added?limit=2',
            authRequired: false,
            readItems: (payload) => Array.isArray(payload.items) ? payload.items : []
        },
        {
            key: 'followedBlogs',
            label: 'Bài blog từ thành viên bạn theo dõi',
            emptyLabel: 'Hiện chưa có bài blog mới từ các thành viên bạn theo dõi.',
            path: '/users/followed-blogs/latest?limit=2',
            authRequired: true,
            readItems: (payload) => Array.isArray(payload.items) ? payload.items : []
        },
        {
            key: 'comments',
            label: 'Bình luận mới nhất',
            emptyLabel: 'Hiện chưa có bình luận mới.',
            path: '/comments/latest?limit=2',
            authRequired: false,
            readItems: (payload) => Array.isArray(payload.items) ? payload.items : []
        }
    ];

    const statusEl = document.getElementById('feed-status');
    const streamEl = document.getElementById('feed-stream');
    const summaryEl = document.getElementById('feed-summary');
    const notesEl = document.getElementById('feed-notes');

    if (!statusEl || !streamEl || !summaryEl || !notesEl) {
        return;
    }

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    const htmlEntityDecoder = document.createElement('textarea');
    const decodeHtmlEntities = (value) => {
        let text = String(value ?? '');
        if (!text) return '';
        for (let index = 0; index < 3; index += 1) {
            htmlEntityDecoder.innerHTML = text;
            const decoded = htmlEntityDecoder.value;
            if (decoded === text) {
                break;
            }
            text = decoded;
        }
        return text;
    };

    const sanitizeUrl = (value) => {
        const raw = decodeHtmlEntities(value).trim();
        if (!raw) return '';
        try {
            const parsed = new URL(raw, window.location.href);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
        } catch (_) {
            return '';
        }
    };

    const toTimeValue = (value) => {
        const parsed = Date.parse(String(value || ''));
        return Number.isFinite(parsed) ? parsed : 0;
    };
    const isUuidLike = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(String(value || '').trim());
    const isPositiveIntegerLike = (value) => /^[1-9]\d*$/.test(String(value || '').trim());

    const formatDateTime = (value) => {
        const time = toTimeValue(value);
        if (!time) return 'Chưa cập nhật';
        return new Intl.DateTimeFormat('vi-VN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(time));
    };

    const formatShortDate = (value) => {
        const time = toTimeValue(value);
        if (!time) return 'Chưa cập nhật';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(new Date(time));
    };

    const toPlainText = (html) => decodeHtmlEntities(html)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const excerptText = (html, maxLength) => {
        const plain = toPlainText(html);
        if (plain.length <= maxLength) return plain;
        return `${plain.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
    };

    const isLocalUi = () => {
        const hostname = String(window.location.hostname || '').toLowerCase();
        const protocol = String(window.location.protocol || '').toLowerCase();
        return protocol === 'file:'
            || hostname === 'localhost'
            || hostname === '127.0.0.1'
            || hostname === '::1'
            || hostname === '[::1]';
    };

    const buildApiModeQuery = () => {
        try {
            const params = new URLSearchParams(window.location.search || '');
            const api = String(params.get('api') || '').trim().toLowerCase();
            return api === 'local' || api === 'cloud' ? `?api=${encodeURIComponent(api)}` : '';
        } catch (_) {
            return '';
        }
    };

    const buildFeedHref = () => {
        if (urlHelpers && typeof urlHelpers.buildStandalonePath === 'function') {
            return urlHelpers.buildStandalonePath('feed');
        }
        const suffix = buildApiModeQuery();
        return isLocalUi() ? `feed.html${suffix}` : `/feed.html${suffix}`;
    };

    const buildHomeHref = () => `index.html${buildApiModeQuery()}`;

    const getCategoryName = (categoryId) => CATEGORY_NAMES[Number(categoryId)] || 'Chuyên mục khác';

    const buildProfileHref = (author) => {
        const nickname = String(author && author.nickname || '').trim();
        const authUserId = String(author && author.authUserId || '').trim();
        const userId = String(author && author.userId || '').trim();
        if (window.SVPAuth?.buildProfileHref) {
            return window.SVPAuth.buildProfileHref({ nickname, userId, authUserId }, '');
        }
        if (isPositiveIntegerLike(authUserId)) return `profile.html?auth_user_id=${encodeURIComponent(authUserId)}`;
        if (isUuidLike(userId)) return `profile.html?user_id=${encodeURIComponent(userId)}`;
        if (nickname) return `profile.html?nickname=${encodeURIComponent(nickname)}`;
        return '';
    };

    const buildPostHref = (postId, title, isArticle) => {
        if (urlHelpers) {
            return urlHelpers.buildDetailPath(isArticle ? 'article' : 'thread', postId, title);
        }
        return isArticle
            ? `post_detail.html?postId=${encodeURIComponent(postId)}`
            : `thread.html?postId=${encodeURIComponent(postId)}`;
    };

    const buildEventHref = (eventId, title) => urlHelpers
        ? urlHelpers.buildDetailPath('event', eventId, title)
        : `event_detail.html?eventId=${encodeURIComponent(eventId)}`;

    const readViewerIdentity = (accessToken) => {
        const payload = window.SVPAuth && typeof window.SVPAuth.parseJwtPayload === 'function'
            ? window.SVPAuth.parseJwtPayload(accessToken) || {}
            : {};
        return {
            nickname: String(localStorage.getItem('userNickname') || payload.nickname || '').trim(),
            displayName: String(localStorage.getItem('userDisplayName') || payload.displayName || payload.nickname || 'Bạn').trim()
        };
    };

    const normalizeAuthor = (author, fallbackSource) => ({
        authUserId: decodeHtmlEntities(
            author && author.authUserId
            || author && author.auth_user_id
            || author && author.authorAuthUserId
            || fallbackSource && fallbackSource.authorAuthUserId
            || fallbackSource && fallbackSource.author_auth_user_id
            || (!isUuidLike(author && author.userId) ? author && author.userId : '')
            || (!isUuidLike(fallbackSource && fallbackSource.authorUserId) ? fallbackSource && fallbackSource.authorUserId : '')
            || ''
        ).trim(),
        userId: decodeHtmlEntities(
            author && author.userId
            || author && author.user_id
            || fallbackSource && fallbackSource.authorUserId
            || fallbackSource && fallbackSource.author_user_id
            || ''
        ).trim(),
        nickname: decodeHtmlEntities(
            author && author.nickname
            || fallbackSource && fallbackSource.authorNickname
            || fallbackSource && fallbackSource.author_nickname
            || ''
        ).trim(),
        displayName: decodeHtmlEntities(
            author && author.displayName
            || author && author.display_name
            || fallbackSource && fallbackSource.authorDisplayName
            || fallbackSource && fallbackSource.author_display_name
            || author && author.nickname
            || fallbackSource && fallbackSource.authorNickname
            || 'Thành viên SVP'
        ).trim(),
        avatarUrl: sanitizeUrl(
            author && author.avatarUrl
            || author && author.avatar_url
            || fallbackSource && fallbackSource.authorAvatarUrl
            || fallbackSource && fallbackSource.author_avatar_url
            || ''
        )
    });

    const renderAuthorLink = (author) => {
        const profileHref = buildProfileHref(author);
        const label = escapeHtml(author.displayName || author.nickname || 'Thành viên SVP');
        if (!profileHref) return label;
        return `<a href="${profileHref}">${label}</a>`;
    };

    const renderTags = (tags) => tags.map((tag) => (
        `<span class="sv-feed-tag" data-tag="${escapeHtml(tag.key)}"><i class="${escapeHtml(tag.icon)}"></i>${escapeHtml(tag.label)}</span>`
    )).join('');

    const renderCover = (href, imageUrl, compact) => {
        const safeUrl = sanitizeUrl(imageUrl);
        if (!safeUrl) return '';
        const extraClass = compact ? ' is-compact' : '';
        return `<a class="sv-feed-card__cover${extraClass}" href="${href}" style="background-image:url('${escapeHtml(safeUrl)}')"></a>`;
    };

    const makeArticleEntry = (item, tagKey, tagLabel, tagIcon) => {
        const author = normalizeAuthor(item.author || {}, item);
        const title = decodeHtmlEntities(item.title || 'Bài viết mới').trim();
        return {
            key: `post:${Number(item.postId || 0)}`,
            entityType: 'article',
            title,
            href: buildPostHref(item.postId, title, true),
            createdAt: item.createdAt,
            sortTime: toTimeValue(item.createdAt),
            author,
            coverImageUrl: sanitizeUrl(item.coverImageUrl),
            excerpt: excerptText(item.contentHtml, 280) || 'Nội dung bài viết đang được cập nhật.',
            footer: [
                getCategoryName(item.categoryId),
                `${Number(item.viewCount || 0).toLocaleString('vi-VN')} lượt xem`,
                `${Number(item.commentCount || 0).toLocaleString('vi-VN')} bình luận`
            ],
            tags: [{ key: tagKey, label: tagLabel, icon: tagIcon }]
        };
    };

    const makeDiscussionEntry = (item) => {
        const author = normalizeAuthor(item.author || {}, item);
        const title = decodeHtmlEntities(item.title || 'Chủ đề mới').trim();
        return {
            key: `post:${Number(item.postId || 0)}`,
            entityType: 'discussion',
            title,
            href: buildPostHref(item.postId, title, false),
            createdAt: item.createdAt,
            sortTime: toTimeValue(item.createdAt),
            author,
            coverImageUrl: sanitizeUrl(item.coverImageUrl),
            excerpt: excerptText(item.contentHtml, 260) || 'Nội dung chủ đề đang được cập nhật.',
            footer: [
                getCategoryName(item.categoryId),
                `${Number(item.viewCount || 0).toLocaleString('vi-VN')} lượt xem`,
                `${Number(item.commentCount || 0).toLocaleString('vi-VN')} phản hồi`
            ],
            tags: [{ key: 'discussion', label: 'Thảo luận', icon: 'fa-regular fa-comments' }]
        };
    };

    const makeEventEntry = (item) => {
        const title = decodeHtmlEntities(item.title || 'Sự kiện mới').trim();
        const address = decodeHtmlEntities(item.address || '').trim();
        const eventTypeName = decodeHtmlEntities(item.eventTypeName || '').trim();
        const priceValue = Number(item.price);
        const priceLabel = Number.isFinite(priceValue) && priceValue > 0
            ? `${priceValue.toLocaleString('vi-VN')}€`
            : (item.online ? 'Online' : 'Miễn phí');
        return {
            key: `event:${Number(item.eventId || 0)}`,
            entityType: 'event',
            title,
            href: buildEventHref(item.eventId, title),
            createdAt: item.createdAt,
            sortTime: toTimeValue(item.createdAt),
            author: null,
            coverImageUrl: sanitizeUrl(item.coverImageUrl || item.cover_image_url || item.imageUrl || item.image_url),
            excerpt: `Được thêm ngày ${formatDateTime(item.createdAt)}. Sự kiện diễn ra vào ${formatDateTime(item.eventTime)}${address ? ` tại ${address}` : ''}.`,
            footer: [
                eventTypeName ? `Loại: ${eventTypeName}` : 'Sự kiện cộng đồng',
                priceLabel
            ],
            tags: [{ key: 'event', label: 'Sự kiện mới được thêm', icon: 'fa-solid fa-calendar-plus' }]
        };
    };

    const makeCommentEntry = (item) => {
        const author = normalizeAuthor(item.author || {}, item);
        const postTitle = decodeHtmlEntities(item.postTitle || 'bài viết liên quan').trim();
        return {
            key: `comment:${Number(item.commentId || 0)}`,
            entityType: 'comment',
            title: `Bình luận mới trên "${postTitle}"`,
            href: buildPostHref(item.postId, postTitle, Boolean(item.article)),
            createdAt: item.createdAt,
            sortTime: toTimeValue(item.createdAt),
            author,
            coverImageUrl: sanitizeUrl(item.imageUrl),
            excerpt: excerptText(item.contentHtml, 240) || 'Nội dung bình luận đang được cập nhật.',
            footer: [
                item.article ? 'Thuộc bài viết' : 'Thuộc chủ đề thảo luận',
                `Bài gốc: ${postTitle}`
            ],
            tags: [{ key: 'comment', label: 'Bình luận mới', icon: 'fa-regular fa-message' }]
        };
    };

    const mergeEntries = (groups) => {
        const merged = new Map();
        groups.flat().forEach((entry) => {
            if (!entry || !entry.key) return;
            const existing = merged.get(entry.key);
            if (!existing) {
                merged.set(entry.key, {
                    ...entry,
                    tags: Array.isArray(entry.tags) ? entry.tags.slice() : []
                });
                return;
            }
            entry.tags.forEach((tag) => {
                if (!existing.tags.some((item) => item.key === tag.key)) {
                    existing.tags.push(tag);
                }
            });
            if (!existing.coverImageUrl && entry.coverImageUrl) {
                existing.coverImageUrl = entry.coverImageUrl;
            }
            if ((!existing.excerpt || existing.excerpt === 'Nội dung bài viết đang được cập nhật.') && entry.excerpt) {
                existing.excerpt = entry.excerpt;
            }
        });
        return Array.from(merged.values()).sort((left, right) => {
            if (right.sortTime !== left.sortTime) {
                return right.sortTime - left.sortTime;
            }
            return String(left.key).localeCompare(String(right.key));
        });
    };

    const renderEntry = (entry) => {
        const metaParts = [];
        if (entry.author) {
            metaParts.push(`Bởi ${renderAuthorLink(entry.author)}`);
        }
        metaParts.push(`Cập nhật ${escapeHtml(formatDateTime(entry.createdAt))}`);
        return `
            <article class="sv-feed-card">
                <div class="sv-feed-card__body">
                    <div class="sv-feed-card__top">
                        <div class="sv-feed-tags">${renderTags(entry.tags || [])}</div>
                        <div class="sv-feed-card__time">${escapeHtml(formatShortDate(entry.createdAt))}</div>
                    </div>
                    <h3 class="sv-feed-card__title"><a href="${entry.href}">${escapeHtml(entry.title)}</a></h3>
                    <div class="sv-feed-card__meta">${metaParts.join(' • ')}</div>
                    <p class="sv-feed-card__excerpt">${escapeHtml(entry.excerpt)}</p>
                    <div class="sv-feed-card__footer">${(entry.footer || []).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
                </div>
                ${renderCover(entry.href, entry.coverImageUrl, entry.entityType === 'comment' || entry.entityType === 'event')}
            </article>
        `;
    };

    const renderStream = (entries) => {
        if (!Array.isArray(entries) || entries.length === 0) {
            streamEl.innerHTML = '<div class="sv-feed-empty">Hiện chưa có dữ liệu mới để hiển thị trong bảng tin.</div>';
            return;
        }
        streamEl.innerHTML = entries.map(renderEntry).join('');
    };

    const renderSummary = (sources) => {
        summaryEl.innerHTML = SOURCE_DEFINITIONS.map((source) => {
            const state = sources[source.key] || { items: [], error: '' };
            const count = Array.isArray(state.items) ? state.items.length : 0;
            const countClass = state.error ? ' is-error' : '';
            const detailText = state.error || (count > 0 ? `Đã tải ${count} mục` : source.emptyLabel);
            return `
                <div class="sv-feed-summary__item">
                    <div>
                        <strong>${escapeHtml(source.label)}</strong>
                        <span>${escapeHtml(detailText)}</span>
                    </div>
                    <span class="sv-feed-summary__count${countClass}">${escapeHtml(state.error ? '!' : count)}</span>
                </div>
            `;
        }).join('');

        const notes = [];
        if (sources.followedBlogs && sources.followedBlogs.loginRequired) {
            notes.push('Đăng nhập để xem các bài blog mới từ những thành viên bạn theo dõi và cá nhân hóa bảng tin.');
        } else if (!sources.followedBlogs || !Array.isArray(sources.followedBlogs.items) || sources.followedBlogs.items.length === 0) {
            notes.push('Hiện chưa có bài blog mới từ các thành viên bạn theo dõi. Bạn có thể theo dõi thêm thành viên trong espace để cá nhân hóa bảng tin tốt hơn.');
        }
        if (sources.events && Array.isArray(sources.events.items) && sources.events.items.length > 0) {
            notes.push('Thứ tự hiển thị của bảng tin dựa trên thời điểm nội dung được tạo hoặc thêm vào hệ thống, không dựa trên thời gian diễn ra sự kiện.');
        }
        if (Object.values(sources).some((state) => state && state.error)) {
            notes.push('Một số nguồn dữ liệu hiện chưa tải được. Bảng tin vẫn hiển thị các mục còn lại để không gián đoạn trải nghiệm xem nội dung.');
        }
        notesEl.innerHTML = notes.length > 0
            ? notes.map((note) => `<div class="sv-feed-note">${escapeHtml(note)}</div>`).join('')
            : '<div class="sv-feed-note">Bảng tin đã tổng hợp và sắp xếp theo thời gian mới nhất.</div>';
    };

    const fetchJson = async (path, options) => {
        const response = await fetch(`${API_BASE_URL}${path}`, options);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(payload.error || 'Không thể tải dữ liệu bảng tin.');
            error.status = response.status;
            throw error;
        }
        return payload;
    };

    const loadSource = async (definition, accessToken) => {
        if (definition.authRequired && !accessToken) {
            return {
                items: [],
                error: 'Đăng nhập để xem mục này.',
                authFailed: false,
                loginRequired: true
            };
        }
        try {
            const payload = await fetchJson(definition.path, {
                headers: {
                    Accept: 'application/json',
                    ...(definition.authRequired ? { Authorization: `Bearer ${accessToken}` } : {})
                }
            });
            return {
                items: definition.readItems(payload),
                error: '',
                authFailed: false,
                loginRequired: false
            };
        } catch (error) {
            return {
                items: [],
                error: definition.authRequired && (error.status === 401 || error.status === 403)
                    ? 'Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại để xem mục này.'
                    : String(error && error.message || 'Không thể tải nguồn dữ liệu này.'),
                authFailed: Boolean(definition.authRequired && (error.status === 401 || error.status === 403)),
                loginRequired: false
            };
        }
    };

    const setSkeleton = () => {
        streamEl.innerHTML = `
            <div class="sv-feed-empty">Đang tải 5 nguồn dữ liệu của bảng tin...</div>
        `;
        summaryEl.innerHTML = SOURCE_DEFINITIONS.map((source) => `
            <div class="sv-feed-summary__item">
                <div>
                    <strong>${escapeHtml(source.label)}</strong>
                    <span>Đang tải...</span>
                </div>
                <span class="sv-feed-summary__count">...</span>
            </div>
        `).join('');
        notesEl.innerHTML = '<div class="sv-feed-note">Bảng tin này luôn mở được. Khi đăng nhập, bạn sẽ thấy thêm blog từ những thành viên mình theo dõi.</div>';
    };

    const init = async () => {
        setSkeleton();

        const accessToken = window.SVPAuth && typeof window.SVPAuth.getValidAccessToken === 'function'
            ? await window.SVPAuth.getValidAccessToken()
            : '';
        const viewer = accessToken
            ? readViewerIdentity(accessToken)
            : { nickname: '', displayName: 'Khách' };
        if (window.SVPSeo && typeof window.SVPSeo.setPage === 'function') {
            window.SVPSeo.setPage({
                title: accessToken ? `Bảng tin của ${viewer.displayName} - SVP` : 'Bảng tin - SVP',
                path: '/feed.html',
                robots: window.SVPSeo.privateRobots,
                noindex: true,
                schema: false
            });
        }

        const sourceStates = await Promise.all(
            SOURCE_DEFINITIONS.map((definition) => loadSource(definition, accessToken))
        );
        const states = {};
        SOURCE_DEFINITIONS.forEach((definition, index) => {
            states[definition.key] = sourceStates[index];
        });

        const entries = mergeEntries([
            (states.discussions.items || []).map(makeDiscussionEntry),
            (states.articles.items || []).map((item) => makeArticleEntry(item, 'article', 'Bài viết mới', 'fa-regular fa-newspaper')),
            (states.events.items || []).map(makeEventEntry),
            (states.followedBlogs.items || []).map((item) => makeArticleEntry(item, 'followed', 'Bạn theo dõi', 'fa-solid fa-user-check')),
            (states.comments.items || []).map(makeCommentEntry)
        ]);

        renderSummary(states);
        renderStream(entries);
        if (!accessToken) {
            statusEl.textContent = entries.length > 0
                ? `Đã tổng hợp ${entries.length} mục công khai mới nhất`
                : 'Đăng nhập để xem bảng tin cá nhân đầy đủ hơn';
            return;
        }
        statusEl.textContent = entries.length > 0
            ? `Đã tổng hợp ${entries.length} mục mới nhất`
            : 'Hiện chưa có cập nhật mới trong bảng tin';
    };

    init().catch((error) => {
        console.error('Cannot load feed:', error);
        statusEl.textContent = 'Không thể tải bảng tin lúc này';
        streamEl.innerHTML = '<div class="sv-feed-empty">Không thể tải bảng tin cá nhân. Vui lòng thử lại sau.</div>';
        notesEl.innerHTML = `<div class="sv-feed-note">${escapeHtml(String(error && error.message || 'Không thể tải bảng tin.'))}</div>`;
    });
})();
