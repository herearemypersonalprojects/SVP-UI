const test = require('node:test');
const assert = require('node:assert/strict');

const { createDom, makeJsonResponse } = require('./dom-test-helpers.cjs');
const {
    FEATURED_BOOTSTRAP_ITEMS,
    createParisMapApp,
    pickViewportItems,
    prepareMonuments
} = require('../paris-map.js');

function createLeafletStub(initialBounds) {
    const handlers = new Map();
    const map = {
        _zoom: 12,
        _bounds: initialBounds,
        _layers: new Set(),
        on(eventName, handler) {
            const next = handlers.get(eventName) || [];
            next.push(handler);
            handlers.set(eventName, next);
            return this;
        },
        emit(eventName) {
            (handlers.get(eventName) || []).forEach((handler) => handler());
            return this;
        },
        setView(center, zoom) {
            this._center = Array.isArray(center) ? center.slice() : [center.lat, center.lng];
            if (Number.isFinite(Number(zoom))) {
                this._zoom = Number(zoom);
            }
            return this;
        },
        fitBounds(points) {
            this._lastFitBounds = points;
            return this;
        },
        flyTo(center, zoom) {
            this._lastFlyTo = {
                center: Array.isArray(center) ? center.slice() : [center.lat, center.lng],
                zoom: Number(zoom)
            };
            this._center = this._lastFlyTo.center.slice();
            this._zoom = this._lastFlyTo.zoom;
            return this;
        },
        getZoom() {
            return this._zoom;
        },
        getBounds() {
            return this._bounds;
        },
        setBounds(bounds) {
            this._bounds = bounds;
            return this;
        },
        addLayer(layer) {
            this._layers.add(layer);
            return this;
        },
        removeLayer(layer) {
            this._layers.delete(layer);
            return this;
        }
    };

    const L = {
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
        divIcon(options) {
            return options;
        },
        marker(latlng, options = {}) {
            const markerHandlers = {};
            return {
                _latlng: Array.isArray(latlng)
                    ? { lat: Number(latlng[0]), lng: Number(latlng[1]) }
                    : { lat: Number(latlng.lat), lng: Number(latlng.lng) },
                _options: options,
                addTo(target) {
                    this._map = target;
                    if (target && typeof target.addLayer === 'function') {
                        target.addLayer(this);
                    }
                    return this;
                },
                bindPopup(html) {
                    this._popup = html;
                    return this;
                },
                openPopup() {
                    this._popupOpened = true;
                    return this;
                },
                on(eventName, handler) {
                    markerHandlers[eventName] = handler;
                    return this;
                },
                trigger(eventName) {
                    if (markerHandlers[eventName]) {
                        markerHandlers[eventName]({ target: this });
                    }
                }
            };
        }
    };

    return { L, map };
}

function createParisDom() {
    const dom = createDom({
        html: `
            <!doctype html>
            <html lang="vi">
            <body>
                <div id="parisMap"></div>
                <div id="parisModeEyebrow"></div>
                <div id="parisModeTitle"></div>
                <div id="parisModeSubtitle"></div>
                <div id="parisViewportSummary"></div>
                <div id="parisDistrictChips"></div>
                <div id="parisMapMeta"></div>
                <div id="parisPoiList"></div>
                <button type="button" data-reset-featured>Top 10</button>
            </body>
            </html>
        `,
        url: 'https://svpforum.fr/ban-do-paris.html'
    });

    dom.window.HTMLElement.prototype.scrollIntoView = function () {
        this.setAttribute('data-scrolled', 'true');
    };

    return dom;
}

test('prepareMonuments keeps Paris entries and tags featured ranks', () => {
    const items = prepareMonuments([
        ...FEATURED_BOOTSTRAP_ITEMS,
        {
            reference: 'OUTSIDE-1',
            name_vn: 'Chateau hors Paris',
            address_vn: 'Versailles',
            commune_forme_index: 'Versailles',
            lat: 48.8049,
            lon: 2.1204,
            score: 0.9
        }
    ]);

    assert.equal(items.length, FEATURED_BOOTSTRAP_ITEMS.length);
    assert.equal(items[0].reference, 'PA00088801');
    assert.equal(items[0].__featuredRank, 1);
    assert.match(items[0].__teaser, /Paris/i);
});

test('pickViewportItems returns top visible items and total visible count', () => {
    const items = prepareMonuments(FEATURED_BOOTSTRAP_ITEMS);
    const result = pickViewportItems(items, {
        south: 48.85,
        west: 2.28,
        north: 48.88,
        east: 2.33,
        center: { lat: 48.865, lng: 2.305 }
    });

    assert.equal(result.visibleCount, 5);
    assert.equal(result.items[0].reference, 'PA00088801');
    assert.equal(result.items[1].reference, 'PA00088804');
});

test('Paris map app renders featured list, list click moves map, and viewport move refreshes cards', async () => {
    const dom = createParisDom();
    const extraViewportItems = [
        {
            reference: 'PA-TEST-EAST-1',
            name_vn: 'Belvedere Menilmontant',
            address_vn: 'Quận 20 Paris',
            commune_forme_index: 'Paris 20e Arrondissement',
            lat: 48.8699,
            lon: 2.3939,
            score: 0.91,
            category_vn: 'quảng trường',
            story_vn: 'Một điểm nhìn về phía đông Paris.'
        },
        {
            reference: 'PA-TEST-EAST-2',
            name_vn: 'Passage Belleville',
            address_vn: 'Quận 20 Paris',
            commune_forme_index: 'Paris 20e Arrondissement',
            lat: 48.8714,
            lon: 2.3877,
            score: 0.86,
            category_vn: 'phố đi bộ',
            story_vn: 'Một lát cắt đô thị sáng màu ở phía đông.'
        }
    ];

    const { L, map } = createLeafletStub({
        south: 48.84,
        west: 2.28,
        north: 48.89,
        east: 2.36,
        center: { lat: 48.865, lng: 2.32 }
    });

    const app = createParisMapApp({
        window: dom.window,
        document: dom.window.document,
        L,
        fetch: async () => makeJsonResponse([...FEATURED_BOOTSTRAP_ITEMS, ...extraViewportItems])
    });

    await app.init();
    map.emit('moveend');

    const cards = dom.window.document.querySelectorAll('#parisPoiList [data-reference]');
    assert.equal(cards.length, 10);
    assert.match(dom.window.document.getElementById('parisModeTitle').textContent, /10 điểm đẹp nhất Paris/);

    cards[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.deepEqual(map._lastFlyTo.center, [48.873780394850904, 2.29504124772799]);
    assert.equal(app.state.activeReference, 'PA00088804');

    map.emit('moveend');
    map.setBounds({
        south: 48.867,
        west: 2.384,
        north: 48.873,
        east: 2.396,
        center: { lat: 48.87, lng: 2.39 }
    });
    map.emit('moveend');

    assert.equal(app.state.mode, 'viewport');
    assert.match(dom.window.document.getElementById('parisModeTitle').textContent, /điểm nổi bật/i);
    assert.ok(dom.window.document.getElementById('parisPoiList').textContent.includes('Belvedere Menilmontant'));
    assert.ok(dom.window.document.getElementById('parisPoiList').textContent.includes('Passage Belleville'));

    app.state.markersByReference.get('PA-TEST-EAST-2').trigger('click');
    assert.equal(app.state.activeReference, 'PA-TEST-EAST-2');
    assert.ok(dom.window.document.querySelector('[data-reference="PA-TEST-EAST-2"]').className.includes('sv-paris-poi--active'));
});
