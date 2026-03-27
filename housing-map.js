(function () {
    const shared = window.SVPHousing;
    if (!shared) {
        return;
    }

    const form = document.getElementById('housing-filter-form');
    const listEl = document.getElementById('housing-list');
    const metaEl = document.getElementById('housing-results-meta');
    const mapStatusEl = document.getElementById('housing-map-status');
    const mapEl = document.getElementById('housing-map');
    const applyBtn = document.getElementById('filter-apply-btn');
    const resetBtn = document.getElementById('filter-reset-btn');
    const statusInput = document.getElementById('filter-status');
    const typeInput = document.getElementById('filter-type');
    const transportTypeInput = document.getElementById('filter-transport-type');
    const DEFAULT_STATUS_FILTER = 'AVAILABLE,RENTED';

    if (!form || !listEl || !metaEl || !mapStatusEl || !mapEl || !applyBtn || !resetBtn || !statusInput || !typeInput || !transportTypeInput) {
        return;
    }

    shared.PROPERTY_TYPES.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        typeInput.appendChild(option);
    });

    shared.TRANSPORT_TYPES.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = `${item.icon} ${item.label}`;
        transportTypeInput.appendChild(option);
    });

    const map = L.map(mapEl, { zoomControl: true }).setView([46.6, 2.4], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const clusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 44
    });
    map.addLayer(clusterGroup);

    const state = {
        items: [],
        requestToken: 0,
        hasAutoFocusedInitialPins: false,
        isAutoFittingMap: false,
        userMovedMap: false
    };

    const hasValidCoordinates = (item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));

    const buildItemsBounds = () => {
        const points = state.items
            .filter(hasValidCoordinates)
            .map((item) => L.latLng(Number(item.latitude), Number(item.longitude)));
        if (!points.length) {
            return null;
        }
        const bounds = L.latLngBounds(points);
        return bounds.isValid() ? bounds : null;
    };

    const fitMapToInitialPins = () => {
        if (state.hasAutoFocusedInitialPins || state.userMovedMap) {
            return;
        }
        const bounds = buildItemsBounds();
        if (!bounds) {
            return;
        }
        state.hasAutoFocusedInitialPins = true;
        state.isAutoFittingMap = true;
        map.fitBounds(bounds, {
            padding: [28, 28],
            maxZoom: 13
        });
        window.setTimeout(() => {
            state.isAutoFittingMap = false;
        }, 0);
    };

    const openListingDetail = (listingId) => {
        const value = String(listingId || '').trim();
        if (!value) {
            return;
        }
        window.location.href = shared.buildHousingDetailHref(value);
    };

    const createPriceIcon = (item) => {
        const priceLabel = shared.escapeHtml(item.priceLabel || shared.formatPrice(item.price));
        const status = String(item.status || 'AVAILABLE').toUpperCase();
        const className = `housing-price-pin housing-price-pin--${status}`;
        return L.divIcon({
            className: 'housing-price-pin-wrap',
            html: `<div class="${className}">${priceLabel}</div>`,
            iconSize: [64, 34],
            iconAnchor: [32, 17],
            popupAnchor: [0, -18]
        });
    };

    const buildTransitText = (transit) => {
        if (!transit || !transit.stationName) {
            return 'Chưa có thông tin ga gần nhà';
        }
        const line = transit.lineLabel ? ` ${transit.lineLabel}` : '';
        const walk = Number.isFinite(Number(transit.walkingMinutes)) ? ` • ${transit.walkingMinutes} phút đi bộ` : '';
        return `${transit.transportIcon || '🚏'}${line} ${transit.stationName}${walk}`;
    };

    const renderList = () => {
        if (!state.items.length) {
            listEl.innerHTML = '<div class="sv-housing-empty">Chưa có tin phù hợp trong khung bản đồ hiện tại.</div>';
            return;
        }
        listEl.innerHTML = state.items.map((item) => {
            const statusMeta = shared.statusMeta(item.status);
            const tags = Array.isArray(item.tags) ? item.tags.slice(0, 4) : [];
            const image = item.primaryImageUrl || 'assets/img/forum_svp_background.png';
            const href = shared.buildHousingDetailHref(item.id);
            return `
                <a class="sv-housing-card" href="${shared.escapeHtml(href)}" data-listing-id="${shared.escapeHtml(item.id)}">
                    <img class="sv-housing-card__image" src="${shared.escapeHtml(image)}" alt="${shared.escapeHtml(item.title || 'Housing image')}">
                    <div class="sv-housing-card__content">
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <div class="sv-housing-price">${shared.escapeHtml(item.priceLabel || shared.formatPrice(item.price))}</div>
                            <span class="sv-housing-badge ${statusMeta.className}">${shared.escapeHtml(statusMeta.label)}</span>
                        </div>
                        <div>
                            <strong>${shared.escapeHtml(item.title || 'Tin thuê nhà')}</strong>
                            <div class="sv-housing-meta mt-1">${shared.escapeHtml(item.city || '')}${item.arrondissement ? ` • ${shared.escapeHtml(item.arrondissement)}` : ''}${item.areaM2 ? ` • ${shared.escapeHtml(String(item.areaM2))}m²` : ''}</div>
                        </div>
                        <div class="sv-housing-meta">${shared.escapeHtml(buildTransitText(item.primaryTransit))}</div>
                        <div class="sv-housing-tags">
                            <span class="sv-housing-tag">${shared.escapeHtml(item.propertyTypeLabel || shared.propertyTypeLabel(item.propertyType))}</span>
                            ${item.cafEligible ? '<span class="sv-housing-tag">CAF</span>' : ''}
                            ${tags.map((tag) => `<span class="sv-housing-tag">${shared.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </div>
                </a>
            `;
        }).join('');
    };

    const renderMarkers = () => {
        clusterGroup.clearLayers();
        state.items.forEach((item) => {
            if (!hasValidCoordinates(item)) {
                return;
            }
            const marker = L.marker([item.latitude, item.longitude], {
                icon: createPriceIcon(item)
            });
            marker.on('click', () => openListingDetail(item.id));
            clusterGroup.addLayer(marker);
        });
    };

    const getBoundsQuery = () => {
        const bounds = map.getBounds();
        return {
            minLat: bounds.getSouth().toFixed(6),
            maxLat: bounds.getNorth().toFixed(6),
            minLng: bounds.getWest().toFixed(6),
            maxLng: bounds.getEast().toFixed(6)
        };
    };

    const buildQuery = () => {
        const params = new URLSearchParams();
        const bounds = getBoundsQuery();
        Object.entries(bounds).forEach(([key, value]) => params.set(key, value));
        params.set('limit', '120');

        const city = (form.elements.city.value || '').trim();
        const arrondissement = (form.elements.arrondissement.value || '').trim();
        const minPrice = (form.elements.minPrice.value || '').trim();
        const maxPrice = (form.elements.maxPrice.value || '').trim();
        const stationName = (form.elements.stationName.value || '').trim();
        const transportType = (form.elements.transportType.value || '').trim();
        const lineLabel = (form.elements.lineLabel.value || '').trim();
        const maxWalkingMinutes = (form.elements.maxWalkingMinutes.value || '').trim();
        const type = (form.elements.type.value || '').trim();
        const status = (form.elements.status.value || '').trim();
        if (city) params.set('city', city);
        if (arrondissement) params.set('arrondissement', arrondissement);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (stationName) params.set('station_name', stationName);
        if (transportType) params.set('transport_type', transportType);
        if (lineLabel) params.set('line_label', lineLabel);
        if (maxWalkingMinutes) params.set('max_walking_minutes', maxWalkingMinutes);
        if (type) params.set('type', type);
        if (status) params.set('status', status);
        if (form.elements.caf.checked) params.set('caf', 'true');
        return params.toString();
    };

    const loadHousing = async () => {
        const requestToken = ++state.requestToken;
        metaEl.textContent = 'Đang tải...';
        mapStatusEl.textContent = 'Đang tải tin trong khung bản đồ hiện tại...';
        try {
            const token = await shared.getAccessToken();
            const headers = { Accept: 'application/json' };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const payload = await shared.fetchJson(`${shared.API_BASE_URL}/api/housing?${buildQuery()}`, { headers });
            if (requestToken !== state.requestToken) {
                return;
            }
            state.items = Array.isArray(payload.items) ? payload.items : [];
            renderList();
            renderMarkers();
            fitMapToInitialPins();
            metaEl.textContent = payload.hasMore
                ? `${state.items.length}+ tin trong khung nhìn`
                : `${state.items.length} tin trong khung nhìn`;
            mapStatusEl.textContent = '';
        } catch (error) {
            if (requestToken !== state.requestToken) {
                return;
            }
            state.items = [];
            renderList();
            renderMarkers();
            metaEl.textContent = 'Không tải được dữ liệu';
            mapStatusEl.textContent = error && error.message ? error.message : 'Không thể tải danh sách nhà.';
        }
    };

    const debouncedLoad = shared.debounce(() => {
        void loadHousing();
    }, 350);

    ['dragstart', 'zoomstart'].forEach((eventName) => {
        map.on(eventName, () => {
            if (!state.isAutoFittingMap) {
                state.userMovedMap = true;
            }
        });
    });
    map.on('moveend', debouncedLoad);
    applyBtn.addEventListener('click', () => { void loadHousing(); });
    resetBtn.addEventListener('click', () => {
        form.reset();
        statusInput.value = DEFAULT_STATUS_FILTER;
        void loadHousing();
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        void loadHousing();
    });

    ['input', 'change'].forEach((eventName) => {
        form.addEventListener(eventName, (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
                return;
            }
            debouncedLoad();
        });
    });

    void loadHousing();
})();
