const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const FRONTEND_ROOT = path.join(__dirname, '..');

function readFrontendFile(relativePath) {
    return fs.readFileSync(path.join(FRONTEND_ROOT, relativePath), 'utf8');
}

function createDom({ html, url = 'https://svpforum.fr/', fetch } = {}) {
    const dom = new JSDOM(
        html || '<!doctype html><html lang="vi"><head></head><body></body></html>',
        {
            url,
            pretendToBeVisual: true,
            runScripts: 'outside-only'
        }
    );
    const { window } = dom;

    window.console = console;
    window.Headers = global.Headers;
    window.Request = global.Request;
    window.Response = global.Response;
    window.fetch = fetch || (async (targetUrl) => {
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    });
    window.alert = () => {};
    window.matchMedia = window.matchMedia || (() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return false; }
    }));
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(Date.now()), 0);
    }
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);
    }
    if (!window.URL.createObjectURL) {
        window.URL.createObjectURL = () => 'blob:test-image';
    }
    if (!window.URL.revokeObjectURL) {
        window.URL.revokeObjectURL = () => {};
    }
    if (!window.navigator.clipboard) {
        Object.defineProperty(window.navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: async () => {}
            }
        });
    }
    window.__SVP_BYPASS_AUTH_GUARD = true;
    window.__SVP_CAPTURE_AUTH_REDIRECTS = true;

    return dom;
}

function createDomFromHtml(relativePath, options = {}) {
    const fileName = path.basename(relativePath);
    return createDom({
        html: readFrontendFile(relativePath),
        url: options.url || `https://svpforum.fr/${fileName}`,
        fetch: options.fetch
    });
}

function runScript(dom, relativePath) {
    dom.window.eval(readFrontendFile(relativePath));
    return dom.window;
}

async function flushAsync(window, turns = 6) {
    for (let index = 0; index < turns; index += 1) {
        await Promise.resolve();
    }
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await Promise.resolve();
}

function installLeafletStub(window) {
    const mapState = {
        center: [48.8566, 2.3522],
        zoom: 11
    };

    const map = {
        setView(center, zoom) {
            mapState.center = Array.isArray(center) ? center.slice() : center;
            if (Number.isFinite(Number(zoom))) {
                mapState.zoom = Number(zoom);
            }
            return this;
        },
        getZoom() {
            return mapState.zoom;
        },
        addLayer() {
            return this;
        }
    };

    const marker = {
        latlng: { lat: 48.8566, lng: 2.3522 },
        addTo() {
            return this;
        },
        setLatLng(coords) {
            this.latlng = Array.isArray(coords)
                ? { lat: Number(coords[0]), lng: Number(coords[1]) }
                : { lat: Number(coords.lat), lng: Number(coords.lng) };
            return this;
        },
        getLatLng() {
            return this.latlng;
        },
        bindPopup() {
            return this;
        },
        on(eventName, handler) {
            this[`on_${eventName}`] = handler;
            return this;
        }
    };

    window.L = {
        map() {
            return map;
        },
        tileLayer() {
            return {
                addTo() {
                    return this;
                }
            };
        },
        marker(coords) {
            if (Array.isArray(coords)) {
                marker.latlng = { lat: Number(coords[0]), lng: Number(coords[1]) };
            }
            return marker;
        }
    };

    return { map, marker };
}

function setImageNaturalSize(image, width, height) {
    Object.defineProperty(image, 'naturalWidth', {
        configurable: true,
        value: Number(width)
    });
    Object.defineProperty(image, 'naturalHeight', {
        configurable: true,
        value: Number(height)
    });
}

function makeJsonResponse(payload, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload
    };
}

module.exports = {
    FRONTEND_ROOT,
    createDom,
    createDomFromHtml,
    flushAsync,
    installLeafletStub,
    makeJsonResponse,
    readFrontendFile,
    runScript,
    setImageNaturalSize
};
