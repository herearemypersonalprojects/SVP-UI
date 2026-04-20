(function () {
    const SITE_URL = String(window.SVP_PUBLIC_SITE_URL || 'https://svpforum.fr').replace(/\/+$/g, '');
    const SHARE_SITE_URL = String(window.SVP_SHARE_BASE_URL || 'https://share.svpforum.fr').replace(/\/+$/g, '');
    const SITE_NAME = 'SVP Forum';
    const DEFAULT_IMAGE = `${SITE_URL}/assets/icons/icon_svp.png`;
    const DEFAULT_DESCRIPTION = 'Diễn đàn Sinh viên & Tri thức Việt tại Pháp  - nơi kết nối, chia sẻ kiến thức, sự kiện và cộng đồng người Việt tại Pháp.';
    const PUBLIC_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
    const PRIVATE_ROBOTS = 'noindex,nofollow,noarchive';
    const DEFAULT_THEME_COLOR = '#1d4ed8';
    const DETAIL_ROUTE_MAP = {
        article: { file: 'post_detail.html', queryKey: 'postId', shareKind: 'article', prettyPrefix: 'bai-viet', fallbackSlug: 'bai-viet' },
        thread: { file: 'thread.html', queryKey: 'postId', shareKind: 'thread', prettyPrefix: 'chu-de', fallbackSlug: 'chu-de' },
        event: { file: 'event_detail.html', queryKey: 'eventId', shareKind: 'event', prettyPrefix: 'su-kien', fallbackSlug: 'su-kien' }
    };
    const STANDALONE_ROUTE_MAP = {
        feed: 'feed.html'
    };
    const head = document.head;

    if (!head) return;

    const authGuard = (() => {
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
            '/ban-do-thue-nha.html',
            '/post_detail.html',
            '/event_detail.html',
            '/housing_detail.html',
            '/thread.html',
            '/forum.html',
            '/contact.html',
            '/event_detail.html',
            '/events.html',
            '/ban-do-paris.html',
            '/about.html',
            '/privacy.html',
            '/terms.html',
            '/support.html',
            '/faq.html',
            '/sitemap.html',
            '/rss.xml',
            '/robots.txt',
            '/404.html',
            '/500.html',
            '/profile.html',
            '/share.html',
            '/profile.html',
            '/11qyalh10yucjx9dvsey1u2ihsk4xf.html'
        ]);
        const PUBLIC_DETAIL_PREFIXES = [
            '/bai-viet/',
            '/su-kien/'
        ];
        const asText = (value) => String(value || '').trim();
        const normalizePathname = (value) => {
            const raw = asText(value);
            if (!raw || raw === '/') return '/index.html';
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
            if (!raw) return '/index.html';
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
    })();

    if (authGuard.enforcePageAccess()) return;

    const resolveSiteBasePath = () => {
        try {
            const parsed = new URL(`${SITE_URL}/`);
            const pathname = String(parsed.pathname || '/').replace(/\/+$/g, '');
            return pathname ? `${pathname}/` : '/';
        } catch (_) {
            return '/';
        }
    };

    const buildUrl = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return `${SITE_URL}/`;
        try {
            return new URL(raw, `${SITE_URL}/`).href;
        } catch (_) {
            return `${SITE_URL}/`;
        }
    };

    const currentFileName = () => {
        const path = String(window.location.pathname || '/').trim() || '/';
        if (path === '/' || path.endsWith('/')) return 'index.html';
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 1 && STANDALONE_ROUTE_MAP[parts[0]]) {
            return STANDALONE_ROUTE_MAP[parts[0]];
        }
        if (parts.length >= 2) {
            const matchedRoute = Object.values(DETAIL_ROUTE_MAP).find((route) => route.prettyPrefix === parts[0]);
            if (matchedRoute) return matchedRoute.file;
        }
        return parts.length ? parts[parts.length - 1] : 'index.html';
    };

    const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

    const htmlToText = (html) => {
        const el = document.createElement('div');
        el.innerHTML = String(html || '');
        return cleanText(el.textContent || el.innerText || '');
    };

    const excerpt = (value, maxLength = 160) => {
        const text = cleanText(value);
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
    };

    const compactObject = (value) => Object.fromEntries(
        Object.entries(value || {}).filter(([, item]) => {
            if (item === null || item === undefined) return false;
            if (typeof item === 'string' && item.trim() === '') return false;
            if (Array.isArray(item) && item.length === 0) return false;
            return true;
        })
    );

    const findMeta = (attribute, key) => {
        const metas = head.querySelectorAll(`meta[${attribute}]`);
        for (const meta of metas) {
            if (meta.getAttribute(attribute) === key) return meta;
        }
        return null;
    };

    const setMeta = (attribute, key, content) => {
        const value = cleanText(content);
        if (!value) return;
        let meta = findMeta(attribute, key);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attribute, key);
            head.appendChild(meta);
        }
        meta.setAttribute('content', value);
    };

    const removeMeta = (attribute, key) => {
        const meta = findMeta(attribute, key);
        if (meta) meta.remove();
    };

    const setLink = (rel, href) => {
        const value = buildUrl(href);
        let link = head.querySelector(`link[rel="${rel}"]`);
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', rel);
            head.appendChild(link);
        }
        link.setAttribute('href', value);
    };

    const setStructuredData = (payload) => {
        const scriptId = 'svp-seo-ldjson';
        let script = document.getElementById(scriptId);
        const normalized = Array.isArray(payload) ? payload.filter(Boolean) : (payload ? [payload] : []);
        if (normalized.length === 0) {
            if (script) script.remove();
            return;
        }
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.type = 'application/ld+json';
            head.appendChild(script);
        }
        script.textContent = JSON.stringify(normalized.length === 1 ? normalized[0] : normalized);
    };

    const isLocalUiContext = () => {
        const protocol = String(window.location.protocol || '').toLowerCase();
        const hostname = String(window.location.hostname || '').toLowerCase();
        return protocol === 'file:'
            || hostname === 'localhost'
            || hostname === '127.0.0.1'
            || hostname === '::1'
            || hostname === '[::1]';
    };

    const ensureDocumentBase = () => {
        if (isLocalUiContext()) {
            return;
        }
        const baseHref = resolveSiteBasePath();
        let baseEl = head.querySelector('base');
        if (!baseEl) {
            baseEl = document.createElement('base');
            head.insertBefore(baseEl, head.firstChild);
        }
        if (baseEl.getAttribute('href') !== baseHref) {
            baseEl.setAttribute('href', baseHref);
        }
    };

    const currentApiMode = () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const mode = cleanText(params.get('api')).toLowerCase();
            return mode === 'local' || mode === 'cloud' ? mode : '';
        } catch (_) {
            return '';
        }
    };

    const slugify = (value, fallback = 'item') => {
        const base = String(value || '')
            .trim()
            .replace(/[đĐ]/g, (char) => (char === 'Đ' ? 'D' : 'd'))
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        return base || String(fallback || 'item').trim().toLowerCase() || 'item';
    };

    const resolveDetailRoute = (kind) => DETAIL_ROUTE_MAP[String(kind || '').trim().toLowerCase()] || null;
    const parsePrettyRoute = (pathname) => {
        const path = String(pathname || window.location.pathname || '/').trim();
        const parts = path.split('/').filter(Boolean);
        if (parts.length < 2) return null;
        const route = Object.entries(DETAIL_ROUTE_MAP)
            .find(([, candidate]) => candidate.prettyPrefix === parts[0]);
        if (!route) return null;
        const numericId = normalizeId(parts[1]);
        if (numericId <= 0) return null;
        return {
            kind: route[0],
            id: numericId,
            slug: parts[2] || '',
            file: route[1].file,
            queryKey: route[1].queryKey,
            prettyPrefix: route[1].prettyPrefix
        };
    };

    const normalizeId = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return 0;
        return Math.trunc(parsed);
    };

    const buildPrettyPath = (kind, id, title, options = {}) => {
        const route = resolveDetailRoute(kind);
        const numericId = normalizeId(id);
        if (!route || numericId <= 0) return 'index.html';

        if (!isLocalUiContext()) {
            const slug = slugify(title, route.fallbackSlug);
            const prettyPath = `/${route.prettyPrefix}/${numericId}/${slug}`;
            if (options.preserveApiMode !== false) {
                const apiMode = currentApiMode();
                if (apiMode) {
                    return `${prettyPath}?api=${encodeURIComponent(apiMode)}`;
                }
            }
            return prettyPath;
        }

        const params = new URLSearchParams();
        params.set(route.queryKey, String(numericId));
        params.set('slug', slugify(title, route.fallbackSlug));

        if (options.preserveApiMode !== false) {
            const apiMode = currentApiMode();
            if (apiMode) params.set('api', apiMode);
        }

        return `${route.file}?${params.toString()}`;
    };

    const buildDetailPath = (kind, id, title, options = {}) => buildPrettyPath(kind, id, title, options);

    const buildStandalonePath = (name, options = {}) => {
        const key = cleanText(name).toLowerCase();
        const file = STANDALONE_ROUTE_MAP[key];
        if (!file) return 'index.html';

        if (!isLocalUiContext()) {
            const routePath = `/${file}`;
            if (options.preserveApiMode !== false) {
                const apiMode = currentApiMode();
                if (apiMode) {
                    return `${routePath}?api=${encodeURIComponent(apiMode)}`;
                }
            }
            return routePath;
        }

        const params = new URLSearchParams();
        if (options.preserveApiMode !== false) {
            const apiMode = currentApiMode();
            if (apiMode) params.set('api', apiMode);
        }
        const query = params.toString();
        return query ? `${file}?${query}` : file;
    };

    const buildCanonicalUrl = (kind, id, title) => buildUrl(buildPrettyPath(kind, id, title, { preserveApiMode: false }));

    const buildShareUrl = (kind, id, title) => {
        const route = resolveDetailRoute(kind);
        const numericId = normalizeId(id);
        if (!route || numericId <= 0) return buildCanonicalUrl(kind, id, title);
        const slug = slugify(title, route.fallbackSlug);
        return `${SHARE_SITE_URL}/${route.shareKind}/${numericId}/${slug}`;
    };

    const replaceDetailHistory = (kind, id, title) => {
        if (!window.history || typeof window.history.replaceState !== 'function') return;
        const nextRelativeUrl = buildDetailPath(kind, id, title);
        const nextAbsoluteUrl = new URL(nextRelativeUrl, window.location.href);
        const currentAbsoluteUrl = new URL(window.location.href);
        if (nextAbsoluteUrl.pathname === currentAbsoluteUrl.pathname && nextAbsoluteUrl.search === currentAbsoluteUrl.search) {
            return;
        }
        window.history.replaceState({}, '', `${nextRelativeUrl}${window.location.hash || ''}`);
    };

    const ensureGlobalFeedNavLink = () => {
        const navLists = document.querySelectorAll('.sv-nav .nav');
        if (!navLists.length) return;

        const feedHref = buildStandalonePath('feed');
        const onFeedPage = currentFileName() === 'feed.html';

        navLists.forEach((navList) => {
            Array.from(navList.querySelectorAll('a.nav-link')).forEach((candidate) => {
                const label = cleanText(candidate.textContent).toLowerCase();
                if (label === 'sự kiện & lễ hội') {
                    candidate.textContent = 'Sự Kiện';
                    return;
                }
                if (label === 'bản đồ thuê nhà') {
                    candidate.textContent = 'Nhà Cửa';
                    return;
                }
                if (label === 'khám phá paris') {
                    candidate.textContent = 'Paris';
                    return;
                }
                if (label === 'liên hệ') {
                    const navItem = candidate.closest('.nav-item');
                    if (navItem && navItem.parentNode === navList) {
                        navItem.remove();
                    }
                }
            });

            let link = navList.querySelector('a[data-svp-nav-feed="true"]');
            if (!link) {
                link = Array.from(navList.querySelectorAll('a.nav-link'))
                    .find((candidate) => cleanText(candidate.textContent).toLowerCase() === 'bảng tin');
            }

            if (!link) {
                const listItem = document.createElement('li');
                listItem.className = 'nav-item';
                link = document.createElement('a');
                link.className = 'nav-link';
                link.textContent = 'Bảng Tin';
                link.setAttribute('data-svp-nav-feed', 'true');
                listItem.appendChild(link);
                const homeLink = Array.from(navList.querySelectorAll('a.nav-link'))
                    .find((candidate) => cleanText(candidate.textContent).toLowerCase() === 'trang chủ');
                const homeItem = homeLink ? homeLink.closest('.nav-item') : null;
                if (homeItem && homeItem.parentNode === navList) {
                    navList.insertBefore(listItem, homeItem);
                } else {
                    navList.insertBefore(listItem, navList.firstElementChild || null);
                }
            } else {
                link.setAttribute('data-svp-nav-feed', 'true');
                link.textContent = 'Bảng Tin';
            }

            const feedItem = link.closest('.nav-item');
            const homeLink = Array.from(navList.querySelectorAll('a.nav-link'))
                .find((candidate) => cleanText(candidate.textContent).toLowerCase() === 'trang chủ');
            const homeItem = homeLink ? homeLink.closest('.nav-item') : null;
            if (feedItem && homeItem && feedItem.parentNode === navList && homeItem.parentNode === navList && feedItem !== homeItem) {
                navList.insertBefore(feedItem, homeItem);
            }

            link.setAttribute('href', feedHref);
            link.classList.toggle('active', onFeedPage);

            let parisLink = Array.from(navList.querySelectorAll('a.nav-link'))
                .find((candidate) => cleanText(candidate.textContent).toLowerCase() === 'paris');
            if (!parisLink) {
                parisLink = Array.from(navList.querySelectorAll('a.nav-link'))
                    .find((candidate) => {
                        const href = cleanText(candidate.getAttribute('href') || '').toLowerCase();
                        return href === 'ban-do-paris.html' || href.endsWith('/ban-do-paris.html');
                    });
            }
            if (!parisLink) {
                const listItem = document.createElement('li');
                listItem.className = 'nav-item';
                parisLink = document.createElement('a');
                parisLink.className = 'nav-link';
                parisLink.textContent = 'Paris';
                parisLink.setAttribute('href', 'ban-do-paris.html');
                listItem.appendChild(parisLink);

                const eventLink = Array.from(navList.querySelectorAll('a.nav-link'))
                    .find((candidate) => cleanText(candidate.textContent).toLowerCase() === 'sự kiện');
                const eventItem = eventLink ? eventLink.closest('.nav-item') : null;
                if (eventItem && eventItem.nextSibling) {
                    navList.insertBefore(listItem, eventItem.nextSibling);
                } else if (eventItem && eventItem.parentNode === navList) {
                    navList.appendChild(listItem);
                } else {
                    navList.appendChild(listItem);
                }
            } else {
                parisLink.textContent = 'Paris';
            }
        });
    };

    const installEarlyNavNormalizer = () => {
        if (document.querySelector('.sv-nav .nav')) {
            ensureGlobalFeedNavLink();
            return;
        }
        const root = document.documentElement;
        if (!root || typeof MutationObserver === 'undefined') {
            return;
        }
        const observer = new MutationObserver(() => {
            if (!document.querySelector('.sv-nav .nav')) {
                return;
            }
            ensureGlobalFeedNavLink();
            observer.disconnect();
        });
        observer.observe(root, { childList: true, subtree: true });
    };

    const buildWebPageSchema = (config) => compactObject({
        '@context': 'https://schema.org',
        '@type': config.schemaType || 'WebPage',
        '@id': `${config.url}#webpage`,
        url: config.url,
        name: config.title,
        headline: config.title,
        description: config.description,
        inLanguage: 'vi',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        primaryImageOfPage: config.image ? {
            '@type': 'ImageObject',
            url: config.image
        } : undefined
    });

    const PAGE_PRESETS = {
        'index.html': {
            title: 'Diễn đàn Sinh viên & Tri thức Việt tại Pháp ',
            description: DEFAULT_DESCRIPTION,
            path: '/',
            type: 'website',
            schemaType: 'WebPage'
        },
        'forum.html': {
            title: 'Diễn đàn sinh viên và tri thức Việt tại Pháp',
            description: 'Không gian thảo luận cho sinh viên và cộng đồng tri thức Việt tại Pháp về du học, việc làm, nhà ở, thủ tục và đời sống.',
            url: 'https://www.svpforum.fr/forum.html',
            path: '/forum.html',
            schemaType: 'CollectionPage',
            image: 'https://www.svpforum.fr/assets/icons/og_forum_viet_tri_thuc.png',
            imageType: 'image/png',
            imageWidth: '1200',
            imageHeight: '630'
        },
        'categories.html': {
            title: 'Chuyên mục du học, việc làm và cuộc sống tại Pháp - SVP',
            description: 'Khám phá các chuyên mục nổi bật của SVP về học tập, việc làm, nhà ở, pháp lý và văn hóa tại Pháp.',
            path: '/categories.html',
            schemaType: 'CollectionPage'
        },
        'ban-do-thue-nha.html': {
            title: 'Bản đồ thuê nhà cho sinh viên Việt tại Pháp - SVP',
            description: 'Tìm nhà theo bản đồ, xem giá trực tiếp trên pin và lọc theo CAF, colocation, ga gần nhà tại Pháp.',
            path: '/ban-do-thue-nha.html',
            schemaType: 'CollectionPage',
            image: '/assets/icons/og_housing_map.png',
            imageType: 'image/png',
            imageWidth: '1200',
            imageHeight: '630'
        },
        'housing_form.html': {
            title: 'Đăng tin thuê nhà gần đúng trên bản đồ - SVP',
            description: 'Đăng tin thuê nhà với vị trí gần đúng, transit khai báo thủ công và thông tin hữu ích cho người thuê tại Pháp.',
            path: '/housing_form.html',
            schemaType: 'WebPage'
        },
        'housing_detail.html': {
            title: 'Chi tiết tin thuê nhà - SVP',
            description: 'Xem chi tiết tin thuê nhà trên SVP: giá, ảnh, khu vực gần đúng, ga gần nhà và thông tin liên hệ.',
            path: '/housing_detail.html',
            schemaType: 'WebPage',
            image: '/assets/icons/og_housing_map.png',
            imageType: 'image/png',
            imageWidth: '1200',
            imageHeight: '630'
        },
        'events.html': {
            title: 'Các sự kiện văn hóa và lễ hội sắp tới tại Paris',
            description: 'Khám phá lịch lễ hội, triển lãm, concert và hoạt động văn hóa sắp tới tại Paris dành cho sinh viên, du học sinh và cộng đồng Việt.',
            url: 'https://www.svpforum.fr/events.html',
            path: '/events.html',
            schemaType: 'CollectionPage',
            image: 'https://www.svpforum.fr/assets/icons/og_events_paris.png',
            imageType: 'image/png',
            imageWidth: '1200',
            imageHeight: '630'
        },
        'about.html': {
            title: 'Giới thiệu SVP Forum và cộng đồng tri thức Việt tại Pháp',
            description: 'Tìm hiểu sứ mệnh, định hướng và giá trị cộng đồng của Diễn đàn Sinh viên và Tri thức Việt tại Pháp.',
            path: '/about.html',
            schemaType: 'AboutPage'
        },
        'contact.html': {
            title: 'Liên hệ SVP Forum',
            description: 'Liên hệ với SVP Forum để kết nối hợp tác, đóng góp nội dung hoặc gửi phản hồi cho cộng đồng.',
            path: '/contact.html',
            schemaType: 'ContactPage'
        },
        'ban-do-paris.html': {
            title: 'Khám Phá Paris và di tích lịch sử - SVP',
            description: 'Khám phá Khám Phá Paris, các điểm đến lịch sử và thông tin hữu ích dành cho người Việt tại Pháp.',
            path: '/ban-do-paris.html'
        },
        'ban-do-viet.html': {
            title: 'Bản đồ cộng đồng người Việt tại Pháp - SVP',
            description: 'Tra cứu địa điểm, kết nối cộng đồng và thông tin hữu ích cho người Việt sinh sống, học tập tại Pháp.',
            path: '/ban-do-viet.html'
        },
        'security.html': {
            title: 'Bảo mật tài khoản và dữ liệu - SVP',
            description: 'Thông tin về bảo mật, an toàn tài khoản và cách SVP Forum xử lý dữ liệu người dùng.',
            path: '/security.html'
        },
        'terms.html': {
            title: 'Điều khoản sử dụng - SVP Forum',
            description: 'Xem điều khoản sử dụng, quyền và nghĩa vụ khi tham gia Diễn đàn Sinh viên và Tri thức Việt tại Pháp.',
            path: '/terms.html'
        },
        'minhanh.html': {
            title: 'Minh Anh | Blog Văn Học',
            description: 'Không gian blog văn học với các bài viết, cảm nhận và nội dung sáng tác của Minh Anh.',
            path: '/minhanh.html'
        },
        'post_detail.html': {
            title: 'Bài viết - SVP',
            description: 'Đọc bài viết và nội dung chia sẻ từ cộng đồng SVP Forum.',
            path: '/post_detail.html',
            type: 'article'
        },
        'event_detail.html': {
            title: 'Chi tiết sự kiện - SVP',
            description: 'Thông tin chi tiết về sự kiện, lịch trình và cách tham gia cùng cộng đồng SVP.',
            path: '/event_detail.html'
        },
        'thread.html': {
            title: 'Chi tiết chủ đề - SVP Forum',
            description: 'Tham gia thảo luận và theo dõi các chủ đề nổi bật trong cộng đồng SVP Forum.',
            path: '/thread.html',
            type: 'article'
        },
        'login.html': {
            title: 'Đăng Nhập - SVP',
            description: 'Đăng nhập vào tài khoản SVP Forum.',
            path: '/login.html',
            robots: PRIVATE_ROBOTS,
            noindex: true,
            schema: false
        },
        'signup.html': {
            title: 'Đăng Ký - SVP',
            description: 'Tạo tài khoản mới trên SVP Forum.',
            path: '/signup.html',
            robots: PRIVATE_ROBOTS,
            noindex: true,
            schema: false
        },
        'profile.html': {
            title: 'Hồ sơ thành viên - SVP',
            description: 'Trang hồ sơ thành viên của SVP Forum.',
            path: '/profile.html',
            robots: PRIVATE_ROBOTS,
            noindex: true,
            schema: false
        },
        'feed.html': {
            title: 'Bảng tin cá nhân - SVP',
            description: 'Bảng tin cá nhân hóa của SVP, tổng hợp các cập nhật mới nhất dành cho thành viên đã đăng nhập.',
            path: '/feed.html',
            robots: PRIVATE_ROBOTS,
            noindex: true,
            schema: false
        },
        'admin_dashboard.html': {
            title: 'Superadmin Dashboard - SVP',
            description: 'Trang quản trị nội bộ của SVP.',
            path: '/admin_dashboard.html',
            robots: PRIVATE_ROBOTS,
            noindex: true,
            schema: false
        },
        'create_new_article.html': {
            title: 'Tạo bài viết mới - SVP',
            description: 'Công cụ đăng bài viết nội bộ của SVP Forum.',
            path: '/create_new_article.html',
            robots: PRIVATE_ROBOTS,
            noindex: true,
            schema: false
        },
        'create_new_discussion.html': {
            title: 'Tạo chủ đề mới - SVP',
            description: 'Công cụ tạo chủ đề thảo luận nội bộ của SVP Forum.',
            path: '/create_new_discussion.html',
            robots: PRIVATE_ROBOTS,
            noindex: true,
            schema: false
        },
        'create_new_event.html': {
            title: 'Tạo sự kiện mới - SVP',
            description: 'Công cụ tạo sự kiện nội bộ của SVP Forum.',
            path: '/create_new_event.html',
            robots: PRIVATE_ROBOTS,
            noindex: true,
            schema: false
        },
        'auth_magic_link_callback.html': {
            title: 'Xác thực đăng nhập - SVP',
            description: 'Trang callback xác thực đăng nhập của SVP Forum.',
            path: '/auth_magic_link_callback.html',
            robots: PRIVATE_ROBOTS,
            noindex: true,
            schema: false
        },
        'article_publish_verify_callback.html': {
            title: 'Xác thực đăng bài - SVP',
            description: 'Trang callback xác thực đăng bài của SVP Forum.',
            path: '/article_publish_verify_callback.html',
            robots: PRIVATE_ROBOTS,
            noindex: true,
            schema: false
        }
    };

    const resolveSchemas = (config) => {
        if (config.schema === false) return [];
        const schemas = [];
        schemas.push(buildWebPageSchema(config));
        const extraSchemas = typeof config.extraSchemas === 'function' ? config.extraSchemas(config) : config.extraSchemas;
        if (Array.isArray(extraSchemas)) {
            schemas.push(...extraSchemas.filter(Boolean));
        } else if (extraSchemas) {
            schemas.push(extraSchemas);
        }
        return schemas;
    };

    const setPage = (overrides = {}) => {
        const preset = PAGE_PRESETS[currentFileName()] || {};
        const merged = {
            title: cleanText(document.title || SITE_NAME),
            description: DEFAULT_DESCRIPTION,
            path: `/${currentFileName()}`,
            type: 'website',
            robots: PUBLIC_ROBOTS,
            themeColor: DEFAULT_THEME_COLOR,
            schemaType: 'WebPage',
            image: DEFAULT_IMAGE,
            ...preset,
            ...overrides
        };

        const finalUrl = buildUrl(merged.url || merged.path || window.location.pathname || '/');
        const finalTitle = cleanText(merged.title || SITE_NAME) || SITE_NAME;
        const finalDescription = excerpt(merged.description || DEFAULT_DESCRIPTION, 180) || DEFAULT_DESCRIPTION;
        const finalImage = buildUrl(merged.image || DEFAULT_IMAGE);
        const finalImageType = cleanText(merged.imageType || (finalImage === DEFAULT_IMAGE ? 'image/png' : ''));
        const finalImageWidth = cleanText(merged.imageWidth || (finalImage === DEFAULT_IMAGE ? '1024' : ''));
        const finalImageHeight = cleanText(merged.imageHeight || (finalImage === DEFAULT_IMAGE ? '1024' : ''));
        const finalRobots = merged.noindex ? PRIVATE_ROBOTS : cleanText(merged.robots || PUBLIC_ROBOTS);
        const ogType = cleanText(merged.type || 'website');

        document.title = finalTitle;
        setMeta('name', 'description', finalDescription);
        setMeta('name', 'robots', finalRobots);
        setMeta('name', 'googlebot', finalRobots);
        setMeta('name', 'author', SITE_NAME);
        setMeta('name', 'theme-color', merged.themeColor || DEFAULT_THEME_COLOR);
        setMeta('property', 'og:locale', 'vi_VN');
        setMeta('property', 'og:site_name', SITE_NAME);
        setMeta('property', 'og:type', ogType);
        setMeta('property', 'og:title', finalTitle);
        setMeta('property', 'og:description', finalDescription);
        setMeta('property', 'og:url', finalUrl);
        setMeta('property', 'og:image', finalImage);
        setMeta('property', 'og:image:secure_url', finalImage);
        setMeta('property', 'og:image:alt', finalTitle);
        setMeta('name', 'twitter:card', 'summary_large_image');
        setMeta('name', 'twitter:title', finalTitle);
        setMeta('name', 'twitter:description', finalDescription);
        setMeta('name', 'twitter:image', finalImage);
        setLink('canonical', finalUrl);

        if (finalImageType) {
            setMeta('property', 'og:image:type', finalImageType);
        } else {
            removeMeta('property', 'og:image:type');
        }
        if (finalImageWidth) {
            setMeta('property', 'og:image:width', finalImageWidth);
        } else {
            removeMeta('property', 'og:image:width');
        }
        if (finalImageHeight) {
            setMeta('property', 'og:image:height', finalImageHeight);
        } else {
            removeMeta('property', 'og:image:height');
        }

        if (merged.publishedTime) {
            setMeta('property', 'article:published_time', merged.publishedTime);
        } else {
            removeMeta('property', 'article:published_time');
        }

        if (merged.modifiedTime) {
            setMeta('property', 'article:modified_time', merged.modifiedTime);
            setMeta('property', 'og:updated_time', merged.modifiedTime);
        } else {
            removeMeta('property', 'article:modified_time');
            removeMeta('property', 'og:updated_time');
        }

        if (merged.section) {
            setMeta('property', 'article:section', merged.section);
        } else {
            removeMeta('property', 'article:section');
        }

        setStructuredData(resolveSchemas({
            ...merged,
            url: finalUrl,
            title: finalTitle,
            description: finalDescription,
            image: finalImage
        }));
    };

    window.SVPSeo = {
        siteUrl: SITE_URL,
        siteName: SITE_NAME,
        defaultImage: DEFAULT_IMAGE,
        publicRobots: PUBLIC_ROBOTS,
        privateRobots: PRIVATE_ROBOTS,
        absoluteUrl: buildUrl,
        htmlToText,
        excerpt,
        compactObject,
        setStructuredData,
        urls: {
            slugify,
            buildPrettyPath,
            buildDetailPath,
            buildStandalonePath,
            buildCanonicalUrl,
            buildShareUrl,
            parsePrettyRoute,
            replaceDetailHistory
        },
        setPage
    };

    ensureDocumentBase();
    setPage();
    if (document.readyState === 'loading') {
        installEarlyNavNormalizer();
        document.addEventListener('DOMContentLoaded', ensureGlobalFeedNavLink, { once: true });
    } else {
        ensureGlobalFeedNavLink();
    }
})();
