const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    makeJsonResponse,
    runScript
} = require('./dom-test-helpers.cjs');

function installHousingMapLeafletStub(window) {
    const handlers = new Map();
    const map = {
        _layers: new Set(),
        setView() {
            return this;
        },
        addLayer(layer) {
            this._layers.add(layer);
            return this;
        },
        on(eventName, handler) {
            const next = handlers.get(eventName) || [];
            next.push(handler);
            handlers.set(eventName, next);
            return this;
        },
        fitBounds(bounds) {
            this._lastBounds = bounds;
            return this;
        }
    };

    const clusterGroup = {
        _layers: [],
        clearLayers() {
            this._layers = [];
            return this;
        },
        addLayer(layer) {
            this._layers.push(layer);
            return this;
        }
    };

    window.L = {
        map() {
            return map;
        },
        tileLayer() {
            return {
                addTo(target) {
                    if (target && typeof target.addLayer === 'function') {
                        target.addLayer(this);
                    }
                    return this;
                }
            };
        },
        markerClusterGroup() {
            return clusterGroup;
        },
        marker(coords, options = {}) {
            return {
                coords,
                options,
                on() {
                    return this;
                }
            };
        },
        divIcon(options) {
            return options;
        },
        latLng(lat, lng) {
            return { lat: Number(lat), lng: Number(lng) };
        },
        latLngBounds(points) {
            return {
                points,
                isValid() {
                    return Array.isArray(points) && points.length > 0;
                }
            };
        }
    };

    return { map, clusterGroup };
}

function makeJwt(payload) {
    const encode = (value) => Buffer.from(JSON.stringify(value))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

async function loadHousingMapPage(fetch, options = {}) {
    const dom = createDomFromHtml('ban-do-thue-nha.html', {
        url: 'https://svpforum.fr/ban-do-thue-nha.html',
        fetch
    });
    const { window } = dom;
    const leaflet = installHousingMapLeafletStub(window);
    window.SVP_API_BASE_URL = 'https://api.svp.test';
    window.SVPAuth = {
        getValidAccessToken: async () => options.accessToken || ''
    };

    runScript(dom, 'housing-shared.js');
    runScript(dom, 'housing-map.js');
    await flushAsync(window, 12);
    dom.leaflet = leaflet;
    return dom;
}

function makeListing(overrides = {}) {
    return {
        id: overrides.id || 'listing-default',
        title: overrides.title || 'Studio Paris',
        description: overrides.description || '<p>Mo ta hop le.</p>',
        price: overrides.price ?? 900,
        priceLabel: overrides.priceLabel || '',
        areaM2: overrides.areaM2 ?? 19,
        latitude: overrides.latitude ?? 48.8271,
        longitude: overrides.longitude ?? 2.3561,
        addressText: overrides.addressText || 'Tolbiac',
        city: overrides.city || 'Paris',
        arrondissement: overrides.arrondissement || '13',
        propertyType: overrides.propertyType || 'STUDIO',
        propertyTypeLabel: overrides.propertyTypeLabel || 'Studio',
        tags: overrides.tags || [],
        cafEligible: overrides.cafEligible ?? true,
        status: overrides.status || 'AVAILABLE',
        featured: Boolean(overrides.featured ?? false),
        viewCount: overrides.viewCount ?? 10,
        createdAt: overrides.createdAt || '2026-04-01T10:00:00Z',
        primaryImageUrl: overrides.primaryImageUrl || 'https://cdn.svp.test/housing/cover.jpg',
        primaryTransit: overrides.primaryTransit || {
            stationName: 'Tolbiac',
            transportType: 'METRO',
            lineLabel: 'M7',
            walkingMinutes: 4,
            transportIcon: '🚇'
        },
        transitPoints: overrides.transitPoints || [
            {
                stationName: 'Tolbiac',
                transportType: 'METRO',
                lineLabel: 'M7',
                walkingMinutes: 4,
                transportIcon: '🚇'
            }
        ]
    };
}

function readCardFormatSignatures(document) {
    return Array.from(document.querySelectorAll('#housing-list .sv-housing-card'))
        .map((card) => {
            const children = Array.from(card.children);
            const media = children[0];
            const image = media ? media.querySelector('.sv-housing-card__image') : null;
            const content = children[1];
            return [
                card.tagName.toLowerCase(),
                card.className,
                children.length,
                media ? media.tagName.toLowerCase() : '',
                media ? media.className : '',
                image ? image.tagName.toLowerCase() : '',
                image ? image.className : '',
                content ? content.tagName.toLowerCase() : '',
                content ? content.className : '',
                content && content.querySelector('.sv-housing-price') ? 'price' : '',
                content && content.querySelector('.sv-housing-badge') ? 'badge' : '',
                content && content.querySelector('.sv-housing-tags') ? 'tags' : ''
            ].join('|');
        });
}

function readListIds(document) {
    return Array.from(document.querySelectorAll('#housing-list [data-listing-id]'))
        .map((element) => element.getAttribute('data-listing-id'));
}

test('housing map applies explicit keyword search and ranks matches by field priority', async () => {
    const payload = {
        items: [
            makeListing({ id: 'other-650', tags: ['tram 650'], createdAt: '2026-04-01T10:00:07Z' }),
            makeListing({ id: 'region-650', addressText: 'Zone 650', createdAt: '2026-04-01T10:00:06Z' }),
            makeListing({ id: 'arrondissement-650', arrondissement: '650', createdAt: '2026-04-01T10:00:05Z' }),
            makeListing({ id: 'city-650', city: 'Ville 650', createdAt: '2026-04-01T10:00:04Z' }),
            makeListing({ id: 'desc-650', description: '<p>Loyer 650 charges comprises, proche fac.</p>', createdAt: '2026-04-01T10:00:03Z' }),
            makeListing({ id: 'price-650', price: 650, createdAt: '2026-04-01T10:00:02Z' }),
            makeListing({ id: 'title-650', title: 'Studio 650 Tolbiac', createdAt: '2026-04-01T10:00:01Z' })
        ],
        hasMore: false,
        limit: 1000
    };

    const dom = await loadHousingMapPage(async (targetUrl) => {
        assert.match(String(targetUrl), /^https:\/\/api\.svp\.test\/api\/housing\?/);
        return makeJsonResponse(payload);
    });
    const { document } = dom.window;

    const readIds = () => Array.from(document.querySelectorAll('#housing-list [data-listing-id]'))
        .map((element) => element.getAttribute('data-listing-id'));
    const expectedCardFormat = 'a|sv-housing-card|2|div|sv-housing-card__media|img|sv-housing-card__image|div|sv-housing-card__content|price|badge|tags';

    assert.deepEqual(readIds(), [
        'other-650',
        'region-650',
        'arrondissement-650',
        'city-650',
        'desc-650',
        'price-650',
        'title-650'
    ]);
    assert.equal(readCardFormatSignatures(document).length, 7);
    assert.equal(readCardFormatSignatures(document).every((signature) => signature === expectedCardFormat), true);
    assert.equal(document.getElementById('housing-map-status').textContent, '');
    assert.equal(document.getElementById('housing-map-status').hidden, true);

    const searchInput = document.getElementById('housing-map-search-input');
    searchInput.value = '650';
    searchInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await flushAsync(dom.window, 6);

    assert.deepEqual(readIds(), [
        'other-650',
        'region-650',
        'arrondissement-650',
        'city-650',
        'desc-650',
        'price-650',
        'title-650'
    ]);
    assert.equal(readCardFormatSignatures(document).length, 7);
    assert.equal(readCardFormatSignatures(document).every((signature) => signature === expectedCardFormat), true);

    document.getElementById('housing-map-search-form')
        .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 6);

    assert.deepEqual(readIds(), [
        'title-650',
        'price-650',
        'desc-650',
        'city-650',
        'arrondissement-650',
        'region-650',
        'other-650'
    ]);
    assert.equal(readCardFormatSignatures(document).length, 7);
    assert.equal(readCardFormatSignatures(document).every((signature) => signature === expectedCardFormat), true);
    assert.equal(
        document.querySelector('#housing-list [data-listing-id="title-650"]').getAttribute('href'),
        '/housing/title-650/studio-650-tolbiac'
    );
    const resultsMeta = document.getElementById('housing-results-meta');
    assert.equal(resultsMeta.hidden, true);
    assert.equal(resultsMeta.textContent, '');
    assert.equal(document.getElementById('housing-map-status').textContent, '');
    assert.equal(document.getElementById('housing-map-status').hidden, true);
});

test('housing map puts featured listings first and renders featured pins larger', async () => {
    const payload = {
        items: [
            makeListing({ id: 'new-normal', title: 'Studio mới', createdAt: '2026-04-03T10:00:00Z', featured: false }),
            makeListing({ id: 'old-featured', title: 'Studio nổi bật', createdAt: '2026-04-01T10:00:00Z', featured: true }),
            makeListing({ id: 'older-normal', title: 'Studio thường', createdAt: '2026-03-30T10:00:00Z', featured: false })
        ],
        hasMore: false,
        limit: 1000
    };

    const dom = await loadHousingMapPage(async () => makeJsonResponse(payload));
    const { document } = dom.window;
    const { clusterGroup } = dom.leaflet;

    assert.deepEqual(readListIds(document), ['old-featured', 'new-normal', 'older-normal']);
    assert.ok(document.querySelector('#housing-list [data-listing-id="old-featured"].sv-housing-card--featured'));

    const featuredIcon = clusterGroup._layers
        .map((layer) => layer.options.icon)
        .find((icon) => String(icon.html || '').includes('housing-price-pin--featured'));
    assert.ok(featuredIcon);
    assert.deepEqual(Array.from(featuredIcon.iconSize), [88, 44]);
    assert.match(String(featuredIcon.html || ''), /fa-star/);
});

test('housing map shows featured styling to public visitors without admin controls', async () => {
    const payload = {
        items: [
            makeListing({ id: 'public-normal', title: 'Studio public', createdAt: '2026-04-03T10:00:00Z', featured: false }),
            makeListing({ id: 'public-featured', title: 'Studio public nổi bật', createdAt: '2026-04-01T10:00:00Z', featured: true })
        ],
        hasMore: false,
        limit: 1000
    };

    const dom = await loadHousingMapPage(async () => makeJsonResponse(payload));
    const { document } = dom.window;

    assert.deepEqual(readListIds(document), ['public-featured', 'public-normal']);
    assert.ok(document.querySelector('#housing-list [data-listing-id="public-featured"].sv-housing-card--featured'));
    assert.match(document.getElementById('housing-list').textContent, /Nổi bật/);
    assert.equal(document.querySelector('[data-feature-toggle-id="public-featured"]'), null);
});

test('housing map lets SUPERADMIN toggle featured listings from cards', async () => {
    const payload = {
        items: [
            makeListing({ id: 'normal-first', title: 'Studio thường mới', createdAt: '2026-04-03T10:00:00Z', featured: false }),
            makeListing({ id: 'normal-second', title: 'Studio thường cũ', createdAt: '2026-04-01T10:00:00Z', featured: false })
        ],
        hasMore: false,
        limit: 1000
    };
    const updates = [];
    const superadminToken = makeJwt({ role: 'SUPERADMIN' });

    const dom = await loadHousingMapPage(async (targetUrl, options = {}) => {
        const url = new URL(String(targetUrl));
        const method = String(options?.method || 'GET').toUpperCase();
        if (url.pathname === '/api/housing' && method === 'GET') {
            return makeJsonResponse(payload);
        }
        if (url.pathname.endsWith('/api/housing/normal-second/featured') && method === 'PUT') {
            updates.push({
                authorization: options.headers.get('Authorization'),
                body: JSON.parse(String(options.body || '{}'))
            });
            return makeJsonResponse({ listingId: 'normal-second', featured: true });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    }, {
        accessToken: superadminToken
    });
    const { document } = dom.window;

    assert.deepEqual(readListIds(document), ['normal-first', 'normal-second']);
    const toggle = document.querySelector('[data-feature-toggle-id="normal-second"]');
    assert.ok(toggle);
    toggle.click();
    await flushAsync(dom.window, 8);

    assert.deepEqual(updates, [{
        authorization: `Bearer ${superadminToken}`,
        body: { featured: true }
    }]);
    assert.deepEqual(readListIds(document), ['normal-second', 'normal-first']);
    assert.equal(document.querySelector('[data-feature-toggle-id="normal-second"]').getAttribute('aria-pressed'), 'true');
    assert.match(document.getElementById('housing-map-status').textContent, /Đã đặt tin nổi bật/);
});

test('housing map shows result meta for SUPERADMIN only', async () => {
    const payload = {
        items: [
            makeListing({ id: 'visible-1', title: 'Studio Paris' }),
            makeListing({ id: 'visible-2', title: 'Chambre Lyon', city: 'Lyon' })
        ],
        hasMore: false,
        limit: 1000
    };

    const publicDom = await loadHousingMapPage(async () => makeJsonResponse(payload));
    const publicMeta = publicDom.window.document.getElementById('housing-results-meta');
    assert.equal(publicMeta.hidden, true);
    assert.equal(publicMeta.textContent, '');

    const superadminDom = await loadHousingMapPage(
        async () => makeJsonResponse(payload),
        { accessToken: makeJwt({ role: 'SUPERADMIN' }) }
    );
    const superadminMeta = superadminDom.window.document.getElementById('housing-results-meta');
    assert.equal(superadminMeta.hidden, false);
    assert.match(superadminMeta.textContent, /2 tin phù hợp • đang hiện 2 bên trái/);
});

test('housing map collapses filter controls after applying filters', async () => {
    const payload = {
        items: [
            makeListing({ id: 'paris-1', title: 'Studio Paris', city: 'Paris', latitude: 48.8566, longitude: 2.3522 }),
            makeListing({ id: 'lyon-1', title: 'Chambre Lyon', city: 'Lyon', latitude: 45.764, longitude: 4.8357 })
        ],
        hasMore: false,
        limit: 1000
    };

    const dom = await loadHousingMapPage(async () => makeJsonResponse(payload));
    const { document, HTMLElement } = dom.window;
    const { map } = dom.leaflet;
    const filterToggle = document.getElementById('housing-filter-toggle');
    const filterControls = document.getElementById('housing-filter-controls');
    const cityInput = document.getElementById('filter-city');
    const applyButton = document.getElementById('filter-apply-btn');
    const scrolledTargets = [];

    HTMLElement.prototype.scrollIntoView = function scrollIntoView(options) {
        scrolledTargets.push({ id: this.id, options });
    };

    filterToggle.click();
    assert.equal(filterControls.hidden, false);
    assert.equal(filterToggle.getAttribute('aria-expanded'), 'true');

    const readVisibleIds = () => Array.from(document.querySelectorAll('#housing-list [data-listing-id]'))
        .map((element) => element.getAttribute('data-listing-id'));

    cityInput.value = 'Lyon';
    cityInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await flushAsync(dom.window, 8);

    assert.deepEqual(readVisibleIds(), ['paris-1', 'lyon-1']);
    assert.equal(filterControls.hidden, false);

    applyButton.click();
    await flushAsync(dom.window, 2);

    assert.deepEqual(readVisibleIds(), ['lyon-1']);
    assert.equal(filterControls.hidden, true);
    assert.equal(filterToggle.getAttribute('aria-expanded'), 'false');
    assert.equal(scrolledTargets.length, 1);
    assert.equal(scrolledTargets[0].id, 'housing-list');
    assert.equal(scrolledTargets[0].options.block, 'start');
    assert.equal(scrolledTargets[0].options.behavior, 'smooth');
    assert.equal(map._lastBounds.points.length, 1);
    assert.equal(map._lastBounds.points[0].lat, 45.764);
    assert.equal(map._lastBounds.points[0].lng, 4.8357);
});
