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
    const searchForm = document.getElementById('housing-map-search-form');
    const searchInput = document.getElementById('housing-map-search-input');
    const searchBtn = document.getElementById('housing-map-search-btn');
    const applyBtn = document.getElementById('filter-apply-btn');
    const resetBtn = document.getElementById('filter-reset-btn');
    const loadMoreBtn = document.getElementById('housing-load-more-btn');
    const loadMoreWrap = document.getElementById('housing-load-more-wrap');
    const filterToggleBtn = document.getElementById('housing-filter-toggle');
    const filterControlsEl = document.getElementById('housing-filter-controls');
    const statusInput = document.getElementById('filter-status');
    const typeInput = document.getElementById('filter-type');
    const transportTypeInput = document.getElementById('filter-transport-type');
    const PUBLIC_STATUS_FILTER = 'AVAILABLE,RENTED';
    const SUPERADMIN_STATUS_FILTER = 'AVAILABLE,RENTED,HIDDEN';
    const INITIAL_VISIBLE_COUNT = 10;
    const LOAD_MORE_STEP = 5;
    const DATASET_LIMIT = 1000;
    const SESSION_CACHE_KEY_PREFIX = 'svp-housing-map-dataset-v3';
    const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;
    const SEARCH_FIELD_WEIGHTS = Object.freeze({
        title: 700,
        price: 600,
        description: 500,
        city: 400,
        arrondissement: 300,
        region: 200,
        other: 100
    });

    if (!form || !listEl || !metaEl || !mapEl || !searchForm || !searchInput || !searchBtn || !applyBtn || !resetBtn || !loadMoreBtn || !loadMoreWrap || !filterToggleBtn || !filterControlsEl || !statusInput || !typeInput || !transportTypeInput) {
        return;
    }

    const setMapStatus = (message) => {
        if (mapStatusEl) {
            const safeMessage = String(message || '').trim();
            mapStatusEl.textContent = safeMessage;
            mapStatusEl.hidden = !safeMessage;
        }
    };

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
        activeSearchQuery: '',
        requestToken: 0,
        datasetHasMore: false,
        hasAutoFocusedInitialPins: false,
        isAutoFittingMap: false,
        userMovedMap: false,
        viewerScope: 'public',
        isSuperadmin: false,
        accessToken: '',
        defaultStatusFilter: PUBLIC_STATUS_FILTER
    };

    const hasValidCoordinates = (item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));

    const normalizeText = (value) => String(value || '')
        .trim()
        .toLowerCase();

    const normalizeSearchText = (value) => String(value || '')
        .replace(/[đĐ]/g, (char) => (char === 'Đ' ? 'D' : 'd'))
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9€/\s.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const stripHtmlToText = (value) => {
        const template = document.createElement('template');
        template.innerHTML = String(value || '');
        return String(template.content.textContent || '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const statusPriority = (value) => {
        switch (String(value || '').trim().toUpperCase()) {
            case 'AVAILABLE':
                return 0;
            case 'RENTED':
                return 1;
            default:
                return 2;
        }
    };

    const buildSearchDescriptor = (value) => {
        const raw = String(value || '').trim();
        const normalized = normalizeSearchText(raw);
        const terms = Array.from(new Set(normalized.split(' ').filter(Boolean)));
        return { raw, normalized, terms };
    };

    const normalizeSearchFieldValues = (values) => values
        .map((value) => normalizeSearchText(value))
        .filter(Boolean);

    const buildSearchIndex = (item) => {
        const transitPoints = Array.isArray(item.transitPoints) ? item.transitPoints : [];
        const transitBlob = transitPoints.map((point) => [
            point.stationName,
            point.transportType,
            point.transportLabel,
            point.transportIcon,
            point.lineLabel,
            point.walkingMinutes
        ].filter(Boolean).join(' ')).join(' ');
        const priceValues = [];
        const numericPrice = Number(item.price);
        if (Number.isFinite(numericPrice)) {
            priceValues.push(String(numericPrice));
        }
        if (item.priceLabel) {
            priceValues.push(item.priceLabel);
        }
        const formattedPrice = shared.formatPrice(item.price);
        if (formattedPrice) {
            priceValues.push(formattedPrice);
        }
        return {
            title: normalizeSearchFieldValues([item.title]),
            price: normalizeSearchFieldValues(priceValues),
            description: normalizeSearchFieldValues([stripHtmlToText(item.description)]),
            city: normalizeSearchFieldValues([item.city]),
            arrondissement: normalizeSearchFieldValues([item.arrondissement]),
            region: normalizeSearchFieldValues([item.addressText]),
            other: normalizeSearchFieldValues([
                item.propertyType,
                item.propertyTypeLabel || shared.propertyTypeLabel(item.propertyType),
                item.status,
                item.cafEligible ? 'caf' : '',
                item.cafEligible ? 'co caf' : '',
                ...(Array.isArray(item.tags) ? item.tags : []),
                item.primaryTransit && item.primaryTransit.stationName,
                item.primaryTransit && item.primaryTransit.transportType,
                item.primaryTransit && item.primaryTransit.lineLabel,
                transitBlob
            ])
        };
    };

    const buildSearchableItems = (items) => (Array.isArray(items) ? items : []).map((item) => ({
        ...item,
        __searchIndex: buildSearchIndex(item)
    }));

    const matchTermScore = (term, fieldValues, weight) => {
        if (!term || !Array.isArray(fieldValues) || !fieldValues.length) {
            return 0;
        }
        let best = 0;
        for (const fieldValue of fieldValues) {
            const value = String(fieldValue || '').trim();
            if (!value) {
                continue;
            }
            const padded = ` ${value} `;
            if (value === term) {
                best = Math.max(best, weight + 120);
                continue;
            }
            if (value.startsWith(term)) {
                best = Math.max(best, weight + 80);
                continue;
            }
            if (padded.includes(` ${term} `)) {
                best = Math.max(best, weight + 60);
                continue;
            }
            if (value.includes(term)) {
                best = Math.max(best, weight + 30);
            }
        }
        return best;
    };

    const computePhraseBonus = (descriptor, searchIndex) => {
        const query = descriptor && descriptor.normalized ? descriptor.normalized : '';
        if (!query) {
            return 0;
        }
        const checks = [
            { values: searchIndex.title, bonus: 180 },
            { values: searchIndex.price, bonus: 155 },
            { values: searchIndex.description, bonus: 130 },
            { values: searchIndex.city, bonus: 105 },
            { values: searchIndex.arrondissement, bonus: 90 },
            { values: searchIndex.region, bonus: 75 },
            { values: searchIndex.other, bonus: 45 }
        ];
        for (const check of checks) {
            if (check.values.some((value) => value.includes(query))) {
                return check.bonus;
            }
        }
        return 0;
    };

    const computeSearchScore = (item, descriptor) => {
        if (!descriptor || !descriptor.terms.length) {
            return 0;
        }
        const searchIndex = item && item.__searchIndex ? item.__searchIndex : buildSearchIndex(item || {});
        let total = 0;
        for (const term of descriptor.terms) {
            const best = Math.max(
                matchTermScore(term, searchIndex.title, SEARCH_FIELD_WEIGHTS.title),
                matchTermScore(term, searchIndex.price, SEARCH_FIELD_WEIGHTS.price),
                matchTermScore(term, searchIndex.description, SEARCH_FIELD_WEIGHTS.description),
                matchTermScore(term, searchIndex.city, SEARCH_FIELD_WEIGHTS.city),
                matchTermScore(term, searchIndex.arrondissement, SEARCH_FIELD_WEIGHTS.arrondissement),
                matchTermScore(term, searchIndex.region, SEARCH_FIELD_WEIGHTS.region),
                matchTermScore(term, searchIndex.other, SEARCH_FIELD_WEIGHTS.other)
            );
            if (!best) {
                return 0;
            }
            total += best;
        }
        return total + computePhraseBonus(descriptor, searchIndex);
    };

    const compareRankedResults = (left, right) => {
        if (right.searchScore !== left.searchScore) {
            return right.searchScore - left.searchScore;
        }
        const statusDiff = statusPriority(left.item.status) - statusPriority(right.item.status);
        if (statusDiff !== 0) {
            return statusDiff;
        }
        const createdDiff = String(right.item.createdAt || '').localeCompare(String(left.item.createdAt || ''));
        if (createdDiff !== 0) {
            return createdDiff;
        }
        return String(left.item.id || '').localeCompare(String(right.item.id || ''));
    };

    const activateSearchQuery = () => {
        state.activeSearchQuery = String(searchInput.value || '').trim();
    };

    const hasActiveSearchQuery = () => Boolean(String(state.activeSearchQuery || '').trim());

    const getActiveSearchQuery = () => String(state.activeSearchQuery || '').trim();

    const parseJwtPayload = (token) => {
        const value = String(token || '').trim();
        if (!value) {
            return null;
        }
        const segments = value.split('.');
        if (segments.length < 2 || !segments[1]) {
            return null;
        }
        try {
            const normalized = segments[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
            return JSON.parse(window.atob(padded));
        } catch (_) {
            return null;
        }
    };

    const parseOptionalNumber = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return null;
        }
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const formatLoadedCount = (count) => `${count}${state.datasetHasMore ? '+' : ''}`;

    const getSessionCacheKey = () => `${SESSION_CACHE_KEY_PREFIX}:${state.viewerScope}`;

    const configureStatusOptions = () => {
        statusInput.innerHTML = '';
        const options = state.isSuperadmin
            ? [
                { value: SUPERADMIN_STATUS_FILTER, label: 'Tất cả: Trống + Đã thuê + Ẩn' },
                { value: PUBLIC_STATUS_FILTER, label: 'Còn trống + Đã thuê' },
                { value: 'AVAILABLE', label: 'Còn trống' },
                { value: 'RENTED', label: 'Đã thuê' },
                { value: 'HIDDEN', label: 'Ẩn' }
            ]
            : [
                { value: PUBLIC_STATUS_FILTER, label: 'Còn trống + Đã thuê' },
                { value: 'AVAILABLE', label: 'Còn trống' },
                { value: 'RENTED', label: 'Đã thuê' }
            ];
        options.forEach((item) => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            statusInput.appendChild(option);
        });
        statusInput.value = state.defaultStatusFilter;
    };

    const initializeViewerAccess = async () => {
        const token = await shared.getAccessToken();
        const payload = parseJwtPayload(token);
        const role = String(payload && payload.role || '').trim().toUpperCase();
        state.isSuperadmin = role === 'SUPERADMIN';
        state.viewerScope = state.isSuperadmin ? 'superadmin' : 'public';
        state.accessToken = state.isSuperadmin ? token : '';
        state.defaultStatusFilter = state.isSuperadmin ? SUPERADMIN_STATUS_FILTER : PUBLIC_STATUS_FILTER;
        configureStatusOptions();
    };

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

    const fitMapToFilteredPins = () => {
        const bounds = buildItemsBounds(state.filteredItems);
        if (!bounds) {
            return;
        }
        state.isAutoFittingMap = true;
        map.fitBounds(bounds, {
            padding: [34, 34],
            maxZoom: 14
        });
        window.setTimeout(() => {
            state.isAutoFittingMap = false;
        }, 0);
    };

    const openListingDetail = (item) => {
        const value = String(item?.id || '').trim();
        if (!value) {
            return;
        }
        window.location.href = shared.buildHousingDetailHref(value, item?.title || '');
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

    const formatViewCountLabel = (value) => `${(Number.isFinite(Number(value)) ? Number(value) : 0).toLocaleString('vi-VN')} lượt xem`;

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
        if (!state.isSuperadmin) {
            metaEl.textContent = '';
            metaEl.hidden = true;
            return;
        }
        metaEl.hidden = false;
        if (!state.items.length) {
            metaEl.textContent = 'Chưa có tin để hiển thị';
            return;
        }
        const total = state.filteredItems.length;
        const visible = Math.min(total, state.visibleCount);
        const totalLabel = total === state.items.length ? formatLoadedCount(total) : String(total);
        if (hasActiveSearchQuery()) {
            metaEl.textContent = `${totalLabel} tin khớp "${getActiveSearchQuery()}" • đang hiện ${visible} bên trái`;
            return;
        }
        metaEl.textContent = `${totalLabel} tin phù hợp • đang hiện ${visible} bên trái`;
    };

    const renderList = () => {
        if (!state.filteredItems.length) {
            listEl.innerHTML = `<div class="sv-housing-empty">${
                hasActiveSearchQuery()
                    ? 'Chưa có tin phù hợp với từ khóa hoặc bộ lọc hiện tại.'
                    : 'Chưa có tin phù hợp với bộ lọc hiện tại.'
            }</div>`;
            updateLoadMoreButton();
            renderMeta();
            return;
        }
        const visibleItems = state.filteredItems.slice(0, state.visibleCount);
        listEl.innerHTML = visibleItems.map((item) => {
            const statusMeta = shared.statusMeta(item.status);
            const tags = Array.isArray(item.tags) ? item.tags.slice(0, 4) : [];
            const image = item.primaryImageUrl || 'assets/img/forum_svp_background.png';
            const href = shared.buildHousingDetailHref(item.id, item.title || '');
            return `
                <a class="sv-housing-card" href="${shared.escapeHtml(href)}" data-listing-id="${shared.escapeHtml(item.id)}">
                    <div class="sv-housing-card__media">
                        <img class="sv-housing-card__image" src="${shared.escapeHtml(image)}" alt="${shared.escapeHtml(item.title || 'Housing image')}">
                    </div>
                    <div class="sv-housing-card__content">
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <div class="sv-housing-price">${shared.escapeHtml(item.priceLabel || shared.formatPrice(item.price))}</div>
                            <span class="sv-housing-badge ${statusMeta.className}">${shared.escapeHtml(statusMeta.label)}</span>
                        </div>
                        <div>
                            <strong>${shared.escapeHtml(item.title || 'Tin thuê nhà')}</strong>
                            <div class="sv-housing-meta mt-1">${shared.escapeHtml(item.city || '')}${item.arrondissement ? ` • ${shared.escapeHtml(item.arrondissement)}` : ''}${item.areaM2 ? ` • ${shared.escapeHtml(String(item.areaM2))}m²` : ''} • ${shared.escapeHtml(formatViewCountLabel(item.viewCount))}</div>
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
            marker.on('click', () => openListingDetail(item));
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
            setMapStatus(state.isSuperadmin
                ? 'Chưa có pin nào để hiển thị.'
                : 'Chưa có pin công khai để hiển thị.');
            return;
        }
        const filteredCount = state.filteredItems.length;
        const loadedCount = formatLoadedCount(state.items.length);
        const scopeLabel = state.isSuperadmin ? 'toàn bộ' : 'công khai';
        if (!filteredCount) {
            if (hasActiveSearchQuery()) {
                setMapStatus(`Đã tải ${loadedCount} tin ${scopeLabel}. Từ khóa "${getActiveSearchQuery()}" chưa khớp tin nào với bộ lọc hiện tại.`);
                return;
            }
            setMapStatus(`Đã tải ${loadedCount} tin ${scopeLabel}. Bộ lọc hiện tại chưa khớp tin nào.`);
            return;
        }
        setMapStatus('');
    };

    const applyClientFilters = ({ resetVisibleCount = true } = {}) => {
        const filters = buildFilterState();
        const searchDescriptor = buildSearchDescriptor(state.activeSearchQuery);
        const rankedItems = [];
        state.items.forEach((item) => {
            if (!matchesFilters(item, filters)) {
                return;
            }
            const searchScore = searchDescriptor.terms.length
                ? computeSearchScore(item, searchDescriptor)
                : 0;
            if (searchDescriptor.terms.length && searchScore <= 0) {
                return;
            }
            rankedItems.push({ item, searchScore });
        });
        if (searchDescriptor.terms.length) {
            rankedItems.sort(compareRankedResults);
        }
        state.filteredItems = rankedItems.map((entry) => entry.item);
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
            const raw = window.sessionStorage.getItem(getSessionCacheKey());
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
            window.sessionStorage.setItem(getSessionCacheKey(), JSON.stringify({
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
            state.items = buildSearchableItems(cachedPayload.items);
            state.datasetHasMore = Boolean(cachedPayload.hasMore);
            applyClientFilters();
            fitMapToInitialPins();
            return;
        }

        const requestToken = ++state.requestToken;
        metaEl.textContent = 'Đang tải...';
        setMapStatus(state.isSuperadmin
            ? 'Đang tải toàn bộ pin cho superadmin...'
            : 'Đang tải pin công khai cho bản đồ...');
        try {
            const params = new URLSearchParams({
                limit: String(DATASET_LIMIT),
                status: state.defaultStatusFilter
            });
            const headers = { Accept: 'application/json' };
            if (state.accessToken) {
                headers.Authorization = `Bearer ${state.accessToken}`;
            }
            const requestOptions = { headers };
            if (state.accessToken) {
                requestOptions.cache = 'no-store';
            }
            const payload = await shared.fetchJson(`${shared.API_BASE_URL}/api/housing?${params.toString()}`, requestOptions);
            if (requestToken !== state.requestToken) {
                return;
            }
            state.items = buildSearchableItems(payload.items);
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
            setMapStatus(state.isSuperadmin && error && error.message
                ? error.message
                : 'Không thể tải danh sách nhà.');
        }
    };

    const setFilterPanelExpanded = (expanded) => {
        filterControlsEl.hidden = !expanded;
        filterToggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    };

    const showResultsAfterFilterApply = () => {
        setFilterPanelExpanded(false);
        if (typeof listEl.scrollIntoView === 'function') {
            listEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
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
        activateSearchQuery();
        applyClientFilters();
        fitMapToFilteredPins();
        showResultsAfterFilterApply();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        searchInput.value = '';
        state.activeSearchQuery = '';
        statusInput.value = state.defaultStatusFilter;
        applyClientFilters();
        fitMapToFilteredPins();
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        applyClientFilters();
        fitMapToFilteredPins();
        showResultsAfterFilterApply();
    });

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        activateSearchQuery();
        applyClientFilters();
        fitMapToFilteredPins();
    });

    const initializePage = async () => {
        await initializeViewerAccess();
        setFilterPanelExpanded(false);
        await loadHousingDataset();
    };

    window.setTimeout(() => {
        void initializePage();
    }, 0);
})();
