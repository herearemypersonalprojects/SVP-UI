(function () {
    const SITE_URL = String(window.SVP_PUBLIC_SITE_URL || 'https://svpforum.fr').replace(/\/+$/g, '');
    const SHARE_SITE_URL = String(window.SVP_SHARE_BASE_URL || 'https://share.svpforum.fr').replace(/\/+$/g, '');
    const SITE_NAME = 'SVP Forum';
    const DEFAULT_IMAGE = `${SITE_URL}/assets/icons/logo_svp.png`;
    const DEFAULT_DESCRIPTION = 'Diễn đàn Sinh viên & Tri thức Việt tại Pháp (SVP) - nơi kết nối, chia sẻ kiến thức, sự kiện và cộng đồng người Việt tại Pháp.';
    const PUBLIC_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
    const PRIVATE_ROBOTS = 'noindex,nofollow,noarchive';
    const DEFAULT_THEME_COLOR = '#1d4ed8';
    const DETAIL_ROUTE_MAP = {
        article: { file: 'post_detail.html', queryKey: 'postId', shareKind: 'article', prettyPrefix: 'bai-viet', fallbackSlug: 'bai-viet' },
        thread: { file: 'thread.html', queryKey: 'postId', shareKind: 'thread', prettyPrefix: 'chu-de', fallbackSlug: 'chu-de' },
        event: { file: 'event_detail.html', queryKey: 'eventId', shareKind: 'event', prettyPrefix: 'su-kien', fallbackSlug: 'su-kien' }
    };
    const head = document.head;

    if (!head) return;

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

    const isFileUiContext = () => String(window.location.protocol || '').toLowerCase() === 'file:';

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

        if (!isFileUiContext()) {
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
            title: 'Diễn đàn Sinh viên & Tri thức Việt tại Pháp (SVP)',
            description: DEFAULT_DESCRIPTION,
            path: '/',
            type: 'website',
            schemaType: 'WebPage'
        },
        'forum.html': {
            title: 'Diễn đàn người Việt tại Pháp | Thảo luận du học, việc làm, đời sống - SVP',
            description: 'Tham gia diễn đàn SVP để trao đổi về du học, việc làm, nhà ở, thủ tục và cuộc sống tại Pháp.',
            path: '/forum.html',
            schemaType: 'CollectionPage'
        },
        'categories.html': {
            title: 'Chuyên mục du học, việc làm và cuộc sống tại Pháp - SVP',
            description: 'Khám phá các chuyên mục nổi bật của SVP về học tập, việc làm, nhà ở, pháp lý và văn hóa tại Pháp.',
            path: '/categories.html',
            schemaType: 'CollectionPage'
        },
        'events.html': {
            title: 'Sự kiện cộng đồng, giao lưu và hội thảo người Việt tại Pháp - SVP',
            description: 'Theo dõi lịch sự kiện, giao lưu, hội thảo và hoạt động cộng đồng dành cho người Việt tại Pháp.',
            path: '/events.html',
            schemaType: 'CollectionPage'
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
            title: 'Bản đồ Paris và di tích lịch sử - SVP',
            description: 'Khám phá bản đồ Paris, các điểm đến lịch sử và thông tin hữu ích dành cho người Việt tại Pháp.',
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

        if (finalImage === DEFAULT_IMAGE) {
            setMeta('property', 'og:image:type', 'image/png');
            setMeta('property', 'og:image:width', '1536');
            setMeta('property', 'og:image:height', '1024');
        } else {
            removeMeta('property', 'og:image:type');
            removeMeta('property', 'og:image:width');
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
            buildCanonicalUrl,
            buildShareUrl,
            parsePrettyRoute,
            replaceDetailHistory
        },
        setPage
    };

    setPage();
})();
