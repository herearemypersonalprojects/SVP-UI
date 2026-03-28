(function () {
    'use strict';

    if (window.SVPRichContent) {
        return;
    }

    const SAFE_FIGURE_CLASSES = new Set(['image', 'sv-embed-video-block']);
    const SAFE_DIV_CLASSES = new Set(['sv-embed-video', 'image-row']);
    const GOOGLE_DRIVE_IFRAME_TITLE = 'Google Drive video';
    const GOOGLE_DRIVE_IFRAME_ALLOW = 'autoplay; fullscreen; picture-in-picture';
    const GLOBAL_STYLE_ID = 'svp-rich-content-style';
    const PORTRAIT_ROW_CLASS = 'svp-portrait-row';
    const PORTRAIT_ROW_ITEM_CLASS = 'svp-portrait-row__item';
    const PORTRAIT_LAYOUT_OBSERVED_ATTR = 'data-svp-portrait-layout-observed';
    const PORTRAIT_ROW_MAX_COLUMNS = 3;
    const PORTRAIT_DRAGGING_CLASS = 'svp-portrait-row__item--dragging';
    const portraitSortBindingMap = new WeakMap();
    const GLOBAL_EMBED_CSS = `
        .sv-embed-video-block {
            margin: 1rem 0;
        }
        .sv-embed-video {
            position: relative;
            width: 100%;
            padding-top: 56.25%;
            border-radius: 12px;
            overflow: hidden;
            background: #0f172a;
        }
        .sv-embed-video iframe {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            border: 0;
        }
        .image-row,
        .svp-portrait-row {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            margin: 1rem 0;
            flex-wrap: wrap;
        }
        .image-row > img,
        .image-row > figure,
        .image-row > p,
        .image-row > div:not(.sv-embed-video) {
            flex: 1 1 0;
            min-width: 0;
            margin: 0 !important;
        }
        .svp-portrait-row > .svp-portrait-row__item {
            flex: var(--svp-portrait-ratio, 1) 1 0;
            min-width: 0;
            margin: 0 !important;
            cursor: grab;
        }
        .svp-portrait-row > .svp-portrait-row__item--dragging {
            opacity: .55;
            cursor: grabbing;
        }
        .image-row > img,
        .image-row > figure img,
        .image-row > p img,
        .image-row > div img,
        .svp-portrait-row > .svp-portrait-row__item > img,
        .svp-portrait-row > .svp-portrait-row__item img {
            display: block;
            width: 100%;
            height: auto;
            margin: 0;
        }
        .image-row > figure figcaption,
        .svp-portrait-row > .svp-portrait-row__item figcaption {
            margin-top: .45rem;
        }
        .svp-image-row-cover {
            display: grid;
            grid-template-columns: repeat(var(--svp-image-row-count, 2), minmax(0, 1fr));
            gap: 4px;
            overflow: hidden;
            background: #dbeafe;
        }
        .svp-image-row-cover > img {
            display: block;
            width: 100%;
            height: 100%;
            min-width: 0;
            object-fit: cover;
            background: #e2e8f0;
        }
        @media (max-width: 575px) {
            .image-row,
            .svp-portrait-row {
                gap: 10px;
            }
            .image-row > img,
            .image-row > figure,
            .image-row > p,
            .image-row > div:not(.sv-embed-video),
            .svp-portrait-row > .svp-portrait-row__item {
                flex-basis: 100%;
            }
        }
    `;

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const injectGlobalStyles = () => {
        if (typeof document === 'undefined' || !document.head || document.getElementById(GLOBAL_STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = GLOBAL_STYLE_ID;
        style.textContent = GLOBAL_EMBED_CSS;
        document.head.appendChild(style);
    };

    const normalizeHttpUrl = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }
        try {
            const parsed = new URL(raw, window.location.href);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return '';
            }
            return parsed.toString();
        } catch (_) {
            return '';
        }
    };

    const normalizeSafeHref = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }
        if (raw.startsWith('mailto:')) {
            return raw;
        }
        return normalizeHttpUrl(raw);
    };

    const filterClassNames = (value, allowedSet) => String(value || '')
        .split(/\s+/)
        .map((item) => item.trim())
        .filter((item) => item && allowedSet.has(item))
        .join(' ');

    const extractGoogleDriveFileId = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }
        if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) {
            return raw;
        }
        const safeUrl = normalizeHttpUrl(raw);
        if (!safeUrl) {
            return '';
        }
        try {
            const parsed = new URL(safeUrl);
            const host = parsed.hostname.toLowerCase();
            if (host !== 'drive.google.com' && host !== 'docs.google.com') {
                return '';
            }
            const pathMatch = parsed.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
            if (pathMatch && pathMatch[1]) {
                return pathMatch[1];
            }
            const queryId = String(parsed.searchParams.get('id') || '').trim();
            if (/^[A-Za-z0-9_-]{10,}$/.test(queryId)) {
                return queryId;
            }
            return '';
        } catch (_) {
            return '';
        }
    };

    const toGoogleDrivePreviewUrl = (value) => {
        const fileId = extractGoogleDriveFileId(value);
        return fileId ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview` : '';
    };

    const toGoogleDriveImageUrl = (value) => {
        const fileId = extractGoogleDriveFileId(value);
        return fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600` : '';
    };

    const normalizeGoogleDriveIframeSrc = (value) => {
        const fileId = extractGoogleDriveFileId(value);
        if (!fileId) {
            return '';
        }
        const safeUrl = normalizeHttpUrl(value);
        if (!safeUrl) {
            return '';
        }
        try {
            const parsed = new URL(safeUrl);
            const host = parsed.hostname.toLowerCase();
            const isGoogleDriveHost = host === 'drive.google.com' || host === 'docs.google.com';
            const isPreviewPath = /\/file\/d\/[A-Za-z0-9_-]+\/preview\/?$/i.test(parsed.pathname);
            if (!isGoogleDriveHost || !isPreviewPath) {
                return '';
            }
            return toGoogleDrivePreviewUrl(fileId);
        } catch (_) {
            return '';
        }
    };

    const buildGoogleDriveEmbedHtml = (options = {}) => {
        const type = String(options.type || '').trim().toLowerCase();
        const caption = String(options.caption || '').trim().slice(0, 300);
        const captionHtml = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : '';
        if (type === 'image') {
            const imageUrl = toGoogleDriveImageUrl(options.url);
            if (!imageUrl) {
                return '';
            }
            const titleAttr = caption ? ` title="${escapeHtml(caption)}"` : '';
            return `<figure class="image"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(caption)}"${titleAttr}>${captionHtml}</figure>`;
        }
        if (type === 'video') {
            const previewUrl = toGoogleDrivePreviewUrl(options.url);
            if (!previewUrl) {
                return '';
            }
            const title = caption || GOOGLE_DRIVE_IFRAME_TITLE;
            return `<figure class="sv-embed-video-block"><div class="sv-embed-video"><iframe src="${escapeHtml(previewUrl)}" title="${escapeHtml(title)}" allow="${GOOGLE_DRIVE_IFRAME_ALLOW}" allowfullscreen loading="lazy" referrerpolicy="no-referrer"></iframe></div>${captionHtml}</figure>`;
        }
        return '';
    };

    const withTagNames = (items = []) => new Set(items.map((item) => String(item || '').toLowerCase()).filter(Boolean));

    const sanitizeHtml = (value, options = {}) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }

        const allowedTags = withTagNames(options.allowedTags || []);
        const blockedTags = withTagNames([
            'script', 'style', 'object', 'embed', 'form',
            'input', 'button', 'textarea', 'select', 'option', 'link', 'meta',
            'picture', 'source', 'svg', 'canvas'
        ]);
        const allowGoogleDriveEmbeds = Boolean(options.allowGoogleDriveEmbeds);
        const allowedFigureClasses = options.allowedFigureClasses instanceof Set
            ? options.allowedFigureClasses
            : SAFE_FIGURE_CLASSES;
        const allowedDivClasses = options.allowedDivClasses instanceof Set
            ? options.allowedDivClasses
            : SAFE_DIV_CLASSES;

        const template = document.createElement('template');
        template.innerHTML = raw;

        const sanitizeNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return escapeHtml(node.textContent || '');
            }
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }

            const tag = String(node.nodeName || '').toLowerCase();
            if (blockedTags.has(tag)) {
                return '';
            }
            if (tag === 'iframe') {
                if (!allowGoogleDriveEmbeds || !allowedTags.has('iframe')) {
                    return '';
                }
                const src = normalizeGoogleDriveIframeSrc(node.getAttribute('src') || '');
                if (!src) {
                    return '';
                }
                const title = String(node.getAttribute('title') || '').trim() || GOOGLE_DRIVE_IFRAME_TITLE;
                return `<iframe src="${escapeHtml(src)}" title="${escapeHtml(title)}" allow="${GOOGLE_DRIVE_IFRAME_ALLOW}" allowfullscreen loading="lazy" referrerpolicy="no-referrer"></iframe>`;
            }

            const childrenHtml = Array.from(node.childNodes).map((child) => sanitizeNode(child)).join('');
            if (!allowedTags.has(tag)) {
                return childrenHtml;
            }
            if (tag === 'br') {
                return '<br>';
            }
            if (tag === 'a') {
                const href = normalizeSafeHref(node.getAttribute('href'));
                const attrs = href
                    ? ` href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"`
                    : '';
                return `<a${attrs}>${childrenHtml}</a>`;
            }
            if (tag === 'img') {
                const src = normalizeHttpUrl(node.getAttribute('src') || '');
                if (!src) {
                    return '';
                }
                const alt = escapeHtml(node.getAttribute('alt') || '');
                const title = escapeHtml(node.getAttribute('title') || '');
                const titleAttr = title ? ` title="${title}"` : '';
                return `<img src="${escapeHtml(src)}" alt="${alt}"${titleAttr}>`;
            }
            if (tag === 'figure') {
                const safeClasses = filterClassNames(node.getAttribute('class') || '', allowedFigureClasses);
                const classAttr = safeClasses ? ` class="${escapeHtml(safeClasses)}"` : '';
                return `<figure${classAttr}>${childrenHtml}</figure>`;
            }
            if (tag === 'div') {
                const safeClasses = filterClassNames(node.getAttribute('class') || '', allowedDivClasses);
                const classAttr = safeClasses ? ` class="${escapeHtml(safeClasses)}"` : '';
                return `<div${classAttr}>${childrenHtml}</div>`;
            }
            return `<${tag}>${childrenHtml}</${tag}>`;
        };

        return Array.from(template.content.childNodes).map((node) => sanitizeNode(node)).join('').trim();
    };

    const htmlToPlainText = (value) => {
        const template = document.createElement('template');
        template.innerHTML = String(value || '').trim();
        return String(template.content.textContent || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const findLeadingElement = (root) => {
        if (!root || !root.childNodes) {
            return null;
        }
        for (const child of Array.from(root.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
                if (String(child.textContent || '').replace(/\u00a0/g, ' ').trim()) {
                    return null;
                }
                continue;
            }
            if (child.nodeType === Node.ELEMENT_NODE) {
                return child;
            }
        }
        return null;
    };

    const extractLeadingImageRowUrls = (value, options = {}) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return [];
        }
        const template = document.createElement('template');
        template.innerHTML = raw;
        const firstElement = findLeadingElement(template.content);
        if (!(firstElement instanceof HTMLElement) || !firstElement.matches('div.image-row')) {
            return [];
        }
        const maxItems = Math.max(2, Number(options.maxItems || 4));
        const urls = [];
        Array.from(firstElement.querySelectorAll('img[src]')).forEach((image) => {
            if (urls.length >= maxItems) {
                return;
            }
            const safeUrl = normalizeHttpUrl(image.getAttribute('src') || '');
            if (safeUrl) {
                urls.push(safeUrl);
            }
        });
        return urls.length >= 2 ? urls : [];
    };

    const buildImageRowCoverHtml = (options = {}) => {
        const urls = Array.isArray(options.imageUrls)
            ? options.imageUrls.map((item) => normalizeHttpUrl(item)).filter(Boolean)
            : [];
        if (urls.length < 2) {
            return '';
        }
        const maxItems = Math.max(2, Number(options.maxItems || urls.length));
        const visibleUrls = urls.slice(0, maxItems);
        const tagName = String(options.tagName || (options.href ? 'a' : 'div')).trim().toLowerCase() === 'div'
            ? 'div'
            : 'a';
        const classNames = ['svp-image-row-cover']
            .concat(String(options.className || '').split(/\s+/).map((item) => item.trim()).filter(Boolean))
            .join(' ');
        const attrs = [`class="${escapeHtml(classNames)}"`];
        if (tagName === 'a') {
            const href = normalizeSafeHref(options.href || '');
            if (!href) {
                return '';
            }
            attrs.push(`href="${escapeHtml(href)}"`);
        }
        const tabIndex = options.tabIndex;
        if (Number.isInteger(tabIndex)) {
            attrs.push(`tabindex="${tabIndex}"`);
        }
        if (options.ariaHidden === true) {
            attrs.push('aria-hidden="true"');
        }
        const ariaLabel = String(options.ariaLabel || '').trim();
        if (ariaLabel) {
            attrs.push(`aria-label="${escapeHtml(ariaLabel)}"`);
        }
        attrs.push(`style="--svp-image-row-count:${visibleUrls.length}"`);
        const altPrefix = String(options.altPrefix || 'Preview image').trim() || 'Preview image';
        const imagesHtml = visibleUrls
            .map((url, index) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(`${altPrefix} ${index + 1}`)}" loading="lazy" decoding="async">`)
            .join('');
        return `<${tagName} ${attrs.join(' ')}>${imagesHtml}</${tagName}>`;
    };

    const normalizeInsertedImageUrl = (value) => {
        const safeUrl = normalizeHttpUrl(value);
        if (!safeUrl) {
            return '';
        }
        const driveImageUrl = toGoogleDriveImageUrl(safeUrl);
        return driveImageUrl || safeUrl;
    };

    const parseMultiImageUrls = (value) => {
        const urls = [];
        const invalidEntries = [];
        String(value || '')
            .split(/\r?\n+/)
            .map((item) => item.trim())
            .filter(Boolean)
            .forEach((item) => {
                const normalized = normalizeInsertedImageUrl(item);
                if (!normalized) {
                    invalidEntries.push(item);
                    return;
                }
                urls.push(normalized);
            });
        return { urls, invalidEntries };
    };

    const buildImageRowHtml = (imageUrls) => {
        const urls = Array.isArray(imageUrls)
            ? imageUrls.map((item) => normalizeHttpUrl(item)).filter(Boolean)
            : [];
        if (urls.length < 2) {
            return '';
        }
        const imagesHtml = urls
            .map((url, index) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(`Ảnh liên tiếp ${index + 1}`)}" loading="lazy">`)
            .join('');
        return `<div class="image-row">${imagesHtml}</div><p><br></p>`;
    };

    const cleanupPortraitRows = (root) => {
        if (!root || typeof root.querySelectorAll !== 'function') {
            return;
        }
        const wrappers = Array.from(root.querySelectorAll(`.${PORTRAIT_ROW_CLASS}`));
        wrappers.forEach((wrapper) => {
            const parent = wrapper.parentNode;
            if (!parent) {
                return;
            }
            while (wrapper.firstChild) {
                const child = wrapper.firstChild;
                if (child.nodeType === Node.ELEMENT_NODE && child.classList) {
                    child.classList.remove(PORTRAIT_ROW_ITEM_CLASS);
                    child.classList.remove(PORTRAIT_DRAGGING_CLASS);
                    child.style.removeProperty('--svp-portrait-ratio');
                    child.draggable = false;
                }
                parent.insertBefore(child, wrapper);
            }
            wrapper.remove();
        });
        Array.from(root.querySelectorAll(`.${PORTRAIT_ROW_ITEM_CLASS}`)).forEach((node) => {
            node.classList.remove(PORTRAIT_ROW_ITEM_CLASS);
            node.classList.remove(PORTRAIT_DRAGGING_CLASS);
            node.style.removeProperty('--svp-portrait-ratio');
            node.draggable = false;
        });
    };

    const cleanupPortraitLayoutHtml = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }
        const template = document.createElement('template');
        template.innerHTML = raw;
        cleanupPortraitRows(template.content);
        return template.innerHTML.trim();
    };

    const hasOnlyImageContent = (node) => {
        if (!(node instanceof HTMLElement)) {
            return false;
        }
        if (node.querySelector('iframe, video')) {
            return false;
        }
        const images = Array.from(node.querySelectorAll('img[src]'));
        if (images.length !== 1) {
            return false;
        }
        const clone = node.cloneNode(true);
        Array.from(clone.querySelectorAll('img')).forEach((image) => image.remove());
        return !String(clone.textContent || '').replace(/\u00a0/g, ' ').trim();
    };

    const getPortraitLayoutCandidate = (node) => {
        if (!(node instanceof HTMLElement) || node.classList.contains(PORTRAIT_ROW_CLASS)) {
            return null;
        }
        if (node.matches('figure') && !node.classList.contains('sv-embed-video-block')) {
            const image = node.querySelector('img[src]');
            return image ? { block: node, image } : null;
        }
        if (node.matches('img[src]')) {
            return { block: node, image: node };
        }
        if ((node.matches('p, div') && !node.classList.contains('sv-embed-video')) && hasOnlyImageContent(node)) {
            const image = node.querySelector('img[src]');
            return image ? { block: node, image } : null;
        }
        return null;
    };

    const getImageDimensions = (image) => {
        const naturalWidth = Number(image?.naturalWidth || 0);
        const naturalHeight = Number(image?.naturalHeight || 0);
        if (naturalWidth > 0 && naturalHeight > 0) {
            return { width: naturalWidth, height: naturalHeight };
        }
        const attrWidth = Number(image?.getAttribute('width') || image?.width || 0);
        const attrHeight = Number(image?.getAttribute('height') || image?.height || 0);
        return { width: attrWidth, height: attrHeight };
    };

    const splitPortraitRun = (count, maxColumns) => {
        const rows = [];
        let remaining = Number(count || 0);
        const safeMaxColumns = Math.max(2, Number(maxColumns || PORTRAIT_ROW_MAX_COLUMNS));
        while (remaining > 0) {
            if (remaining <= safeMaxColumns) {
                rows.push(remaining);
                break;
            }
            if (remaining === 4) {
                rows.push(2, 2);
                break;
            }
            if (remaining % safeMaxColumns === 1) {
                rows.push(2);
                remaining -= 2;
                continue;
            }
            rows.push(safeMaxColumns);
            remaining -= safeMaxColumns;
        }
        return rows;
    };

    const schedulePortraitRowRefresh = (root) => {
        if (!(root instanceof HTMLElement)) {
            return;
        }
        const ownerWindow = root.ownerDocument?.defaultView || window;
        if (typeof ownerWindow.requestAnimationFrame === 'function') {
            ownerWindow.requestAnimationFrame(() => {
                arrangePortraitImageRows(root);
            });
            return;
        }
        ownerWindow.setTimeout(() => arrangePortraitImageRows(root), 0);
    };

    const observePortraitImageLoad = (root, image) => {
        if (!(root instanceof HTMLElement) || !(image instanceof HTMLImageElement) || image.complete) {
            return;
        }
        if (image.getAttribute(PORTRAIT_LAYOUT_OBSERVED_ATTR) === '1') {
            return;
        }
        image.setAttribute(PORTRAIT_LAYOUT_OBSERVED_ATTR, '1');
        const refresh = () => {
            image.removeAttribute(PORTRAIT_LAYOUT_OBSERVED_ATTR);
            schedulePortraitRowRefresh(root);
        };
        image.addEventListener('load', refresh, { once: true });
        image.addEventListener('error', refresh, { once: true });
    };

    const bindPortraitRowSorting = (root, onSortChange) => {
        if (!(root instanceof HTMLElement)) {
            return;
        }
        const existing = portraitSortBindingMap.get(root);
        if (existing) {
            existing.onSortChange = typeof onSortChange === 'function' ? onSortChange : null;
            return;
        }

        const state = {
            draggedItem: null,
            sourceRow: null,
            changed: false,
            onSortChange: typeof onSortChange === 'function' ? onSortChange : null
        };

        const getRowItems = (row) => Array.from(row?.children || [])
            .filter((item) => item instanceof HTMLElement && item.classList.contains(PORTRAIT_ROW_ITEM_CLASS));

        const getDropTarget = (row, clientX) => {
            const siblings = getRowItems(row).filter((item) => item !== state.draggedItem);
            for (const item of siblings) {
                const rect = item.getBoundingClientRect();
                const midpoint = rect.left + (rect.width / 2);
                if (clientX < midpoint) {
                    return item;
                }
            }
            return null;
        };

        root.addEventListener('dragstart', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            const item = target.closest(`.${PORTRAIT_ROW_ITEM_CLASS}`);
            if (!(item instanceof HTMLElement) || item.parentElement?.classList.contains(PORTRAIT_ROW_CLASS) !== true) {
                return;
            }
            state.draggedItem = item;
            state.sourceRow = item.parentElement;
            state.changed = false;
            item.classList.add(PORTRAIT_DRAGGING_CLASS);
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                try {
                    event.dataTransfer.setData('text/plain', 'svp-portrait-image');
                } catch (_) {
                    // Ignore browsers that restrict custom drag payloads.
                }
            }
        });

        root.addEventListener('dragover', (event) => {
            if (!(state.draggedItem instanceof HTMLElement) || !(state.sourceRow instanceof HTMLElement)) {
                return;
            }
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            const row = target.closest(`.${PORTRAIT_ROW_CLASS}`);
            if (!(row instanceof HTMLElement) || row !== state.sourceRow) {
                return;
            }
            event.preventDefault();
            const dropTarget = getDropTarget(row, event.clientX);
            if (dropTarget) {
                if (dropTarget !== state.draggedItem && state.draggedItem.nextElementSibling !== dropTarget) {
                    row.insertBefore(state.draggedItem, dropTarget);
                    state.changed = true;
                }
                return;
            }
            if (row.lastElementChild !== state.draggedItem) {
                row.appendChild(state.draggedItem);
                state.changed = true;
            }
        });

        root.addEventListener('drop', (event) => {
            if (!(state.draggedItem instanceof HTMLElement)) {
                return;
            }
            event.preventDefault();
        });

        root.addEventListener('dragend', () => {
            if (!(state.draggedItem instanceof HTMLElement)) {
                return;
            }
            state.draggedItem.classList.remove(PORTRAIT_DRAGGING_CLASS);
            const didChange = state.changed;
            state.draggedItem = null;
            state.sourceRow = null;
            state.changed = false;
            if (didChange && typeof state.onSortChange === 'function') {
                state.onSortChange();
            }
        });

        portraitSortBindingMap.set(root, state);
    };

    const arrangePortraitImageRows = (root, options = {}) => {
        if (!(root instanceof HTMLElement)) {
            return;
        }
        cleanupPortraitRows(root);
        const directChildren = Array.from(root.children);
        const runs = [];
        let currentRun = [];
        directChildren.forEach((child) => {
            const candidate = getPortraitLayoutCandidate(child);
            if (!candidate) {
                if (currentRun.length >= 2) {
                    runs.push(currentRun.slice());
                }
                currentRun = [];
                return;
            }
            const dimensions = getImageDimensions(candidate.image);
            if (!(dimensions.width > 0 && dimensions.height > 0)) {
                observePortraitImageLoad(root, candidate.image);
                if (currentRun.length >= 2) {
                    runs.push(currentRun.slice());
                }
                currentRun = [];
                return;
            }
            if (dimensions.height <= dimensions.width) {
                if (currentRun.length >= 2) {
                    runs.push(currentRun.slice());
                }
                currentRun = [];
                return;
            }
            currentRun.push({
                ...candidate,
                ratio: Math.max(0.3, Math.min(1.4, dimensions.width / dimensions.height))
            });
        });
        if (currentRun.length >= 2) {
            runs.push(currentRun.slice());
        }

        const maxColumns = Math.max(2, Number(options.maxColumns || PORTRAIT_ROW_MAX_COLUMNS));
        runs.forEach((run) => {
            const rowSizes = splitPortraitRun(run.length, maxColumns);
            let cursor = 0;
            rowSizes.forEach((rowSize) => {
                if (rowSize < 2) {
                    cursor += rowSize;
                    return;
                }
                const rowItems = run.slice(cursor, cursor + rowSize);
                const firstBlock = rowItems[0]?.block;
                if (!(firstBlock instanceof HTMLElement)) {
                    cursor += rowSize;
                    return;
                }
                const wrapper = root.ownerDocument.createElement('div');
                wrapper.className = PORTRAIT_ROW_CLASS;
                root.insertBefore(wrapper, firstBlock);
                rowItems.forEach((item) => {
                    item.block.classList.add(PORTRAIT_ROW_ITEM_CLASS);
                    item.block.style.setProperty('--svp-portrait-ratio', String(item.ratio || 1));
                    item.block.draggable = Boolean(options.sortable);
                    wrapper.appendChild(item.block);
                });
                cursor += rowSize;
            });
        });
        if (options.sortable) {
            bindPortraitRowSorting(root, options.onSortChange);
        }
    };

    const hasRenderableContent = (value, options = {}) => {
        const sanitized = sanitizeHtml(value, options);
        if (!sanitized) {
            return false;
        }
        if (htmlToPlainText(sanitized)) {
            return true;
        }
        const template = document.createElement('template');
        template.innerHTML = sanitized;
        return Boolean(template.content.querySelector('img[src], iframe[src]'));
    };

    const ensureToolbarControl = (toolbar, control, anchor) => {
        const current = String(toolbar || '').trim();
        if (!current) {
            return control;
        }
        if (new RegExp(`\\b${control}\\b`).test(current)) {
            return current;
        }
        if (anchor && new RegExp(`\\b${anchor}\\b`).test(current)) {
            return current.replace(new RegExp(`\\b${anchor}\\b`), `${control} ${anchor}`);
        }
        return `${current} | ${control}`;
    };

    const ensureValidElements = (value, additions) => {
        const items = String(value || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        additions.forEach((item) => {
            if (!items.includes(item)) {
                items.push(item);
            }
        });
        return items.join(',');
    };

    const removeInvalidElement = (value, tagName) => String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item && item.toLowerCase() !== String(tagName || '').toLowerCase())
        .join(',');

    const ensureValidChildren = (value, additions) => {
        const items = String(value || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        additions.forEach((item) => {
            if (!items.includes(item)) {
                items.push(item);
            }
        });
        return items.join(',');
    };

    const openGoogleDriveDialog = (editor) => {
        editor.windowManager.open({
            title: 'Chèn ảnh hoặc video từ Google Drive',
            body: {
                type: 'panel',
                items: [
                    {
                        type: 'input',
                        name: 'driveUrl',
                        label: 'Link Google Drive'
                    },
                    {
                        type: 'selectbox',
                        name: 'driveType',
                        label: 'Nội dung',
                        items: [
                            { text: 'Video', value: 'video' },
                            { text: 'Ảnh', value: 'image' }
                        ]
                    },
                    {
                        type: 'input',
                        name: 'caption',
                        label: 'Chú thích'
                    },
                    {
                        type: 'htmlpanel',
                        html: '<p style="margin:0;color:#64748b;font-size:12px;">Đặt public link Google Drive vào đây. Video dùng player preview, ảnh dùng thumbnail từ Drive.</p>'
                    }
                ]
            },
            initialData: {
                driveUrl: '',
                driveType: 'image',
                caption: ''
            },
            buttons: [
                { type: 'cancel', text: 'Đóng' },
                { type: 'submit', text: 'Chèn', primary: true }
            ],
            onSubmit(api) {
                const data = api.getData();
                const embedHtml = buildGoogleDriveEmbedHtml({
                    url: data.driveUrl,
                    type: data.driveType,
                    caption: data.caption
                });
                if (!embedHtml) {
                    editor.windowManager.alert('Link Google Drive khong hop le. Hay dung link file public, vd: https://drive.google.com/file/d/.../preview');
                    return;
                }
                editor.focus();
                editor.insertContent(embedHtml);
                api.close();
            }
        });
    };

    const openMultiImageDialog = (editor) => {
        editor.windowManager.open({
            title: 'Chèn nhiều ảnh liên tiếp',
            body: {
                type: 'panel',
                items: [
                    {
                        type: 'textarea',
                        name: 'imageUrls',
                        label: 'Mỗi dòng một URL ảnh',
                        placeholder: 'https://.../img-1.jpg\nhttps://.../img-2.jpg\nhttps://drive.google.com/file/d/.../view?usp=sharing'
                    },
                    {
                        type: 'htmlpanel',
                        html: '<p style="margin:0;color:#64748b;font-size:12px;">Nhập ít nhất 2 URL ảnh. Hỗ trợ link ảnh thường và link file ảnh Google Drive.</p>'
                    }
                ]
            },
            initialData: {
                imageUrls: ''
            },
            buttons: [
                { type: 'cancel', text: 'Đóng' },
                { type: 'submit', text: 'Chèn', primary: true }
            ],
            onSubmit(api) {
                const data = api.getData();
                const { urls, invalidEntries } = parseMultiImageUrls(data.imageUrls);
                if (invalidEntries.length) {
                    editor.windowManager.alert(`Có ${invalidEntries.length} URL không hợp lệ. Mỗi dòng phải là một link ảnh hoặc link file ảnh Google Drive hợp lệ.`);
                    return;
                }
                if (urls.length < 2) {
                    editor.windowManager.alert('Nhập ít nhất 2 URL ảnh để tạo một hàng ảnh ngang.');
                    return;
                }
                const rowHtml = buildImageRowHtml(urls);
                if (!rowHtml) {
                    editor.windowManager.alert('Không tạo được cụm ảnh từ danh sách URL đã nhập.');
                    return;
                }
                editor.focus();
                editor.insertContent(rowHtml);
                if (typeof editor.nodeChanged === 'function') {
                    editor.nodeChanged();
                }
                api.close();
            }
        });
    };

    const registerTinyMceGoogleDriveButton = (editor) => {
        if (!editor || !editor.ui || !editor.ui.registry) {
            return;
        }
        editor.ui.registry.addButton('svpdrive', {
            text: 'Google Drive',
            tooltip: 'Chèn ảnh/video từ Google Drive',
            onAction: () => openGoogleDriveDialog(editor)
        });
        editor.ui.registry.addMenuItem('svpdrive', {
            text: 'Google Drive',
            onAction: () => openGoogleDriveDialog(editor)
        });
    };

    const registerTinyMceMultiImageButton = (editor) => {
        if (!editor || !editor.ui || !editor.ui.registry) {
            return;
        }
        editor.ui.registry.addButton('svpmultiimage', {
            text: 'Chèn nhiều ảnh',
            tooltip: 'Chèn nhiều ảnh liên tiếp',
            onAction: () => openMultiImageDialog(editor)
        });
        editor.ui.registry.addMenuItem('svpmultiimage', {
            text: 'Chèn nhiều ảnh liên tiếp',
            onAction: () => openMultiImageDialog(editor)
        });
    };

    const withGoogleDriveTinyMceConfig = (config = {}) => {
        const nextConfig = { ...config };
        const originalSetup = typeof config.setup === 'function' ? config.setup : null;
        nextConfig.toolbar = ensureToolbarControl(config.toolbar, 'svpdrive', 'link');
        nextConfig.toolbar = ensureToolbarControl(nextConfig.toolbar, 'svpmultiimage', 'image');
        nextConfig.invalid_elements = removeInvalidElement(config.invalid_elements, 'iframe');
        nextConfig.extended_valid_elements = ensureValidElements(config.extended_valid_elements, [
            'figure[class]',
            'div[class]',
            'iframe[src|title|allow|allowfullscreen|loading|referrerpolicy]'
        ]);
        nextConfig.valid_children = ensureValidChildren(config.valid_children, [
            '+figure[div|iframe|figcaption]',
            '+div[iframe]'
        ]);
        nextConfig.content_style = `${String(config.content_style || '').trim()}\n${GLOBAL_EMBED_CSS}`;
        nextConfig.setup = (editor) => {
            registerTinyMceGoogleDriveButton(editor);
            registerTinyMceMultiImageButton(editor);
            if (originalSetup) {
                originalSetup(editor);
            }
        };
        return nextConfig;
    };

    injectGlobalStyles();

    window.SVPRichContent = {
        escapeHtml,
        htmlToPlainText,
        sanitizeHtml,
        hasRenderableContent,
        normalizeHttpUrl,
        normalizeSafeHref,
        extractGoogleDriveFileId,
        toGoogleDriveImageUrl,
        toGoogleDrivePreviewUrl,
        normalizeGoogleDriveIframeSrc,
        buildGoogleDriveEmbedHtml,
        withGoogleDriveTinyMceConfig,
        cleanupPortraitLayoutHtml,
        arrangePortraitImageRows,
        extractLeadingImageRowUrls,
        buildImageRowCoverHtml,
        parseMultiImageUrls,
        buildImageRowHtml,
        openMultiImageDialog
    };
})();
