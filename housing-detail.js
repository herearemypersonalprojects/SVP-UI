(function () {
    const shared = window.SVPHousing;
    const editorLib = window.SVPCommentEditor || null;
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
    const tagsEl = document.getElementById('housing-detail-tags');
    const galleryEl = document.getElementById('housing-detail-gallery');
    const descriptionEl = document.getElementById('housing-detail-description');
    const transitEl = document.getElementById('housing-detail-transit');
    const contactEl = document.getElementById('housing-detail-contact');
    const ownerEl = document.getElementById('housing-detail-owner');
    const mapEl = document.getElementById('housing-detail-map');
    const seo = window.SVPSeo || null;

    if (!listingId || !feedbackEl || !breadcrumbEl || !titleEl || !statusWrapEl || !metaEl || !priceEl || !actionsEl || !tagsEl || !galleryEl || !descriptionEl || !transitEl || !contactEl || !ownerEl || !mapEl) {
        return;
    }

    const map = L.map(mapEl, { scrollWheelZoom: false }).setView([48.8566, 2.3522], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    const marker = L.marker([48.8566, 2.3522]).addTo(map);

    const renderDescription = (html) => {
        const raw = String(html || '').trim();
        const sanitized = editorLib && typeof editorLib.sanitizeHtml === 'function'
            ? editorLib.sanitizeHtml(raw)
            : shared.escapeHtml(raw);
        descriptionEl.innerHTML = sanitized || '<div class="sv-housing-empty">Chưa có mô tả chi tiết.</div>';
    };

    const renderGallery = (images, descriptionHtml) => {
        const fallbackImage = shared.extractFirstImageUrlFromHtml(descriptionHtml || '');
        if (!Array.isArray(images) || !images.length) {
            if (fallbackImage) {
                galleryEl.innerHTML = `
                    <img class="sv-housing-image-thumb mb-3" src="${shared.escapeHtml(fallbackImage)}" alt="Housing image">
                    <div class="sv-housing-note">Ảnh đang được lấy từ mô tả chi tiết của tin.</div>
                `;
                return;
            }
            galleryEl.innerHTML = '<div class="sv-housing-empty">Tin này không có album ảnh riêng.</div>';
            return;
        }
        const primary = images.find((item) => item.primary) || images[0];
        galleryEl.innerHTML = `
            <img class="sv-housing-image-thumb mb-3" src="${shared.escapeHtml(primary.imageUrl)}" alt="Housing image">
            <div class="row g-2">
                ${images.map((item) => `
                    <div class="col-4">
                        <img class="sv-housing-image-thumb" src="${shared.escapeHtml(item.imageUrl)}" alt="Housing image">
                    </div>
                `).join('')}
            </div>
        `;
    };

    const renderTransit = (items) => {
        if (!Array.isArray(items) || !items.length) {
            transitEl.innerHTML = '<div class="sv-housing-empty">Chưa có thông tin ga / trạm gần nhà.</div>';
            return;
        }
        transitEl.innerHTML = items.map((item) => `
            <div class="sv-housing-transit-item">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                        <strong>${shared.escapeHtml(item.transportIcon || '🚏')} ${shared.escapeHtml(item.stationName || '')}</strong>
                        <div class="sv-housing-note mt-1">${shared.escapeHtml(item.transportTypeLabel || '')}${item.lineLabel ? ` • ${shared.escapeHtml(item.lineLabel)}` : ''}</div>
                    </div>
                    <div class="sv-housing-tag">${shared.escapeHtml(String(item.walkingMinutes || 0))} phút đi bộ</div>
                </div>
            </div>
        `).join('');
    };

    const renderContact = (contact) => {
        const rows = [];
        if (contact && contact.contactName) rows.push(`<div><strong>Tên liên hệ:</strong> ${shared.escapeHtml(contact.contactName)}</div>`);
        if (contact && contact.contactPhone) rows.push(`<div><strong>Điện thoại:</strong> ${shared.escapeHtml(contact.contactPhone)}</div>`);
        if (contact && contact.contactEmail) rows.push(`<div><strong>Email:</strong> ${shared.escapeHtml(contact.contactEmail)}</div>`);
        if (contact && contact.contactNote) rows.push(`<div><strong>Ghi chú:</strong> ${shared.escapeHtml(contact.contactNote)}</div>`);
        contactEl.innerHTML = rows.length ? rows.join('') : 'Chủ tin chưa để lại thông tin liên hệ.';
    };

    const renderOwner = (owner) => {
        if (!owner) {
            ownerEl.textContent = 'Không rõ người đăng.';
            return;
        }
        ownerEl.innerHTML = `
            <div><strong>${shared.escapeHtml(owner.displayName || 'Thành viên SVP')}</strong></div>
            ${owner.nickname ? `<div class="sv-housing-note mt-1">@${shared.escapeHtml(owner.nickname)}</div>` : ''}
        `;
    };

    const renderActions = (payload) => {
        const baseActions = [
            `<a class="btn btn-outline-secondary" href="ban-do-thue-nha.html">Quay lại bản đồ</a>`
        ];
        if (payload.viewerCanEdit) {
            baseActions.unshift(`<a class="btn btn-primary" href="${shared.buildHousingFormHref(payload.id)}"><i class="fa-solid fa-pen-to-square me-1"></i>Chỉnh sửa</a>`);
            baseActions.push(`
                <select id="housing-status-select" class="form-select" style="min-width:170px;">
                    <option value="AVAILABLE" ${payload.status === 'AVAILABLE' ? 'selected' : ''}>Còn trống</option>
                    <option value="RENTED" ${payload.status === 'RENTED' ? 'selected' : ''}>Đã thuê</option>
                    <option value="HIDDEN" ${payload.status === 'HIDDEN' ? 'selected' : ''}>Ẩn</option>
                </select>
            `);
        }
        actionsEl.innerHTML = baseActions.join('');

        const statusSelect = document.getElementById('housing-status-select');
        if (statusSelect) {
            statusSelect.addEventListener('change', async () => {
                const nextStatus = statusSelect.value;
                try {
                    feedbackEl.textContent = 'Đang cập nhật trạng thái...';
                    const result = await shared.requestWithAuth(`${shared.API_BASE_URL}/api/housing/${encodeURIComponent(payload.id)}/status`, {
                        method: 'PUT',
                        body: JSON.stringify({ status: nextStatus })
                    });
                    const statusMeta = shared.statusMeta(result.status);
                    statusWrapEl.innerHTML = `<span class="sv-housing-badge ${statusMeta.className}">${shared.escapeHtml(result.statusLabel || statusMeta.label)}</span>`;
                    feedbackEl.textContent = 'Đã cập nhật trạng thái.';
                } catch (error) {
                    feedbackEl.textContent = error && error.message ? error.message : 'Không thể cập nhật trạng thái.';
                    statusSelect.value = payload.status;
                }
            });
        }
    };

    const buildSeoDescription = (payload) => {
        const parts = [
            payload.priceLabel || shared.formatPrice(payload.price),
            payload.city || '',
            payload.arrondissement || '',
            payload.areaM2 ? `${payload.areaM2}m²` : '',
            payload.propertyTypeLabel || shared.propertyTypeLabel(payload.propertyType)
        ].filter(Boolean);
        const summary = parts.join(' • ');
        if (summary) {
            return `Chi tiết tin thuê nhà trên SVP: ${summary}.`;
        }
        return 'Xem chi tiết tin thuê nhà trên SVP: giá, ảnh, khu vực gần đúng, ga gần nhà và thông tin liên hệ.';
    };

    const applySeo = (payload) => {
        if (!seo || typeof seo.setPage !== 'function') {
            return;
        }
        const finalListingId = String(payload.id || listingId || '').trim();
        const title = payload.title ? `${payload.title} | SVP` : 'Chi tiết thuê nhà | SVP';
        const detailPath = finalListingId
            ? `/housing_detail.html?listingId=${encodeURIComponent(finalListingId)}`
            : '/housing_detail.html';
        seo.setPage({
            title,
            description: buildSeoDescription(payload),
            url: detailPath,
            path: detailPath,
            image: '/assets/icons/og_housing_map.png',
            imageType: 'image/png',
            imageWidth: '1200',
            imageHeight: '630',
            schemaType: 'WebPage'
        });
    };

    const loadDetail = async () => {
        try {
            const token = await shared.getAccessToken();
            const headers = { Accept: 'application/json' };
            const requestOptions = { headers };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
                requestOptions.cache = 'no-store';
            }
            const payload = await shared.fetchJson(`${shared.API_BASE_URL}/api/housing/${encodeURIComponent(listingId)}`, requestOptions);
            breadcrumbEl.textContent = payload.title || 'Chi tiết';
            titleEl.textContent = payload.title || 'Tin thuê nhà';
            document.title = `${payload.title || 'Chi tiết thuê nhà'} | SVP`;
            applySeo(payload);
            const statusMeta = shared.statusMeta(payload.status);
            statusWrapEl.innerHTML = `<span class="sv-housing-badge ${statusMeta.className}">${shared.escapeHtml(payload.statusLabel || statusMeta.label)}</span>`;
            priceEl.textContent = payload.priceLabel || shared.formatPrice(payload.price);
            metaEl.textContent = [
                payload.city || '',
                payload.arrondissement || '',
                payload.areaM2 ? `${payload.areaM2}m²` : '',
                payload.propertyTypeLabel || shared.propertyTypeLabel(payload.propertyType)
            ].filter(Boolean).join(' • ');
            tagsEl.innerHTML = [
                payload.cafEligible ? '<span class="sv-housing-tag">CAF</span>' : '',
                ...(Array.isArray(payload.tags) ? payload.tags.map((tag) => `<span class="sv-housing-tag">${shared.escapeHtml(tag)}</span>`) : [])
            ].join('');
            renderGallery(payload.images || [], payload.description || '');
            renderDescription(payload.description || '');
            renderTransit(payload.transitPoints || []);
            renderContact(payload.contact || null);
            renderOwner(payload.owner || null);
            renderActions(payload);
            applyMap(payload.latitude, payload.longitude, payload.addressText);
            feedbackEl.textContent = 'Vị trí trên bản đồ là gần đúng để bảo vệ riêng tư người đăng.';
        } catch (error) {
            feedbackEl.textContent = error && error.message ? error.message : 'Không thể tải chi tiết tin thuê nhà.';
        }
    };

    const applyMap = (latitude, longitude, addressText) => {
        if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
            return;
        }
        marker.setLatLng([latitude, longitude]);
        marker.bindPopup(shared.escapeHtml(addressText || 'Vị trí gần đúng'));
        map.setView([latitude, longitude], 13);
    };

    void loadDetail();
})();
