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
    const loadMoreBtn = document.getElementById('housing-load-more-btn');
    const loadMoreWrap = document.getElementById('housing-load-more-wrap');
    const filterToggleBtn = document.getElementById('housing-filter-toggle');
    const filterControlsEl = document.getElementById('housing-filter-controls');
    const statusInput = document.getElementById('filter-status');
    const typeInput = document.getElementById('filter-type');
    const transportTypeInput = document.getElementById('filter-transport-type');
    const DEFAULT_STATUS_FILTER = 'AVAILABLE,RENTED';
    const INITIAL_VISIBLE_COUNT = 10;
    const LOAD_MORE_STEP = 5;
    const DATASET_LIMIT = 1000;
    const SESSION_CACHE_KEY = 'svp-housing-map-dataset-v1';
    const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

    if (!form || !listEl || !metaEl || !mapStatusEl || !mapEl || !applyBtn || !resetBtn || !loadMoreBtn || !loadMoreWrap || !filterToggleBtn || !filterControlsEl || !statusInput || !typeInput || !transportTypeInput) {
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
        filteredItems: [],
        visibleCount: INITIAL_VISIBLE_COUNT,
        requestToken: 0,
        datasetHasMore: false,
        hasAutoFocusedInitialPins: false,
        isAutoFittingMap: false,
        userMovedMap: false
    };

    const hasValidCoordinates = (item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));

    const normalizeText = (value) => String(value || '')
        .trim()
        .toLowerCase();

    const parseOptionalNumber = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return null;
        }
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const formatLoadedCount = (count) => `${count}${state.datasetHasMore ? '+' : ''}`;

    const buildItemsBounds = (items) => {
        const points = items
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
        const bounds = buildItemsBounds(state.filteredItems.length ? state.filteredItems : state.items);
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

    const updateLoadMoreButton = () => {
        const remaining = Math.max(0, state.filteredItems.length - state.visibleCount);
        if (remaining <= 0) {
            loadMoreWrap.hidden = true;
            return;
        }
        loadMoreWrap.hidden = false;
        const nextCount = Math.min(LOAD_MORE_STEP, remaining);
        loadMoreBtn.textContent = `Xem thêm ${nextCount} tin nữa`;
    };

    const renderMeta = () => {
        if (!state.items.length) {
            metaEl.textContent = 'Chưa có tin để hiển thị';
            return;
        }
        const total = state.filteredItems.length;
        const visible = Math.min(total, state.visibleCount);
        const totalLabel = total === state.items.length ? formatLoadedCount(total) : String(total);
        metaEl.textContent = `${totalLabel} tin phù hợp • đang hiện ${visible} bên trái`;
    };

    const renderList = () => {
        if (!state.filteredItems.length) {
            listEl.innerHTML = '<div class="sv-housing-empty">Chưa có tin phù hợp với bộ lọc hiện tại.</div>';
            updateLoadMoreButton();
            renderMeta();
            return;
        }
        const visibleItems = state.filteredItems.slice(0, state.visibleCount);
        listEl.innerHTML = visibleItems.map((item) => {
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
        updateLoadMoreButton();
        renderMeta();
    };

    const renderMarkers = () => {
        clusterGroup.clearLayers();
        state.filteredItems.forEach((item) => {
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

    const buildFilterState = () => {
        const selectedStatuses = String(form.elements.status.value || '')
            .split(',')
            .map((item) => item.trim().toUpperCase())
            .filter(Boolean);

        const minPriceRaw = parseOptionalNumber(form.elements.minPrice.value);
        const maxPriceRaw = parseOptionalNumber(form.elements.maxPrice.value);

        return {
            city: normalizeText(form.elements.city.value),
            arrondissement: normalizeText(form.elements.arrondissement.value),
            minPrice: minPriceRaw,
            maxPrice: maxPriceRaw,
            stationName: normalizeText(form.elements.stationName.value),
            transportType: normalizeText(form.elements.transportType.value),
            lineLabel: normalizeText(form.elements.lineLabel.value),
            maxWalkingMinutes: parseOptionalNumber(form.elements.maxWalkingMinutes.value),
            propertyType: normalizeText(form.elements.type.value),
            statuses: selectedStatuses,
            cafOnly: Boolean(form.elements.caf.checked)
        };
    };

    const matchesTransitFilters = (item, filters) => {
        const needsTransitFilter = Boolean(filters.stationName || filters.transportType || filters.lineLabel || filters.maxWalkingMinutes !== null);
        if (!needsTransitFilter) {
            return true;
        }
        const transitPoints = Array.isArray(item.transitPoints) ? item.transitPoints : [];
        if (!transitPoints.length) {
            return false;
        }
        return transitPoints.some((point) => {
            const stationName = normalizeText(point.stationName);
            const transportType = normalizeText(point.transportType);
            const lineLabel = normalizeText(point.lineLabel);
            const walkingMinutes = Number(point.walkingMinutes);
            if (filters.stationName && !stationName.includes(filters.stationName)) {
                return false;
            }
            if (filters.transportType && transportType !== filters.transportType) {
                return false;
            }
            if (filters.lineLabel && !lineLabel.includes(filters.lineLabel)) {
                return false;
            }
            if (filters.maxWalkingMinutes !== null && (!Number.isFinite(walkingMinutes) || walkingMinutes > filters.maxWalkingMinutes)) {
                return false;
            }
            return true;
        });
    };

    const matchesFilters = (item, filters) => {
        const city = normalizeText(item.city);
        const arrondissement = normalizeText(item.arrondissement);
        const propertyType = normalizeText(item.propertyType);
        const status = normalizeText(item.status).toUpperCase();
        const price = Number(item.price);
        if (filters.city && !city.includes(filters.city)) {
            return false;
        }
        if (filters.arrondissement && !arrondissement.includes(filters.arrondissement)) {
            return false;
        }
        if (filters.propertyType && propertyType !== filters.propertyType) {
            return false;
        }
        if (filters.statuses.length && !filters.statuses.includes(status)) {
            return false;
        }
        if (filters.minPrice !== null && (!Number.isFinite(price) || price < filters.minPrice)) {
            return false;
        }
        if (filters.maxPrice !== null && (!Number.isFinite(price) || price > filters.maxPrice)) {
            return false;
        }
        if (filters.cafOnly && !item.cafEligible) {
            return false;
        }
        return matchesTransitFilters(item, filters);
    };

    const updateMapStatus = () => {
        if (!state.items.length) {
            mapStatusEl.textContent = 'Chưa có pin công khai để hiển thị.';
            return;
        }
        const filteredCount = state.filteredItems.length;
        const loadedCount = formatLoadedCount(state.items.length);
        if (!filteredCount) {
            mapStatusEl.textContent = `Đã tải ${loadedCount} tin công khai. Bộ lọc hiện tại chưa khớp tin nào.`;
            return;
        }
        const limitNote = state.datasetHasMore ? ' Dữ liệu đang dùng giới hạn tải an toàn cho map.' : '';
        mapStatusEl.textContent = `Đang hiển thị ${filteredCount} pin từ ${loadedCount} tin đã tải. Kéo hoặc zoom chỉ thay đổi góc nhìn, không gọi backend lại.${limitNote}`;
    };

    const applyClientFilters = ({ resetVisibleCount = true } = {}) => {
        const filters = buildFilterState();
        state.filteredItems = state.items.filter((item) => matchesFilters(item, filters));
        if (resetVisibleCount) {
            state.visibleCount = INITIAL_VISIBLE_COUNT;
        } else {
            state.visibleCount = Math.max(INITIAL_VISIBLE_COUNT, state.visibleCount);
        }
        renderList();
        renderMarkers();
        updateMapStatus();
    };

    const readCachedDataset = () => {
        try {
            const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
            if (!raw) {
                return null;
            }
            const cached = JSON.parse(raw);
            if (!cached || typeof cached !== 'object') {
                return null;
            }
            if (!Number.isFinite(Number(cached.cachedAt)) || (Date.now() - Number(cached.cachedAt)) > SESSION_CACHE_TTL_MS) {
                return null;
            }
            const payload = cached.payload;
            if (!payload || !Array.isArray(payload.items)) {
                return null;
            }
            return payload;
        } catch (_) {
            return null;
        }
    };

    const writeCachedDataset = (payload) => {
        try {
            window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
                cachedAt: Date.now(),
                payload
            }));
        } catch (_) {
            // Ignore cache write failures: frontend should still work without sessionStorage.
        }
    };

    const loadHousingDataset = async () => {
        const cachedPayload = readCachedDataset();
        if (cachedPayload) {
            state.items = Array.isArray(cachedPayload.items) ? cachedPayload.items : [];
            state.datasetHasMore = Boolean(cachedPayload.hasMore);
            applyClientFilters();
            fitMapToInitialPins();
            mapStatusEl.textContent = `Đang hiển thị ${state.filteredItems.length} pin từ ${formatLoadedCount(state.items.length)} tin đã tải. Dữ liệu lấy từ bộ nhớ phiên nên không cần gọi backend lại.`;
            return;
        }

        const requestToken = ++state.requestToken;
        metaEl.textContent = 'Đang tải...';
        mapStatusEl.textContent = 'Đang tải toàn bộ pin công khai cho bản đồ...';
        try {
            const payload = await shared.fetchJson(`${shared.API_BASE_URL}/api/housing?limit=${DATASET_LIMIT}`, {
                headers: { Accept: 'application/json' }
            });
            if (requestToken !== state.requestToken) {
                return;
            }
            state.items = Array.isArray(payload.items) ? payload.items : [];
            state.datasetHasMore = Boolean(payload.hasMore);
            writeCachedDataset(payload);
            applyClientFilters();
            fitMapToInitialPins();
        } catch (error) {
            if (requestToken !== state.requestToken) {
                return;
            }
            state.items = [];
            state.filteredItems = [];
            state.datasetHasMore = false;
            renderList();
            renderMarkers();
            metaEl.textContent = 'Không tải được dữ liệu';
            mapStatusEl.textContent = error && error.message ? error.message : 'Không thể tải danh sách nhà.';
        }
    };

    const debouncedApplyFilters = shared.debounce(() => {
        applyClientFilters();
    }, 180);

    const setFilterPanelExpanded = (expanded) => {
        filterControlsEl.hidden = !expanded;
        filterToggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    };

    ['dragstart', 'zoomstart'].forEach((eventName) => {
        map.on(eventName, () => {
            if (!state.isAutoFittingMap) {
                state.userMovedMap = true;
            }
        });
    });

    filterToggleBtn.addEventListener('click', () => {
        setFilterPanelExpanded(filterControlsEl.hidden);
    });

    loadMoreBtn.addEventListener('click', () => {
        state.visibleCount += LOAD_MORE_STEP;
        renderList();
    });

    applyBtn.addEventListener('click', () => {
        applyClientFilters();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        statusInput.value = DEFAULT_STATUS_FILTER;
        applyClientFilters();
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        applyClientFilters();
    });

    ['input', 'change'].forEach((eventName) => {
        form.addEventListener(eventName, (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
                return;
            }
            debouncedApplyFilters();
        });
    });

    setFilterPanelExpanded(false);
    void loadHousingDataset();
})();
