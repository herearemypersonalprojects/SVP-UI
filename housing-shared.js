(function () {
    const API_BASE_URL = window.SVP_API_BASE_URL || 'http://localhost:8080';
    const SITE_URL = String((window.SVPSeo && window.SVPSeo.siteUrl) || window.SVP_PUBLIC_SITE_URL || 'https://svpforum.fr').replace(/\/+$/g, '');
    const SHARE_SITE_URL = String(window.SVP_SHARE_BASE_URL || 'https://share.svpforum.fr').replace(/\/+$/g, '');

    const PROPERTY_TYPES = [
        { value: 'STUDIO', label: 'Studio' },
        { value: 'ROOM', label: 'Phòng riêng' },
        { value: 'APARTMENT', label: 'Căn hộ' },
        { value: 'COLOCATION', label: 'Colocation' },
        { value: 'RESIDENCE', label: 'Ký túc xá / résidence' },
        { value: 'HOUSE', label: 'Nhà riêng' },
        { value: 'OTHER', label: 'Khác' }
    ];

    const TRANSPORT_TYPES = [
        { value: 'METRO', label: 'Metro', icon: '🚇' },
        { value: 'RER', label: 'RER', icon: '🚈' },
        { value: 'TRAIN', label: 'Train', icon: '🚆' },
        { value: 'TRAM', label: 'Tram', icon: '🚊' },
        { value: 'BUS', label: 'Bus', icon: '🚌' }
    ];
    const DIRECT_IMAGE_URL_PATTERN = /https?:\/\/[^\s<>"']+\.(?:png|jpe?g|gif|webp|avif|svg)(?:\?[^\s<>"']*)?/i;

    const STATUS_META = {
        AVAILABLE: { label: 'Còn trống', className: 'sv-housing-badge--AVAILABLE' },
        RENTED: { label: 'Đã thuê', className: 'sv-housing-badge--RENTED' },
        HIDDEN: { label: 'Ẩn', className: 'sv-housing-badge--HIDDEN' }
    };

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const formatPrice = (value) => {
        const amount = Number(value);
        if (!Number.isFinite(amount)) {
            return '';
        }
        return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount)}€`;
    };

    const statusMeta = (status) => STATUS_META[String(status || '').trim().toUpperCase()] || STATUS_META.AVAILABLE;

    const propertyTypeLabel = (value) => {
        const found = PROPERTY_TYPES.find((item) => item.value === String(value || '').trim().toUpperCase());
        return found ? found.label : (value || 'Khác');
    };

    const transportMeta = (value) => {
        const found = TRANSPORT_TYPES.find((item) => item.value === String(value || '').trim().toUpperCase());
        return found || { value: value || 'OTHER', label: value || 'Khác', icon: '🚏' };
    };

    const buildHousingDetailHref = (listingId) => `housing_detail.html?listingId=${encodeURIComponent(listingId)}`;
    const buildHousingFormHref = (listingId) => listingId
        ? `housing_form.html?listingId=${encodeURIComponent(listingId)}`
        : 'housing_form.html';
    const slugify = (value, fallback = 'tin-thue-nha') => {
        if (window.SVPSeo && window.SVPSeo.urls && typeof window.SVPSeo.urls.slugify === 'function') {
            return window.SVPSeo.urls.slugify(value, fallback);
        }
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
        return base || fallback;
    };
    const buildHousingCanonicalUrl = (listingId) => {
        const safeId = String(listingId || '').trim();
        return safeId
            ? `${SITE_URL}/housing_detail.html?listingId=${encodeURIComponent(safeId)}`
            : `${SITE_URL}/housing_detail.html`;
    };
    const buildHousingShareUrl = (listingId, title) => {
        const safeId = String(listingId || '').trim();
        if (!safeId) {
            return buildHousingCanonicalUrl(listingId);
        }
        return `${SHARE_SITE_URL}/housing/${encodeURIComponent(safeId)}/${slugify(title, 'tin-thue-nha')}`;
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
            return parsed.href;
        } catch (_) {
            return '';
        }
    };

    const extractFirstImageUrlFromHtml = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }
        const template = document.createElement('template');
        template.innerHTML = raw;
        const image = template.content.querySelector('img[src]');
        if (image) {
            return normalizeHttpUrl(image.getAttribute('src'));
        }
        const directMatch = raw.match(DIRECT_IMAGE_URL_PATTERN);
        return directMatch ? normalizeHttpUrl(directMatch[0]) : '';
    };

    const getAccessToken = async () => {
        if (window.SVPAuth && typeof window.SVPAuth.getValidAccessToken === 'function') {
            return await window.SVPAuth.getValidAccessToken();
        }
        return localStorage.getItem('accessToken') || '';
    };

    const fetchJson = async (url, options) => {
        const response = await fetch(url, options);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || 'Không thể kết nối API.');
        }
        return payload;
    };

    const requestWithAuth = async (url, options) => {
        const token = await getAccessToken();
        const headers = new Headers(options && options.headers ? options.headers : {});
        headers.set('Accept', 'application/json');
        if (!headers.has('Content-Type') && options && options.body) {
            headers.set('Content-Type', 'application/json');
        }
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        return fetchJson(url, { ...(options || {}), headers });
    };

    const uploadImages = async (files, onProgress) => {
        const token = await getAccessToken();
        if (!token) {
            throw new Error('Bạn cần đăng nhập để upload ảnh.');
        }
        const uploaded = [];
        for (let index = 0; index < files.length; index += 1) {
            const file = files[index];
            if (!file || !(file.type || '').toLowerCase().startsWith('image/')) {
                throw new Error('Chỉ hỗ trợ upload file ảnh.');
            }
            if (typeof onProgress === 'function') {
                onProgress({ index, total: files.length, stage: 'presign', fileName: file.name });
            }
            const presign = await requestWithAuth(`${API_BASE_URL}/api/upload/post-image`, {
                method: 'POST',
                body: JSON.stringify({
                    filename: file.name || `housing-${index + 1}`,
                    contentType: file.type || 'image/jpeg'
                })
            });
            if (typeof onProgress === 'function') {
                onProgress({ index, total: files.length, stage: 'upload', fileName: file.name });
            }
            const uploadResponse = await fetch(String(presign.uploadUrl || ''), {
                method: 'PUT',
                headers: { 'Content-Type': file.type || 'image/jpeg' },
                body: file
            });
            if (!uploadResponse.ok) {
                throw new Error(`Upload ảnh thất bại (${uploadResponse.status}).`);
            }
            uploaded.push(String(presign.publicUrl || '').trim());
        }
        return uploaded;
    };

    const debounce = (fn, wait) => {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), wait);
        };
    };

    window.SVPHousing = {
        API_BASE_URL,
        PROPERTY_TYPES,
        TRANSPORT_TYPES,
        STATUS_META,
        escapeHtml,
        formatPrice,
        statusMeta,
        propertyTypeLabel,
        transportMeta,
        extractFirstImageUrlFromHtml,
        buildHousingDetailHref,
        buildHousingCanonicalUrl,
        buildHousingFormHref,
        buildHousingShareUrl,
        getAccessToken,
        fetchJson,
        requestWithAuth,
        uploadImages,
        debounce
    };
})();
