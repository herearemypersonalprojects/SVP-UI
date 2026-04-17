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
        marker() {
            return {
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
    installHousingMapLeafletStub(window);
    window.SVP_API_BASE_URL = 'https://api.svp.test';
    window.SVPAuth = {
        getValidAccessToken: async () => options.accessToken || ''
    };

    runScript(dom, 'housing-shared.js');
    runScript(dom, 'housing-map.js');
    await flushAsync(window, 12);
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

    assert.deepEqual(readIds(), [
        'other-650',
        'region-650',
        'arrondissement-650',
        'city-650',
        'desc-650',
        'price-650',
        'title-650'
    ]);
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
