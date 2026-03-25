(function () {
    const shared = window.SVPHousing;
    const editorLib = window.SVPCommentEditor || null;
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
        imageEntries: [],
        geocodeSuggestions: []
    };
    let descriptionComposer = null;

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

    const renderImageList = () => {
        if (!state.imageEntries.length) {
            imageListEl.innerHTML = '<div class="sv-housing-empty">Chưa có ảnh nào. Hãy thêm ít nhất 1 ảnh.</div>';
            return;
        }
        imageListEl.innerHTML = state.imageEntries.map((item) => `
            <div class="sv-housing-image-item" data-image-id="${shared.escapeHtml(item.id)}">
                <img class="sv-housing-image-thumb" src="${shared.escapeHtml(item.previewUrl)}" alt="Housing image">
                <div class="d-flex justify-content-between align-items-center gap-2 mt-2">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="housing-primary-image" ${item.isPrimary ? 'checked' : ''}>
                        <label class="form-check-label">Ảnh chính</label>
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

    const updatePreview = () => {
        const primaryImage = state.imageEntries.find((item) => item.isPrimary) || state.imageEntries[0];
        const previewTransit = state.transitPoints.find((item) => item.isPrimary) || state.transitPoints[0];
        const statusBadge = '<span class="sv-housing-badge sv-housing-badge--AVAILABLE">Còn trống</span>';
        const descriptionPreview = getDescriptionPlainText();
        previewEl.innerHTML = `
            ${primaryImage ? `<img class="sv-housing-image-thumb mb-3" src="${shared.escapeHtml(primaryImage.previewUrl)}" alt="Preview">` : ''}
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

    const addImageEntries = (entries) => {
        entries.forEach((entry, index) => {
            state.imageEntries.push({
                id: nextId(),
                previewUrl: entry.previewUrl,
                existingUrl: entry.existingUrl || '',
                file: entry.file || null,
                isPrimary: state.imageEntries.length === 0 && index === 0,
                source: entry.source || 'new'
            });
        });
        if (state.imageEntries.length === 1) {
            state.imageEntries[0].isPrimary = true;
        }
        renderImageList();
        updatePreview();
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

    const collectPayload = () => ({
        title: titleEl.value.trim(),
        description: getDescriptionHtml(),
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
        images: state.imageEntries.map((item, index) => ({
            imageUrl: item.uploadedUrl || item.existingUrl,
            sortOrder: index,
            isPrimary: !!item.isPrimary
        })),
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
        const payload = await shared.requestWithAuth(`${shared.API_BASE_URL}/api/housing/${encodeURIComponent(editingId)}`, {
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
        state.imageEntries = (payload.images || []).map((item, index) => ({
            id: nextId(),
            previewUrl: item.imageUrl,
            existingUrl: item.imageUrl,
            file: null,
            isPrimary: !!item.primary || index === 0,
            source: 'existing'
        }));
        renderTransitList();
        renderImageList();
        updatePreview();
    };

    geocodeBtn.addEventListener('click', async () => {
        const query = addressTextEl.value.trim();
        if (!query) {
            setGeocodeStatus('Nhập khu vực gần đúng trước khi tìm.', 'error');
            return;
        }
        try {
            await ensureAuth();
            setGeocodeStatus('Đang tìm khu vực trên bản đồ...', 'info');
            const payload = await shared.requestWithAuth(`${shared.API_BASE_URL}/api/housing/geocode?q=${encodeURIComponent(query)}`, {
                headers: { Accept: 'application/json' }
            });
            state.geocodeSuggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
            renderGeocodeSuggestions();
            if (!state.geocodeSuggestions.length) {
                setGeocodeStatus('Không tìm thấy gợi ý phù hợp. Hãy thử nhập rộng hơn.', 'error');
                return;
            }
            setGeocodeStatus(payload.cached ? 'Đã tải gợi ý từ cache geocode.' : 'Đã tải gợi ý geocode.', 'success');
        } catch (error) {
            setGeocodeStatus(error && error.message ? error.message : 'Không thể geocode khu vực.', 'error');
        }
    });

    geocodeResultsEl.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-suggestion-index]');
        if (!button) {
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
    });

    [latEl, lngEl].forEach((input) => {
        input.addEventListener('change', () => {
            applyCoordinates(latEl.value, lngEl.value, true);
        });
    });

    addTransitBtn.addEventListener('click', () => addTransitPoint());

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

    transitListEl.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) {
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
    });

    imageFilesEl.addEventListener('change', () => {
        const files = Array.from(imageFilesEl.files || []);
        if (!files.length) {
            return;
        }
        addImageEntries(files.map((file) => ({
            file,
            previewUrl: URL.createObjectURL(file),
            source: 'new'
        })));
        imageFilesEl.value = '';
        setImageStatus('Ảnh mới sẽ được upload khi bạn bấm lưu.', 'info');
    });

    imageListEl.addEventListener('change', (event) => {
        const row = event.target.closest('[data-image-id]');
        if (!row) {
            return;
        }
        if (event.target.matches('input[type="radio"][name="housing-primary-image"]')) {
            state.imageEntries = ensureSinglePrimary(state.imageEntries, row.getAttribute('data-image-id'), 'isPrimary');
            renderImageList();
            updatePreview();
        }
    });

    imageListEl.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            return;
        }
        const row = button.closest('[data-image-id]');
        if (!row) {
            return;
        }
        const itemId = row.getAttribute('data-image-id');
        const index = state.imageEntries.findIndex((entry) => entry.id === itemId);
        if (index < 0) {
            return;
        }
        const action = button.getAttribute('data-action');
        const current = state.imageEntries[index];
        if (action === 'remove') {
            if (current.file && current.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(current.previewUrl);
            }
            state.imageEntries.splice(index, 1);
            if (!state.imageEntries.some((item) => item.isPrimary) && state.imageEntries[0]) {
                state.imageEntries[0].isPrimary = true;
            }
        } else if (action === 'up' && index > 0) {
            [state.imageEntries[index - 1], state.imageEntries[index]] = [state.imageEntries[index], state.imageEntries[index - 1]];
        } else if (action === 'down' && index < state.imageEntries.length - 1) {
            [state.imageEntries[index + 1], state.imageEntries[index]] = [state.imageEntries[index], state.imageEntries[index + 1]];
        }
        renderImageList();
        updatePreview();
    });

    [titleEl, priceEl, areaEl, typeEl, cityEl, arrondissementEl, cafEl, tagsEl, descriptionEl, addressTextEl, contactNameEl, contactPhoneEl, contactEmailEl, contactNoteEl].forEach((element) => {
        element.addEventListener('input', updatePreview);
        element.addEventListener('change', updatePreview);
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
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

            const newFiles = state.imageEntries.filter((item) => item.file && !item.uploadedUrl).map((item) => item.file);
            if (newFiles.length) {
                const uploadedUrls = await shared.uploadImages(newFiles, ({ index, total, stage }) => {
                    setImageStatus(`Đang ${stage === 'presign' ? 'chuẩn bị' : 'upload'} ảnh ${index + 1}/${total}...`, 'info');
                });
                let uploadIndex = 0;
                state.imageEntries = state.imageEntries.map((item) => {
                    if (!item.file || item.uploadedUrl) {
                        return item;
                    }
                    const uploadedUrl = uploadedUrls[uploadIndex];
                    uploadIndex += 1;
                    return { ...item, uploadedUrl };
                });
                setImageStatus('Upload ảnh thành công.', 'success');
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
            submitBtn.disabled = false;
        }
    });

    const init = async () => {
        try {
            await ensureAuth();
        } catch (_) {
        }
        if (editorLib && typeof editorLib.create === 'function') {
            descriptionComposer = editorLib.create({
                target: descriptionEl,
                minHeight: 320,
                placeholder: descriptionEl.getAttribute('placeholder') || '',
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

    void init();
})();
