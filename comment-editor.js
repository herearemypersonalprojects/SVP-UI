(function () {
    'use strict';

    if (window.SVPCommentEditor) {
        return;
    }

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const normalizeSafeHref = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }
        if (raw.startsWith('mailto:')) {
            return raw;
        }
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

    const normalizeSafeImageUrl = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }
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

    const htmlToPlainText = (value) => {
        const raw = String(value || '')
            .replace(/<\s*br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|li|blockquote|pre|h[1-6])>/gi, '\n')
            .replace(/<(li)\b[^>]*>/gi, '- ');
        const template = document.createElement('template');
        template.innerHTML = raw;
        return String(template.content.textContent || '')
            .replace(/\u00a0/g, ' ')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();
    };

    const textToParagraphsHtml = (value) => {
        const text = String(value || '').replace(/\r\n/g, '\n').trim();
        if (!text) {
            return '';
        }
        const blocks = text
            .split(/\n{2,}/)
            .map((block) => block.trim())
            .filter(Boolean);
        if (!blocks.length) {
            return '';
        }
        return blocks.map((block) => {
            const lines = block
                .split('\n')
                .map((line) => escapeHtml(line.trim()))
                .filter(Boolean);
            return `<p>${lines.join('<br>')}</p>`;
        }).join('');
    };

    const hasRenderableContent = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return false;
        }
        if (htmlToPlainText(raw)) {
            return true;
        }
        const template = document.createElement('template');
        template.innerHTML = raw;
        return Boolean(template.content.querySelector('img[src]'));
    };

    const sanitizeHtml = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }

        const template = document.createElement('template');
        template.innerHTML = raw;

        const allowedTags = new Set([
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
            'a', 'div', 'span', 'img', 'figure', 'figcaption'
        ]);
        const blockedTags = new Set([
            'script', 'style', 'iframe', 'object', 'embed', 'form',
            'input', 'button', 'textarea', 'select', 'option', 'link',
            'meta', 'picture', 'source',
            'svg', 'canvas', 'table', 'thead', 'tbody', 'tfoot', 'tr',
            'td', 'th'
        ]);

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
                const src = normalizeSafeImageUrl(node.getAttribute('src'));
                if (!src) {
                    return '';
                }
                const alt = escapeHtml(node.getAttribute('alt') || '');
                return `<img src="${escapeHtml(src)}" alt="${alt}">`;
            }
            return `<${tag}>${childrenHtml}</${tag}>`;
        };

        const sanitized = Array.from(template.content.childNodes)
            .map((node) => sanitizeNode(node))
            .join('')
            .trim();
        return hasRenderableContent(sanitized) ? sanitized : '';
    };

    const baseContentStyle = `
        body {
            font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 15px;
            line-height: 1.7;
            color: #0f172a;
            padding: .85rem 1rem;
        }
        p { margin: 0 0 .9rem; }
        ul, ol { margin: 0 0 .9rem 1.25rem; }
        li { margin-bottom: .35rem; }
        blockquote {
            margin: 1rem 0;
            padding: .75rem .95rem;
            border-left: 4px solid #2563eb;
            background: #f8fbff;
            color: #334155;
        }
        pre {
            margin: 1rem 0;
            padding: .85rem .95rem;
            border-radius: 10px;
            background: #0f172a;
            color: #e2e8f0;
            white-space: pre-wrap;
        }
        figure {
            margin: 1rem 0;
        }
        img {
            display: block;
            max-width: 100%;
            height: auto;
            margin: 0 auto;
            border-radius: 12px;
        }
        figcaption {
            margin-top: .45rem;
            color: #64748b;
            font-size: .9rem;
            text-align: center;
        }
        a { color: #1d4ed8; }
    `;

    const create = (options = {}) => {
        const target = options.target instanceof HTMLTextAreaElement
            ? options.target
            : document.querySelector(String(options.selector || ''));
        if (!(target instanceof HTMLTextAreaElement)) {
            return null;
        }

        let editor = null;
        let ready = false;
        let pendingHtml = String(target.value || '').trim();
        let initPromise = Promise.resolve(null);

        const emitChange = () => {
            if (typeof options.onChange === 'function') {
                options.onChange(controller);
            }
        };

        const setTextareaValue = (value) => {
            target.value = String(value || '');
        };

        const controller = {
            whenReady: initPromise,
            isReady: () => ready,
            getEditor: () => editor,
            getHtml: () => {
                if (ready && editor) {
                    return String(editor.getContent() || '').trim();
                }
                return String(target.value || '').trim();
            },
            getSubmissionHtml: () => {
                const raw = ready && editor
                    ? editor.getContent()
                    : textToParagraphsHtml(target.value);
                return sanitizeHtml(raw);
            },
            hasContent: () => hasRenderableContent(controller.getSubmissionHtml()),
            getText: () => {
                if (ready && editor) {
                    return htmlToPlainText(editor.getContent());
                }
                return String(target.value || '').replace(/\r\n/g, '\n').trim();
            },
            getTextLength: () => controller.getText().length,
            setHtml: (value) => {
                const nextHtml = ready && editor
                    ? sanitizeHtml(value)
                    : String(value || '').trim();
                pendingHtml = nextHtml;
                setTextareaValue(nextHtml);
                if (ready && editor) {
                    editor.setContent(nextHtml || '');
                    setTextareaValue(editor.getContent() || '');
                }
                emitChange();
            },
            clear: () => {
                controller.setHtml('');
            },
            focus: () => {
                if (ready && editor) {
                    editor.focus();
                    return;
                }
                target.focus();
            },
            insertHtml: (html, fallbackText = '') => {
                const safeHtml = sanitizeHtml(html);
                if (ready && editor) {
                    editor.focus();
                    editor.insertContent(safeHtml || '');
                    setTextareaValue(editor.getContent() || '');
                    emitChange();
                    return;
                }
                const insertion = String(fallbackText || htmlToPlainText(safeHtml) || '');
                const current = String(target.value || '');
                const start = Number.isFinite(target.selectionStart) ? target.selectionStart : current.length;
                const end = Number.isFinite(target.selectionEnd) ? target.selectionEnd : current.length;
                const nextValue = `${current.slice(0, start)}${insertion}${current.slice(end)}`;
                setTextareaValue(nextValue);
                const nextCursor = start + insertion.length;
                if (typeof target.setSelectionRange === 'function') {
                    target.setSelectionRange(nextCursor, nextCursor);
                }
                emitChange();
            }
        };

        const initEditor = async () => {
            if (!window.tinymce) {
                emitChange();
                return null;
            }

            const editors = await window.tinymce.init({
                target,
                license_key: 'gpl',
                menubar: 'insert format tools view',
                branding: false,
                promotion: false,
                browser_spellcheck: true,
                statusbar: false,
                toolbar_sticky: true,
                toolbar_mode: 'wrap',
                min_height: Number(options.minHeight || 260),
                autoresize_bottom_margin: 16,
                plugins: 'autolink advlist lists link image emoticons charmap code fullscreen autoresize',
                toolbar: 'undo redo | bold italic underline strikethrough | bullist numlist blockquote | link image emoticons | removeformat code fullscreen',
                placeholder: String(options.placeholder || target.getAttribute('placeholder') || ''),
                convert_urls: false,
                relative_urls: false,
                remove_script_host: false,
                paste_data_images: false,
                image_uploadtab: false,
                image_title: true,
                forced_root_block: 'p',
                invalid_elements: 'script,style,iframe,object,embed,form,input,button,textarea,select,option,link,meta,picture,source,svg,canvas,table,thead,tbody,tfoot,tr,td,th',
                link_default_target: '_blank',
                link_assume_external_targets: 'https',
                content_style: options.contentStyle || baseContentStyle
            });

            editor = Array.isArray(editors) && editors.length
                ? editors[0]
                : (window.tinymce ? window.tinymce.get(target.id) : null);
            if (!editor) {
                emitChange();
                return null;
            }

            ready = true;
            if (pendingHtml) {
                editor.setContent(sanitizeHtml(pendingHtml) || '');
            } else if (target.value.trim()) {
                editor.setContent(textToParagraphsHtml(target.value.trim()) || '');
            }
            setTextareaValue(editor.getContent() || '');
            editor.on('change input undo redo keyup setcontent', () => {
                setTextareaValue(editor.getContent() || '');
                emitChange();
            });
            emitChange();
            return editor;
        };

        initPromise = initEditor().catch((error) => {
            console.warn('Cannot init TinyMCE comment editor:', error);
            emitChange();
            return null;
        });
        controller.whenReady = initPromise;

        return controller;
    };

    window.SVPCommentEditor = {
        create,
        escapeHtml,
        hasRenderableContent,
        sanitizeHtml,
        htmlToPlainText,
        textToParagraphsHtml
    };
})();
