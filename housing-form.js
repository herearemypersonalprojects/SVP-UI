(function () {
    const shared = window.SVPHousing;
    const editorLib = window.SVPCommentEditor || null;
    const richContent = window.SVPRichContent || null;
    if (!shared) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const editingId = (params.get('listingId') || '').trim();
    const authAlert = document.getElementById('housing-auth-alert');
    const form = document.getElementById('housing-form');
    const titleEl = document.getElementById('housing-title-input');
    const priceEl = document.getElementById('housing-price-input');
    const areaEl = document.getElementById('housing-area-input');
    const typeEl = document.getElementById('housing-type-input');
    const cityEl = document.getElementById('housing-city-input');
    const arrondissementEl = document.getElementById('housing-arrondissement-input');
    const cafEl = document.getElementById('housing-caf-input');
    const tagsEl = document.getElementById('housing-tags-input');
    const descriptionEl = document.getElementById('housing-description-input');
    const addressTextEl = document.getElementById('housing-address-text-input');
    const geocodeBtn = document.getElementById('housing-geocode-btn');
    const geocodeStatusEl = document.getElementById('housing-geocode-status');
    const geocodeResultsEl = document.getElementById('housing-geocode-results');
    const latEl = document.getElementById('housing-lat-input');
    const lngEl = document.getElementById('housing-lng-input');
    const transitListEl = document.getElementById('housing-transit-list');
    const addTransitBtn = document.getElementById('housing-add-transit-btn');
    const imageFilesEl = document.getElementById('housing-image-files');
    const remoteImageUrlEl = document.getElementById('housing-remote-image-url');
    const remoteImageAddBtn = document.getElementById('housing-remote-image-add-btn');
    const imageListEl = document.getElementById('housing-image-list');
    const imageUploadStatusEl = document.getElementById('housing-image-upload-status');
    const contactNameEl = document.getElementById('housing-contact-name');
    const contactPhoneEl = document.getElementById('housing-contact-phone');
    const contactEmailEl = document.getElementById('housing-contact-email');
    const contactNoteEl = document.getElementById('housing-contact-note');
    const submitBtn = document.getElementById('housing-submit-btn');
    const submitLabelEl = document.getElementById('housing-submit-label');
    const feedbackEl = document.getElementById('housing-submit-feedback');
    const previewEl = document.getElementById('housing-preview-main');
    const pageTitleEl = document.getElementById('housing-form-title');
    const breadcrumbEl = document.getElementById('housing-form-breadcrumb');
    const mapEl = document.getElementById('housing-inline-map');
    const remoteImageTools = window.SVPRemoteImageUpload || null;

    if (!form || !titleEl || !priceEl || !areaEl || !typeEl || !cityEl || !arrondissementEl || !cafEl || !tagsEl || !descriptionEl || !addressTextEl || !geocodeBtn || !geocodeStatusEl || !geocodeResultsEl || !latEl || !lngEl || !transitListEl || !addTransitBtn || !imageFilesEl || !imageListEl || !imageUploadStatusEl || !contactNameEl || !contactPhoneEl || !contactEmailEl || !contactNoteEl || !submitBtn || !submitLabelEl || !feedbackEl || !previewEl || !breadcrumbEl || !pageTitleEl || !mapEl) {
        return;
    }

    shared.PROPERTY_TYPES.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        typeEl.appendChild(option);
    });

    const map = L.map(mapEl, { scrollWheelZoom: true }).setView([48.8566, 2.3522], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker = L.marker([48.8566, 2.3522], { draggable: true }).addTo(map);
    marker.on('dragend', () => {
        const position = marker.getLatLng();
        latEl.value = position.lat.toFixed(6);
        lngEl.value = position.lng.toFixed(6);
        updatePreview();
    });

    const suggestionList = document.createElement('datalist');
    suggestionList.id = 'housing-transit-suggestions';
    document.body.appendChild(suggestionList);

    const state = {
        editingId,
        transitPoints: [],
        geocodeSuggestions: []
    };
    let descriptionComposer = null;
    const DEFAULT_MAX_IMAGE_UPLOAD_BYTES = 100 * 1024;
    const FALLBACK_MAX_IMAGE_UPLOAD_BYTES = 300 * 1024;
    let persistedImageUrl = '';
    let pendingImageFile = null;
    let pendingImagePreviewUrl = '';
    let lastResolvedRemoteImageUrl = '';
    let remoteImageResolveTimer = null;
    let remoteImageResolveSeq = 0;
    let isGeocoding = false;
    let isUploadingImage = false;
    let isPreparingRemoteImageUrl = false;
    let isImportingRemoteImage = false;
    let isSubmitting = false;
    const TOUCH_ACTIVATION_DEDUP_MS = 900;
    const touchActivationTimes = new WeakMap();

    const markTouchActivation = (element) => {
        if (element && typeof element === 'object') {
            touchActivationTimes.set(element, Date.now());
        }
    };

    const shouldIgnoreSyntheticClick = (element) => {
        if (!element || typeof element !== 'object') {
            return false;
        }
        const activatedAt = Number(touchActivationTimes.get(element) || 0);
        return activatedAt > 0 && (Date.now() - activatedAt) < TOUCH_ACTIVATION_DEDUP_MS;
    };

    const blurActiveInteractiveElement = () => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement) || active === document.body) {
            return;
        }
        const tagName = String(active.tagName || '').toLowerCase();
        const isTextLikeControl = tagName === 'input'
            || tagName === 'textarea'
            || tagName === 'select'
            || tagName === 'iframe'
            || active.isContentEditable
            || active.getAttribute('role') === 'textbox';
        if (!isTextLikeControl || typeof active.blur !== 'function') {
            return;
        }
        active.blur();
    };

    const bindTouchFallback = (element, handler) => {
        if (!(element instanceof HTMLElement) || typeof handler !== 'function') {
            return;
        }
        element.addEventListener('touchend', (event) => {
            markTouchActivation(element);
            blurActiveInteractiveElement();
            if (event.cancelable) {
                event.preventDefault();
            }
            handler(event, element);
        }, { passive: false });
    };

    const bindDelegatedTouchFallback = (container, selector, handler) => {
        if (!(container instanceof HTMLElement) || typeof handler !== 'function') {
            return;
        }
        container.addEventListener('touchend', (event) => {
            const activator = event.target instanceof Element
                ? event.target.closest(selector)
                : null;
            if (!(activator instanceof HTMLElement)) {
                return;
            }
            markTouchActivation(activator);
            blurActiveInteractiveElement();
            if (event.cancelable) {
                event.preventDefault();
            }
            handler(event, activator);
        }, { passive: false });
    };

    const setFeedback = (text, type) => {
        feedbackEl.textContent = text || '';
        feedbackEl.style.color = type === 'error' ? '#b91c1c' : (type === 'success' ? '#15803d' : '#475569');
    };

    const setGeocodeStatus = (text, type) => {
        geocodeStatusEl.textContent = text || '';
        geocodeStatusEl.style.color = type === 'error' ? '#b91c1c' : (type === 'success' ? '#15803d' : '#475569');
    };

    const setImageStatus = (text, type) => {
        imageUploadStatusEl.textContent = text || '';
        imageUploadStatusEl.style.color = type === 'error' ? '#b91c1c' : (type === 'success' ? '#15803d' : '#475569');
    };

    const getSubmitActionLabel = () => String(submitLabelEl?.textContent || '').trim() || 'Lưu';

    const extractArrondissement = (...candidates) => {
        for (const candidate of candidates) {
            const value = String(candidate || '').trim();
            if (!value) {
                continue;
            }
            const match = value.match(/\b(\d{1,2})(?:er|e)?\s+arr(?:ondissement)?\b/i);
            if (match && match[1]) {
                return match[1];
            }
        }
        return '';
    };

    const toNominatimSuggestion = (item) => {
        const latitude = Number(item && item.lat);
        const longitude = Number(item && item.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }
        const address = item && item.address && typeof item.address === 'object' ? item.address : {};
        const label = String(item && (item.display_name || item.name) || '').trim();
        const city = String(
            address.city
            || address.town
            || address.village
            || address.municipality
            || address.hamlet
            || address.county
            || address.state_district
            || ''
        ).trim();
        const arrondissement = extractArrondissement(
            address.city_district,
            address.borough,
            address.suburb,
            address.quarter,
            label,
            city
        );
        return {
            label: label || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            latitude,
            longitude,
            city,
            arrondissement,
            context: label,
            provider: 'nominatim.openstreetmap.org'
        };
    };

    const geocodeViaNominatim = async (query) => {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('q', query);
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('limit', '5');
        url.searchParams.set('countrycodes', 'fr');

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Nominatim geocoding failed (${response.status}).`);
        }
        const payload = await response.json().catch(() => []);
        const suggestions = Array.isArray(payload)
            ? payload.map((item) => toNominatimSuggestion(item)).filter(Boolean)
            : [];
        return {
            suggestions,
            cached: false,
            provider: 'nominatim.openstreetmap.org'
        };
    };

    const shouldFallbackToDirectNominatim = (error) => {
        const message = String(error && error.message || '').trim().toLowerCase();
        return message.includes('housing geocoding is unavailable')
            || message.includes('failed to fetch')
            || message.includes('networkerror')
            || message.includes('load failed');
    };

    const nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const ensureSinglePrimary = (items, targetId, key) => items.map((item) => ({
        ...item,
        [key]: item.id === targetId
    }));

    const parseTags = () => (tagsEl.value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const getDescriptionHtml = () => {
        if (descriptionComposer && typeof descriptionComposer.getSubmissionHtml === 'function') {
            return String(descriptionComposer.getSubmissionHtml() || '').trim();
        }
        return String(descriptionEl.value || '').trim();
    };

    const getDescriptionPlainText = () => {
        const html = getDescriptionHtml();
        if (editorLib && typeof editorLib.htmlToPlainText === 'function') {
            return String(editorLib.htmlToPlainText(html) || '').trim();
        }
        return String(html || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const setDescriptionHtml = (value) => {
        if (descriptionComposer && typeof descriptionComposer.setHtml === 'function') {
            descriptionComposer.setHtml(value || '');
            return;
        }
        descriptionEl.value = String(value || '');
    };

    const focusDescriptionEditor = () => {
        if (descriptionComposer && typeof descriptionComposer.focus === 'function') {
            descriptionComposer.focus();
            return;
        }
        descriptionEl.focus();
    };

    const requestFormSubmit = () => {
        if (typeof form.requestSubmit === 'function') {
            form.requestSubmit(submitBtn);
            return;
        }
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    };

    const applyCoordinates = (lat, lng, keepZoom) => {
        const latitude = Number(lat);
        const longitude = Number(lng);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }
        latEl.value = latitude.toFixed(6);
        lngEl.value = longitude.toFixed(6);
        marker.setLatLng([latitude, longitude]);
        map.setView([latitude, longitude], keepZoom ? map.getZoom() : Math.max(map.getZoom(), 13));
        updatePreview();
    };

    const renderGeocodeSuggestions = () => {
        if (!state.geocodeSuggestions.length) {
            geocodeResultsEl.innerHTML = '';
            return;
        }
        geocodeResultsEl.innerHTML = state.geocodeSuggestions.map((item, index) => `
            <button type="button" data-suggestion-index="${index}">
                <strong>${shared.escapeHtml(item.label || 'Gợi ý vị trí')}</strong>
                <div class="sv-housing-note mt-1">${shared.escapeHtml(item.city || '')}${item.arrondissement ? ` • arrondissement ${shared.escapeHtml(item.arrondissement)}` : ''}</div>
            </button>
        `).join('');
    };

    const renderTransitList = () => {
        if (!state.transitPoints.length) {
            transitListEl.innerHTML = '<div class="sv-housing-empty">Hãy thêm ít nhất 1 ga hoặc trạm gần nhà.</div>';
            return;
        }
        transitListEl.innerHTML = state.transitPoints.map((item) => `
            <div class="sv-housing-transit-item" data-transit-id="${shared.escapeHtml(item.id)}">
                <div class="row g-3">
                    <div class="col-md-3">
                        <label class="form-label">Loại</label>
                        <select class="form-select" data-field="transportType">
                            ${shared.TRANSPORT_TYPES.map((type) => `
                                <option value="${type.value}" ${type.value === item.transportType ? 'selected' : ''}>${shared.escapeHtml(type.icon)} ${shared.escapeHtml(type.label)}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="col-md-5">
                        <label class="form-label">Tên ga / trạm</label>
                        <input class="form-control" data-field="stationName" type="text" list="housing-transit-suggestions" value="${shared.escapeHtml(item.stationName || '')}">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Line</label>
                        <input class="form-control" data-field="lineLabel" type="text" value="${shared.escapeHtml(item.lineLabel || '')}">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Phút đi bộ</label>
                        <input class="form-control" data-field="walkingMinutes" type="number" min="0" max="120" value="${shared.escapeHtml(String(item.walkingMinutes ?? 5))}">
                    </div>
                </div>
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="housing-primary-transit" ${item.isPrimary ? 'checked' : ''}>
                        <label class="form-check-label">Ga/trạm chính</label>
                    </div>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-secondary" type="button" data-action="up">Lên</button>
                        <button class="btn btn-outline-secondary" type="button" data-action="down">Xuống</button>
                        <button class="btn btn-outline-danger" type="button" data-action="remove">Xóa</button>
                    </div>
                </div>
            </div>
        `).join('');
    };

    const normalizeRemoteImageUrl = (value) => {
        if (remoteImageTools && typeof remoteImageTools.sanitizeHttpUrl === 'function') {
            return remoteImageTools.sanitizeHttpUrl(value);
        }
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

    const REMOTE_IMAGE_URL_DIRECT_STATUS = 'URL ảnh hợp lệ. Hệ thống sẽ lưu trực tiếp URL này.';

    const getRemoteImageUrl = () => normalizeRemoteImageUrl(remoteImageUrlEl ? remoteImageUrlEl.value : '');

    const getSelectedImagePreviewUrl = () => {
        if (pendingImagePreviewUrl) {
            return String(pendingImagePreviewUrl || '').trim();
        }
        return getRemoteImageUrl();
    };

    const getSelectedImageSubmittedUrl = () => getRemoteImageUrl();

    const renderImageList = () => {
        const previewUrl = getSelectedImagePreviewUrl();
        const descriptionImageUrl = shared.extractFirstImageUrlFromHtml(getDescriptionHtml());
        if (previewUrl) {
            imageListEl.innerHTML = `
                <div class="sv-housing-image-item">
                    <img class="sv-housing-image-thumb" src="${shared.escapeHtml(previewUrl)}" alt="Housing cover image">
                </div>
            `;
            return;
        }
        imageListEl.innerHTML = descriptionImageUrl
            ? '<div class="sv-housing-empty">Ảnh đang được lấy từ mô tả chi tiết. URL ảnh đại diện hoặc file ảnh ở trên sẽ ưu tiên hơn.</div>'
            : '<div class="sv-housing-empty">Chưa có ảnh đại diện. Dán URL ảnh hoặc tải một ảnh từ máy để xem preview.</div>';
    };

    const updatePreview = () => {
        const descriptionHtml = getDescriptionHtml();
        const descriptionImageUrl = shared.extractFirstImageUrlFromHtml(descriptionHtml);
        const descriptionImageRowUrls = richContent && typeof richContent.extractLeadingImageRowUrls === 'function'
            ? richContent.extractLeadingImageRowUrls(descriptionHtml, { maxItems: 3 })
            : [];
        const selectedImagePreviewUrl = getSelectedImagePreviewUrl();
        const primaryImage = selectedImagePreviewUrl
            ? { previewUrl: selectedImagePreviewUrl }
            : (descriptionImageUrl ? { previewUrl: descriptionImageUrl } : null);
        const previewTransit = state.transitPoints.find((item) => item.isPrimary) || state.transitPoints[0];
        const statusBadge = '<span class="sv-housing-badge sv-housing-badge--AVAILABLE">Còn trống</span>';
        const descriptionPreview = getDescriptionPlainText();
        const previewCoverHtml = descriptionImageRowUrls.length >= 2 && richContent && typeof richContent.buildImageRowCoverHtml === 'function'
            ? richContent.buildImageRowCoverHtml({
                tagName: 'div',
                imageUrls: descriptionImageRowUrls,
                className: 'sv-housing-image-thumb mb-3',
                altPrefix: titleEl.value || 'Ảnh preview housing',
                maxItems: 3
            })
            : (primaryImage ? `<img class="sv-housing-image-thumb mb-3" src="${shared.escapeHtml(primaryImage.previewUrl)}" alt="Preview">` : '');
        renderImageList();
        previewEl.innerHTML = `
            ${previewCoverHtml}
            <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
                <div class="sv-housing-price">${shared.escapeHtml(shared.formatPrice(priceEl.value))}</div>
                ${statusBadge}
            </div>
            <h5 class="mb-2">${shared.escapeHtml(titleEl.value || 'Tiêu đề tin thuê nhà')}</h5>
            <div class="sv-housing-meta mb-2">${shared.escapeHtml(cityEl.value || '')}${arrondissementEl.value ? ` • ${shared.escapeHtml(arrondissementEl.value)}` : ''}${areaEl.value ? ` • ${shared.escapeHtml(areaEl.value)}m²` : ''}</div>
            <div class="sv-housing-meta mb-2">${previewTransit ? `${shared.escapeHtml(shared.transportMeta(previewTransit.transportType).icon)} ${shared.escapeHtml(previewTransit.lineLabel || '')} ${shared.escapeHtml(previewTransit.stationName || '')} • ${shared.escapeHtml(String(previewTransit.walkingMinutes || ''))} phút đi bộ` : 'Chưa có ga/trạm'}</div>
            <div class="sv-housing-tags mb-2">
                ${typeEl.value ? `<span class="sv-housing-tag">${shared.escapeHtml(shared.propertyTypeLabel(typeEl.value))}</span>` : ''}
                ${cafEl.checked ? '<span class="sv-housing-tag">CAF</span>' : ''}
                ${parseTags().slice(0, 4).map((tag) => `<span class="sv-housing-tag">${shared.escapeHtml(tag)}</span>`).join('')}
            </div>
            <p class="sv-housing-meta mb-0">${shared.escapeHtml(descriptionPreview.slice(0, 220) || 'Mô tả sẽ xuất hiện ở đây...')}</p>
        `;
    };

    const addTransitPoint = (partial) => {
        const item = {
            id: nextId(),
            transportType: 'METRO',
            stationName: '',
            lineLabel: '',
            walkingMinutes: 5,
            isPrimary: state.transitPoints.length === 0,
            ...(partial || {})
        };
        state.transitPoints.push(item);
        renderTransitList();
        updatePreview();
    };

    const clearPendingImagePreview = () => {
        if (pendingImagePreviewUrl && pendingImagePreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(pendingImagePreviewUrl);
        }
        pendingImagePreviewUrl = '';
    };

    const clearPendingImageFile = () => {
        pendingImageFile = null;
        clearPendingImagePreview();
        imageFilesEl.value = '';
        lastResolvedRemoteImageUrl = '';
    };

    const cancelRemoteImageResolve = () => {
        if (remoteImageResolveTimer) {
            clearTimeout(remoteImageResolveTimer);
            remoteImageResolveTimer = null;
        }
        remoteImageResolveSeq += 1;
        isPreparingRemoteImageUrl = false;
    };

    const setPendingImageSelection = (file, statusText) => {
        if (!(file instanceof File)) {
            return;
        }
        cancelRemoteImageResolve();
        clearPendingImagePreview();
        pendingImagePreviewUrl = URL.createObjectURL(file);
        pendingImageFile = file;
        imageFilesEl.value = '';
        if (remoteImageUrlEl) {
            remoteImageUrlEl.value = '';
        }
        lastResolvedRemoteImageUrl = '';
        renderImageList();
        updatePreview();
        setImageStatus(statusText, 'info');
    };

    const verifyRemoteImageUrl = (url) => new Promise((resolve, reject) => {
        const safeUrl = normalizeRemoteImageUrl(url);
        if (!safeUrl) {
            reject(new Error('URL ảnh không hợp lệ.'));
            return;
        }

        const image = new Image();
        let settled = false;
        const cleanup = () => {
            image.onload = null;
            image.onerror = null;
        };
        const finish = (callback) => {
            if (settled) {
                return;
            }
            settled = true;
            window.clearTimeout(timeoutId);
            cleanup();
            callback();
        };
        const timeoutId = window.setTimeout(() => {
            finish(() => reject(new Error('Không thể hiển thị ảnh từ URL.')));
        }, 10000);

        image.onload = () => {
            finish(() => resolve(safeUrl));
        };
        image.onerror = () => {
            finish(() => reject(new Error('Không thể hiển thị ảnh từ URL.')));
        };
        image.decoding = 'async';
        image.referrerPolicy = 'no-referrer';
        image.src = safeUrl;
    });

    const verifyRemoteSelectedUrl = async (url, statusPrefix, successStatus) => {
        const safeUrl = normalizeRemoteImageUrl(url);
        if (!safeUrl) {
            return false;
        }

        const currentSeq = ++remoteImageResolveSeq;
        isPreparingRemoteImageUrl = true;
        setImageStatus(statusPrefix || 'Đang kiểm tra URL ảnh...', 'info');
        try {
            await verifyRemoteImageUrl(safeUrl);
            if (currentSeq !== remoteImageResolveSeq) {
                return false;
            }
            lastResolvedRemoteImageUrl = safeUrl;
            renderImageList();
            updatePreview();
            setImageStatus(successStatus || REMOTE_IMAGE_URL_DIRECT_STATUS, 'info');
            return true;
        } catch (error) {
            if (currentSeq !== remoteImageResolveSeq) {
                return false;
            }
            lastResolvedRemoteImageUrl = '';
            throw error;
        } finally {
            if (currentSeq === remoteImageResolveSeq) {
                isPreparingRemoteImageUrl = false;
            }
        }
    };

    const formatSize = (bytes) => remoteImageTools && typeof remoteImageTools.formatSize === 'function'
        ? remoteImageTools.formatSize(bytes)
        : `${(Number(bytes || 0) / 1024).toFixed(1)}KB`;

    const isCompressionLimitError = (error) => String(error?.message || '')
        .toLowerCase()
        .includes('không thể nén ảnh xuống dưới');

    const uploadSelectedImageToCloudflare = async (file) => {
        if (!file) {
            return;
        }
        if (!file.type || !file.type.toLowerCase().startsWith('image/')) {
            throw new Error('Chỉ hỗ trợ file ảnh.');
        }

        setImageStatus('Đang tải ảnh...', 'info');
        let compressedFile = file;
        let activeUploadLimit = DEFAULT_MAX_IMAGE_UPLOAD_BYTES;
        let usedFallbackLimit = false;

        if (remoteImageTools && typeof remoteImageTools.compressImageBelowLimit === 'function') {
            try {
                compressedFile = await remoteImageTools.compressImageBelowLimit(file, activeUploadLimit);
            } catch (error) {
                if (!isCompressionLimitError(error)) {
                    throw error;
                }
                activeUploadLimit = FALLBACK_MAX_IMAGE_UPLOAD_BYTES;
                usedFallbackLimit = true;
                setImageStatus(
                    `Không thể nén ảnh xuống ${formatSize(DEFAULT_MAX_IMAGE_UPLOAD_BYTES)}. Chuyển sang giới hạn ${formatSize(FALLBACK_MAX_IMAGE_UPLOAD_BYTES)}...`,
                    'info'
                );
                compressedFile = await remoteImageTools.compressImageBelowLimit(file, activeUploadLimit);
            }
        }

        if (usedFallbackLimit) {
            if (compressedFile.size !== file.size) {
                setImageStatus(
                    `Không thể nén dưới ${formatSize(DEFAULT_MAX_IMAGE_UPLOAD_BYTES)}. Hệ thống dùng giới hạn ${formatSize(activeUploadLimit)} và đã nén ảnh từ ${formatSize(file.size)} xuống ${formatSize(compressedFile.size)}. Đang upload...`,
                    'info'
                );
            } else {
                setImageStatus(
                    `Không thể nén dưới ${formatSize(DEFAULT_MAX_IMAGE_UPLOAD_BYTES)}. Hệ thống dùng giới hạn ${formatSize(activeUploadLimit)} và sẽ upload ảnh ${formatSize(compressedFile.size)}.`,
                    'info'
                );
            }
        } else if (compressedFile.size !== file.size) {
            setImageStatus(
                `Đã nén ảnh từ ${formatSize(file.size)} xuống ${formatSize(compressedFile.size)}. Đang upload...`,
                'info'
            );
        } else {
            setImageStatus(`Ảnh đã ở mức ${formatSize(compressedFile.size)}. Đang upload...`, 'info');
        }

        const accessToken = await shared.getAccessToken();
        const presignResponse = await fetch(`${shared.API_BASE_URL}/api/upload/post-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify({
                filename: compressedFile.name || 'housing-image',
                contentType: compressedFile.type || 'application/octet-stream'
            })
        });
        const presignPayload = await presignResponse.json().catch(() => ({}));
        if (!presignResponse.ok) {
            throw new Error(presignPayload.error || 'Không lấy được presigned URL.');
        }

        const uploadMethod = (presignPayload.method || 'PUT').toUpperCase();
        if (uploadMethod !== 'PUT') {
            throw new Error('Upload method không hợp lệ.');
        }
        const uploadUrl = String(presignPayload.uploadUrl || '').trim();
        const publicUrl = String(presignPayload.publicUrl || '').trim();
        if (!uploadUrl || !publicUrl) {
            throw new Error('Thiếu uploadUrl/publicUrl từ API.');
        }

        let uploadResponse;
        try {
            uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': compressedFile.type
                },
                body: compressedFile
            });
        } catch (_) {
            try {
                const binaryBody = typeof compressedFile.arrayBuffer === 'function'
                    ? await compressedFile.arrayBuffer()
                    : await new Response(compressedFile).arrayBuffer();
                uploadResponse = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: binaryBody
                });
            } catch (_) {
                throw new Error('Upload bị chặn do CORS trên Cloudflare R2. Hãy bật CORS cho origin http://localhost:63342, method PUT, allowed headers *.');
            }
        }
        if (!uploadResponse.ok) {
            throw new Error(`Upload lên R2 thất bại (${uploadResponse.status}).`);
        }

        if (remoteImageUrlEl) {
            remoteImageUrlEl.value = publicUrl;
        }
        persistedImageUrl = normalizeRemoteImageUrl(publicUrl);
        clearPendingImageFile();
        renderImageList();
        updatePreview();
        setImageStatus('Upload ảnh thành công.', 'success');
    };

    const toFriendlyUploadError = (error) => {
        const message = error && error.message ? String(error.message) : '';
        if (!message) {
            return 'Upload ảnh thất bại.';
        }
        if (message.toLowerCase().includes('failed to fetch')) {
            return 'Upload bị chặn do CORS trên Cloudflare R2. Hãy bật CORS cho origin http://localhost:63342, method PUT, allowed headers *.';
        }
        return message;
    };

    const toFriendlyRemoteImageImportError = (error) => {
        const message = error && error.message ? String(error.message) : '';
        return message || 'Không thể tải ảnh từ URL để chuẩn bị upload.';
    };

    const importRemoteImage = async () => {
        if (isImportingRemoteImage) {
            return;
        }
        const safeUrl = normalizeRemoteImageUrl(remoteImageUrlEl ? remoteImageUrlEl.value : '');
        if (!safeUrl) {
            setImageStatus('URL ảnh không hợp lệ.', 'error');
            remoteImageUrlEl?.focus();
            return;
        }

        isImportingRemoteImage = true;
        imageFilesEl.disabled = true;
        if (remoteImageAddBtn) {
            remoteImageAddBtn.disabled = true;
        }
        setImageStatus('Đang tải ảnh từ URL để chuẩn bị upload...', 'info');
        try {
            if (!remoteImageTools || typeof remoteImageTools.fetchRemoteImageAsFile !== 'function') {
                setImageStatus('Trình tải ảnh từ URL chưa sẵn sàng.', 'error');
                return;
            }
            const file = await remoteImageTools.fetchRemoteImageAsFile(safeUrl, {
                fileNamePrefix: 'housing-image'
            });
            setPendingImageSelection(
                file,
                `Đã tải ảnh từ URL. Ảnh sẽ được nén và upload khi bấm "${getSubmitActionLabel()}".`
            );
        } catch (error) {
            setImageStatus(toFriendlyRemoteImageImportError(error), 'error');
        } finally {
            isImportingRemoteImage = false;
            imageFilesEl.disabled = false;
            if (remoteImageAddBtn) {
                remoteImageAddBtn.disabled = false;
            }
        }
    };

    const refreshMapLayout = () => {
        if (map && typeof map.invalidateSize === 'function') {
            window.requestAnimationFrame(() => map.invalidateSize());
        }
    };

    const loadTransitSuggestions = shared.debounce(async (query) => {
        const value = String(query || '').trim();
        if (value.length < 2) {
            suggestionList.innerHTML = '';
            return;
        }
        try {
            const payload = await shared.fetchJson(`${shared.API_BASE_URL}/api/transit/suggest?q=${encodeURIComponent(value)}&limit=8`, {
                headers: { Accept: 'application/json' }
            });
            suggestionList.innerHTML = (payload.items || []).map((item) => `
                <option value="${shared.escapeHtml(item.stationName || '')}">${shared.escapeHtml(item.lineLabel || '')}</option>
            `).join('');
        } catch (_) {
            suggestionList.innerHTML = '';
        }
    }, 220);

    const pickExistingImageUrl = (payload) => {
        const directImageUrl = normalizeRemoteImageUrl(payload && payload.imageUrl ? payload.imageUrl : '');
        if (directImageUrl) {
            return directImageUrl;
        }
        const images = Array.isArray(payload && payload.images) ? payload.images : [];
        const primaryImage = images.find((item) => item && item.primary)
            || images[0];
        return normalizeRemoteImageUrl(primaryImage && primaryImage.imageUrl ? primaryImage.imageUrl : '');
    };

    const collectSelectedImageUrl = () => getSelectedImageSubmittedUrl();

    const collectPrimaryImageUrl = () => {
        const selectedImageUrl = collectSelectedImageUrl();
        if (selectedImageUrl) {
            return selectedImageUrl;
        }
        return String(shared.extractFirstImageUrlFromHtml(getDescriptionHtml()) || '').trim();
    };

    const collectPayload = () => ({
        title: titleEl.value.trim(),
        description: getDescriptionHtml(),
        imageUrl: collectPrimaryImageUrl(),
        price: priceEl.value ? Number(priceEl.value) : null,
        areaM2: areaEl.value ? Number(areaEl.value) : null,
        latitude: latEl.value ? Number(latEl.value) : null,
        longitude: lngEl.value ? Number(lngEl.value) : null,
        addressText: addressTextEl.value.trim(),
        city: cityEl.value.trim(),
        arrondissement: arrondissementEl.value.trim(),
        propertyType: typeEl.value,
        cafEligible: cafEl.checked,
        tags: parseTags(),
        contactName: contactNameEl.value.trim(),
        contactPhone: contactPhoneEl.value.trim(),
        contactEmail: contactEmailEl.value.trim(),
        contactNote: contactNoteEl.value.trim(),
        images: collectSelectedImageUrl()
            ? [{
                imageUrl: collectSelectedImageUrl(),
                sortOrder: 0,
                isPrimary: true
            }]
            : [],
        transitPoints: state.transitPoints.map((item, index) => ({
            stationName: item.stationName,
            transportType: item.transportType,
            lineLabel: item.lineLabel,
            walkingMinutes: Number(item.walkingMinutes || 0),
            sortOrder: index,
            isPrimary: !!item.isPrimary
        }))
    });

    const ensureAuth = async () => {
        const token = await shared.getAccessToken();
        if (!token) {
            authAlert.classList.remove('d-none');
            throw new Error('Bạn cần đăng nhập để đăng hoặc chỉnh sửa tin thuê nhà.');
        }
        authAlert.classList.add('d-none');
        return token;
    };

    const loadExistingListing = async () => {
        const payload = await shared.requestWithAuth(`${shared.API_BASE_URL}/api/housing/${encodeURIComponent(editingId)}?trackView=false`, {
            headers: { Accept: 'application/json' }
        });
        if (!payload.viewerCanEdit) {
            throw new Error('Bạn không có quyền chỉnh sửa tin này.');
        }
        titleEl.value = payload.title || '';
        priceEl.value = payload.price || '';
        areaEl.value = payload.areaM2 || '';
        typeEl.value = payload.propertyType || '';
        cityEl.value = payload.city || '';
        arrondissementEl.value = payload.arrondissement || '';
        cafEl.checked = !!payload.cafEligible;
        tagsEl.value = Array.isArray(payload.tags) ? payload.tags.join(', ') : '';
        setDescriptionHtml(payload.description || '');
        addressTextEl.value = payload.addressText || '';
        contactNameEl.value = payload.contact && payload.contact.contactName ? payload.contact.contactName : '';
        contactPhoneEl.value = payload.contact && payload.contact.contactPhone ? payload.contact.contactPhone : '';
        contactEmailEl.value = payload.contact && payload.contact.contactEmail ? payload.contact.contactEmail : '';
        contactNoteEl.value = payload.contact && payload.contact.contactNote ? payload.contact.contactNote : '';
        applyCoordinates(payload.latitude, payload.longitude, false);

        state.transitPoints = (payload.transitPoints || []).map((item) => ({
            id: nextId(),
            transportType: item.transportType || 'METRO',
            stationName: item.stationName || '',
            lineLabel: item.lineLabel || '',
            walkingMinutes: item.walkingMinutes || 0,
            isPrimary: !!item.primary
        }));
        clearPendingImageFile();
        persistedImageUrl = pickExistingImageUrl(payload);
        lastResolvedRemoteImageUrl = persistedImageUrl;
        if (remoteImageUrlEl) {
            remoteImageUrlEl.value = persistedImageUrl;
        }
        renderTransitList();
        renderImageList();
        updatePreview();
    };

    const handleGeocodeRequest = async () => {
        if (isGeocoding) {
            return;
        }
        const query = addressTextEl.value.trim();
        if (!query) {
            setGeocodeStatus('Nhập khu vực gần đúng trước khi tìm.', 'error');
            return;
        }
        isGeocoding = true;
        geocodeBtn.disabled = true;
        try {
            await ensureAuth();
            setGeocodeStatus('Đang tìm khu vực trên bản đồ...', 'info');
            let payload;
            let usedDirectNominatim = false;
            try {
                payload = await shared.requestWithAuth(`${shared.API_BASE_URL}/api/housing/geocode?q=${encodeURIComponent(query)}`, {
                    headers: { Accept: 'application/json' }
                });
            } catch (error) {
                if (!shouldFallbackToDirectNominatim(error)) {
                    throw error;
                }
                payload = await geocodeViaNominatim(query);
                usedDirectNominatim = true;
            }
            state.geocodeSuggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
            renderGeocodeSuggestions();
            if (!state.geocodeSuggestions.length) {
                setGeocodeStatus('Không tìm thấy gợi ý phù hợp. Hãy thử nhập rộng hơn.', 'error');
                return;
            }
            if (usedDirectNominatim) {
                setGeocodeStatus('Đã tải gợi ý geocode trực tiếp từ OpenStreetMap Nominatim.', 'success');
                return;
            }
            setGeocodeStatus(payload.cached ? 'Đã tải gợi ý từ cache geocode.' : 'Đã tải gợi ý geocode.', 'success');
        } catch (error) {
            setGeocodeStatus(error && error.message ? error.message : 'Không thể geocode khu vực.', 'error');
        } finally {
            isGeocoding = false;
            geocodeBtn.disabled = false;
        }
    };

    const handleGeocodeSuggestionSelect = (event, sourceButton) => {
        const button = sourceButton || (event.target instanceof Element
            ? event.target.closest('button[data-suggestion-index]')
            : null);
        if (!button) {
            return;
        }
        if (!sourceButton && shouldIgnoreSyntheticClick(button)) {
            event.preventDefault();
            return;
        }
        const index = Number(button.getAttribute('data-suggestion-index') || -1);
        const suggestion = state.geocodeSuggestions[index];
        if (!suggestion) {
            return;
        }
        if (!cityEl.value.trim() && suggestion.city) {
            cityEl.value = suggestion.city;
        } else if (suggestion.city) {
            cityEl.value = suggestion.city;
        }
        if (suggestion.arrondissement) {
            arrondissementEl.value = suggestion.arrondissement;
        }
        applyCoordinates(suggestion.latitude, suggestion.longitude, false);
        setGeocodeStatus('Đã đặt pin gần đúng. Bạn có thể kéo pin để làm mờ vị trí thực tế hơn.', 'success');
    };

    [latEl, lngEl].forEach((input) => {
        input.addEventListener('change', () => {
            applyCoordinates(latEl.value, lngEl.value, true);
        });
    });

    const handleAddTransit = () => addTransitPoint();

    transitListEl.addEventListener('input', (event) => {
        const row = event.target.closest('[data-transit-id]');
        if (!row) {
            return;
        }
        const item = state.transitPoints.find((entry) => entry.id === row.getAttribute('data-transit-id'));
        if (!item) {
            return;
        }
        const field = event.target.getAttribute('data-field');
        if (!field) {
            return;
        }
        item[field] = event.target.value;
        if (field === 'stationName') {
            loadTransitSuggestions(event.target.value);
        }
        updatePreview();
    });

    transitListEl.addEventListener('change', (event) => {
        const row = event.target.closest('[data-transit-id]');
        if (!row) {
            return;
        }
        const itemId = row.getAttribute('data-transit-id');
        if (event.target.matches('input[type="radio"][name="housing-primary-transit"]')) {
            state.transitPoints = ensureSinglePrimary(state.transitPoints, itemId, 'isPrimary');
            renderTransitList();
            updatePreview();
            return;
        }
        const item = state.transitPoints.find((entry) => entry.id === itemId);
        if (!item) {
            return;
        }
        const field = event.target.getAttribute('data-field');
        if (field) {
            item[field] = event.target.value;
            updatePreview();
        }
    });

    const handleTransitAction = (event, sourceButton) => {
        const button = sourceButton || (event.target instanceof Element
            ? event.target.closest('button[data-action]')
            : null);
        if (!button) {
            return;
        }
        if (!sourceButton && shouldIgnoreSyntheticClick(button)) {
            event.preventDefault();
            return;
        }
        const row = button.closest('[data-transit-id]');
        if (!row) {
            return;
        }
        const itemId = row.getAttribute('data-transit-id');
        const index = state.transitPoints.findIndex((entry) => entry.id === itemId);
        if (index < 0) {
            return;
        }
        const action = button.getAttribute('data-action');
        if (action === 'remove') {
            state.transitPoints.splice(index, 1);
            if (!state.transitPoints.some((item) => item.isPrimary) && state.transitPoints[0]) {
                state.transitPoints[0].isPrimary = true;
            }
        } else if (action === 'up' && index > 0) {
            [state.transitPoints[index - 1], state.transitPoints[index]] = [state.transitPoints[index], state.transitPoints[index - 1]];
        } else if (action === 'down' && index < state.transitPoints.length - 1) {
            [state.transitPoints[index + 1], state.transitPoints[index]] = [state.transitPoints[index], state.transitPoints[index + 1]];
        }
        renderTransitList();
        updatePreview();
    };

    const handleRemoteImageUrlInput = () => {
        const safeUrl = getRemoteImageUrl();
        cancelRemoteImageResolve();
        if (!safeUrl) {
            lastResolvedRemoteImageUrl = '';
            renderImageList();
            updatePreview();
            setImageStatus('', 'info');
            return;
        }
        if (!pendingImageFile && safeUrl === lastResolvedRemoteImageUrl) {
            renderImageList();
            updatePreview();
            setImageStatus(REMOTE_IMAGE_URL_DIRECT_STATUS, 'info');
            return;
        }
        clearPendingImageFile();
        renderImageList();
        updatePreview();
        remoteImageResolveTimer = window.setTimeout(async () => {
            try {
                await verifyRemoteSelectedUrl(safeUrl, 'Đang kiểm tra URL ảnh...');
            } catch (_) {
                setImageStatus('Không thể tải ảnh từ URL. Vui lòng kiểm tra lại URL hoặc tải ảnh từ máy.', 'error');
            }
        }, 250);
    };

    imageFilesEl.addEventListener('change', () => {
        const file = imageFilesEl.files && imageFilesEl.files[0] ? imageFilesEl.files[0] : null;
        if (!file) {
            cancelRemoteImageResolve();
            clearPendingImageFile();
            lastResolvedRemoteImageUrl = '';
            renderImageList();
            updatePreview();
            setImageStatus('', 'info');
            return;
        }
        if (!file.type || !file.type.toLowerCase().startsWith('image/')) {
            cancelRemoteImageResolve();
            clearPendingImageFile();
            lastResolvedRemoteImageUrl = '';
            renderImageList();
            updatePreview();
            setImageStatus('Chỉ hỗ trợ file ảnh.', 'error');
            return;
        }
        cancelRemoteImageResolve();
        setPendingImageSelection(
            file,
            `Ảnh đã được chọn cục bộ. Ảnh sẽ được upload khi bấm "${getSubmitActionLabel()}".`
        );
    });

    [titleEl, priceEl, areaEl, typeEl, cityEl, arrondissementEl, cafEl, tagsEl, descriptionEl, addressTextEl, contactNameEl, contactPhoneEl, contactEmailEl, contactNoteEl].forEach((element) => {
        element.addEventListener('input', updatePreview);
        element.addEventListener('change', updatePreview);
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }
        if (isUploadingImage) {
            setFeedback('Ảnh đại diện đang tải lên máy chủ. Vui lòng chờ xong rồi lưu.', 'error');
            return;
        }
        if (isPreparingRemoteImageUrl) {
            setFeedback('URL ảnh đang được kiểm tra. Vui lòng chờ xong rồi lưu.', 'error');
            return;
        }
        if (isImportingRemoteImage) {
            setFeedback('Ảnh từ URL đang được tải. Vui lòng chờ xong rồi lưu.', 'error');
            return;
        }
        isSubmitting = true;
        try {
            await ensureAuth();
            if (descriptionComposer && descriptionComposer.whenReady) {
                await descriptionComposer.whenReady;
            }
            if (getDescriptionPlainText().length < 20) {
                setFeedback('Mô tả chi tiết cần ít nhất 20 ký tự nội dung.', 'error');
                focusDescriptionEditor();
                return;
            }
            submitBtn.disabled = true;
            setFeedback(editingId ? 'Đang cập nhật tin thuê nhà...' : 'Đang đăng tin thuê nhà...', 'info');

            const inputRemoteImageUrl = getRemoteImageUrl();
            const shouldPrepareRemoteImage = inputRemoteImageUrl
                && !pendingImageFile
                && (!editingId || inputRemoteImageUrl !== persistedImageUrl);
            if (shouldPrepareRemoteImage) {
                try {
                    await verifyRemoteSelectedUrl(
                        inputRemoteImageUrl,
                        'Đang kiểm tra URL ảnh trước khi lưu...',
                        REMOTE_IMAGE_URL_DIRECT_STATUS
                    );
                } catch (_) {
                    setImageStatus('Không thể tải ảnh từ URL. Vui lòng kiểm tra lại URL hoặc tải ảnh từ máy.', 'error');
                    setFeedback('URL ảnh không hợp lệ hoặc không thể hiển thị.', 'error');
                    return;
                }
            }

            if (pendingImageFile) {
                isUploadingImage = true;
                imageFilesEl.disabled = true;
                setImageStatus('Đang upload ảnh lên Cloudflare R2...', 'info');
                try {
                    await uploadSelectedImageToCloudflare(pendingImageFile);
                } catch (uploadError) {
                    setImageStatus(toFriendlyUploadError(uploadError), 'error');
                    setFeedback('Không thể upload ảnh đại diện.', 'error');
                    return;
                } finally {
                    isUploadingImage = false;
                    imageFilesEl.disabled = false;
                }
            }

            const payload = collectPayload();
            const result = editingId
                ? await shared.requestWithAuth(`${shared.API_BASE_URL}/api/housing/${encodeURIComponent(editingId)}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                })
                : await shared.requestWithAuth(`${shared.API_BASE_URL}/api/housing`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

            setFeedback(editingId ? 'Đã cập nhật tin thuê nhà.' : 'Đã đăng tin thuê nhà.', 'success');
            setTimeout(() => {
                window.location.href = shared.buildHousingDetailHref(result.listingId || editingId);
            }, 500);
        } catch (error) {
            setFeedback(error && error.message ? error.message : 'Không thể lưu tin thuê nhà.', 'error');
        } finally {
            isSubmitting = false;
            submitBtn.disabled = false;
        }
    };

    geocodeBtn.addEventListener('click', (event) => {
        if (shouldIgnoreSyntheticClick(geocodeBtn)) {
            event.preventDefault();
            return;
        }
        void handleGeocodeRequest();
    });
    bindTouchFallback(geocodeBtn, () => {
        void handleGeocodeRequest();
    });

    geocodeResultsEl.addEventListener('click', handleGeocodeSuggestionSelect);
    bindDelegatedTouchFallback(geocodeResultsEl, 'button[data-suggestion-index]', handleGeocodeSuggestionSelect);

    addTransitBtn.addEventListener('click', (event) => {
        if (shouldIgnoreSyntheticClick(addTransitBtn)) {
            event.preventDefault();
            return;
        }
        handleAddTransit();
    });
    bindTouchFallback(addTransitBtn, () => handleAddTransit());

    remoteImageAddBtn?.addEventListener('click', (event) => {
        if (shouldIgnoreSyntheticClick(remoteImageAddBtn)) {
            event.preventDefault();
            return;
        }
        void importRemoteImage();
    });
    bindTouchFallback(remoteImageAddBtn, () => {
        void importRemoteImage();
    });
    remoteImageUrlEl?.addEventListener('input', handleRemoteImageUrlInput);
    remoteImageUrlEl?.addEventListener('change', handleRemoteImageUrlInput);

    transitListEl.addEventListener('click', handleTransitAction);
    bindDelegatedTouchFallback(transitListEl, 'button[data-action]', handleTransitAction);

    submitBtn.addEventListener('click', (event) => {
        if (shouldIgnoreSyntheticClick(submitBtn)) {
            event.preventDefault();
            event.stopPropagation();
        }
    });
    bindTouchFallback(submitBtn, () => requestFormSubmit());

    form.addEventListener('submit', handleSubmit);

    const init = async () => {
        try {
            await ensureAuth();
        } catch (_) {
        }
        if (editorLib && typeof editorLib.create === 'function') {
            descriptionComposer = editorLib.create({
                target: descriptionEl,
                minHeight: 320,
                placeholder: '',
                onChange: () => updatePreview()
            });
        }
        latEl.value = '48.856600';
        lngEl.value = '2.352200';
        addTransitPoint();
        renderImageList();
        updatePreview();

        if (editingId) {
            pageTitleEl.textContent = 'Chỉnh sửa tin thuê nhà';
            breadcrumbEl.textContent = 'Chỉnh sửa tin';
            submitLabelEl.textContent = 'Lưu thay đổi';
            document.title = 'Chỉnh sửa tin thuê nhà | SVP';
            try {
                await loadExistingListing();
            } catch (error) {
                setFeedback(error && error.message ? error.message : 'Không tải được tin thuê nhà.', 'error');
            }
        }
    };

    window.addEventListener('resize', refreshMapLayout);
    window.addEventListener('orientationchange', refreshMapLayout);
    window.addEventListener('pageshow', refreshMapLayout);

    void init();
})();
