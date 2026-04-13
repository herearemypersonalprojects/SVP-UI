(function () {
    const sanitizeHttpUrl = (value) => {
        const raw = String(value || '').trim();
        if (!/^https?:\/\//i.test(raw)) {
            return '';
        }
        try {
            const parsed = new URL(raw);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:'
                ? parsed.toString()
                : '';
        } catch (_) {
            return '';
        }
    };

    const buildRemoteImageProxyUrl = (rawUrl, options) => {
        const safeUrl = sanitizeHttpUrl(rawUrl);
        if (!safeUrl) {
            return '';
        }

        const settings = options && typeof options === 'object' ? options : {};
        const proxyBaseUrl = sanitizeHttpUrl(
            settings.proxyBaseUrl
            || (typeof window !== 'undefined' ? window.SVP_API_BASE_URL : '')
        );
        if (!proxyBaseUrl) {
            return '';
        }

        try {
            const targetUrl = new URL(safeUrl);
            const proxyBase = new URL(proxyBaseUrl);
            if (targetUrl.origin === proxyBase.origin && targetUrl.pathname.replace(/\/+$/, '') === '/share-image') {
                return '';
            }

            const proxyUrl = new URL('/share-image', proxyBase);
            proxyUrl.searchParams.set('url', safeUrl);
            return proxyUrl.toString();
        } catch (_) {
            return '';
        }
    };

    const normalizeImageMimeType = (value) => {
        const normalized = String(value || '')
            .split(';')[0]
            .trim()
            .toLowerCase();
        return normalized.startsWith('image/') ? normalized : '';
    };

    const imageExtensionForMime = (mimeType) => {
        const normalized = normalizeImageMimeType(mimeType);
        if (normalized === 'image/webp') return 'webp';
        if (normalized === 'image/png') return 'png';
        if (normalized === 'image/gif') return 'gif';
        if (normalized === 'image/avif') return 'avif';
        if (normalized === 'image/svg+xml') return 'svg';
        return 'jpg';
    };

    const replaceFileExtension = (filename, newExtension) => {
        const raw = String(filename || 'image').trim() || 'image';
        const base = raw.replace(/\.[^/.]+$/, '') || 'image';
        return `${base}.${newExtension}`;
    };

    const formatSize = (bytes) => `${(Number(bytes || 0) / 1024).toFixed(1)}KB`;

    const sanitizeFileStem = (value, fallback) => {
        const normalized = String(value || '')
            .trim()
            .replace(/[?#].*$/, '')
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9-_]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        const safe = normalized || String(fallback || 'remote-image').trim() || 'remote-image';
        return safe.slice(0, 80);
    };

    const inferFilenameFromUrl = (rawUrl, mimeType, fallbackPrefix) => {
        const safeUrl = sanitizeHttpUrl(rawUrl);
        const fallback = sanitizeFileStem(fallbackPrefix, 'remote-image');
        if (!safeUrl) {
            return replaceFileExtension(fallback, imageExtensionForMime(mimeType));
        }
        try {
            const parsed = new URL(safeUrl);
            const lastSegment = parsed.pathname.split('/').filter(Boolean).pop() || '';
            const decodedSegment = decodeURIComponent(lastSegment || '');
            const safeStem = sanitizeFileStem(decodedSegment, fallback);
            const originalExtMatch = decodedSegment.match(/\.([a-zA-Z0-9]{2,5})$/);
            const originalExt = originalExtMatch ? originalExtMatch[1].toLowerCase() : '';
            const fallbackExt = imageExtensionForMime(mimeType);
            return replaceFileExtension(
                safeStem,
                originalExt || fallbackExt
            );
        } catch (_) {
            return replaceFileExtension(fallback, imageExtensionForMime(mimeType));
        }
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
            reject(new Error('Không đọc được ảnh để nén.'));
        };
        image.src = objectUrl;
    });

    const canvasToBlob = (canvas, mimeType, quality) => new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });

    const compressImageBelowLimit = async (file, maxBytes) => {
        if (!(file instanceof File) || !Number.isFinite(Number(maxBytes)) || Number(maxBytes) <= 0 || file.size <= maxBytes) {
            return file;
        }

        const image = await loadImageFromFile(file);
        const sourceWidth = image.naturalWidth || image.width;
        const sourceHeight = image.naturalHeight || image.height;
        if (!sourceWidth || !sourceHeight) {
            throw new Error('Không xác định được kích thước ảnh.');
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Trình duyệt không hỗ trợ nén ảnh.');
        }

        const scaleCandidates = [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36, 0.3, 0.25];
        const qualityCandidates = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42];
        const mimeCandidates = ['image/webp', 'image/jpeg'];
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            mimeCandidates.unshift('image/jpeg');
        } else if (file.type === 'image/webp') {
            mimeCandidates.unshift('image/webp');
        }

        let bestBlob = null;
        let bestMime = 'image/jpeg';

        for (const scale of scaleCandidates) {
            const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
            const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            context.clearRect(0, 0, targetWidth, targetHeight);
            context.drawImage(image, 0, 0, targetWidth, targetHeight);

            for (const mimeType of mimeCandidates) {
                for (const quality of qualityCandidates) {
                    const blob = await canvasToBlob(canvas, mimeType, quality);
                    if (!blob) {
                        continue;
                    }
                    if (!bestBlob || blob.size < bestBlob.size) {
                        bestBlob = blob;
                        bestMime = mimeType;
                    }
                    if (blob.size <= maxBytes) {
                        const outputName = replaceFileExtension(file.name, imageExtensionForMime(mimeType));
                        return new File([blob], outputName, {
                            type: mimeType,
                            lastModified: Date.now()
                        });
                    }
                }
            }
        }

        if (!bestBlob) {
            throw new Error('Không thể nén ảnh.');
        }

        throw new Error(
            `Không thể nén ảnh xuống dưới ${formatSize(maxBytes)}. Kích thước nhỏ nhất đạt được là ${formatSize(bestBlob.size)}.`
        );
    };

    const fetchRemoteImageAsFile = async (rawUrl, options) => {
        const safeUrl = sanitizeHttpUrl(rawUrl);
        if (!safeUrl) {
            throw new Error('URL ảnh không hợp lệ.');
        }

        const settings = options && typeof options === 'object' ? options : {};
        const proxyUrl = buildRemoteImageProxyUrl(safeUrl, settings);
        let lastTransportError = null;

        const fetchImageResponse = async (targetUrl) => {
            try {
                const currentResponse = await fetch(targetUrl, {
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'no-store',
                    referrerPolicy: 'no-referrer'
                });
                lastTransportError = null;
                return currentResponse;
            } catch (error) {
                lastTransportError = error;
                return null;
            }
        };

        let response = await fetchImageResponse(safeUrl);
        if ((!response || !response.ok) && proxyUrl) {
            const proxyResponse = await fetchImageResponse(proxyUrl);
            if (proxyResponse) {
                response = proxyResponse;
            }
        }

        if (!response) {
            const wrappedError = new Error('Không thể tải bytes ảnh từ URL này. Nguồn ảnh có thể chặn CORS hoặc URL đã hết hạn.');
            wrappedError.cause = lastTransportError;
            throw wrappedError;
        }

        if (!response.ok) {
            throw new Error(`Không thể tải ảnh từ URL (HTTP ${Number.isFinite(response.status) ? response.status : 'N/A'}).`);
        }

        const contentType = response.headers && typeof response.headers.get === 'function'
            ? normalizeImageMimeType(response.headers.get('Content-Type'))
            : '';
        if (contentType && !contentType.startsWith('image/')) {
            throw new Error('URL không trả về file ảnh hợp lệ.');
        }

        const blob = await response.blob();
        const blobType = normalizeImageMimeType(blob && blob.type ? blob.type : '');
        const effectiveType = blobType || contentType;
        if (!effectiveType || !effectiveType.startsWith('image/')) {
            throw new Error('URL không trả về file ảnh hợp lệ.');
        }
        if (!blob || !blob.size) {
            throw new Error('Ảnh tải về rỗng hoặc không hợp lệ.');
        }

        const fallbackPrefix = String(settings.fileNamePrefix || 'remote-image').trim() || 'remote-image';
        const filename = inferFilenameFromUrl(safeUrl, effectiveType, fallbackPrefix);
        return new File([blob], filename, {
            type: effectiveType,
            lastModified: Date.now()
        });
    };

    window.SVPRemoteImageUpload = {
        sanitizeHttpUrl,
        imageExtensionForMime,
        replaceFileExtension,
        formatSize,
        compressImageBelowLimit,
        fetchRemoteImageAsFile
    };
})();
