const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    makeJsonResponse,
    readFrontendFile,
    runScript
} = require('./dom-test-helpers.cjs');

const LONG_REMOTE_IMAGE_URL = 'https://scontent-cdg6-1.xx.fbcdn.net/v/t39.30808-6/658428494_26938466825757832_1654291503066964002_n.jpg?stp=cp6_dst-jpg_s590x590_tt6&_nc_cat=103&ccb=1-7&_nc_sid=e06c5d&_nc_ohc=aVoENoWVR5UQ7kNvwFXQ5eK&_nc_oc=AdqrDEO4IgVDKfd2iVBscdxkKJrEGTjuC1BGPeNZJj-4Vt01SLWAhTr1BFUg3Sa-djU&_nc_zt=23&_nc_ht=scontent-cdg6-1.xx&_nc_gid=na-2nNZlqoWWxCoZ06Komw&_nc_ss=7a3a8&oh=00_Af0h0cHUKVG_3bmP4lF6ANyEbnRi0NikRQ_DuLQOYAV1BA&oe=69D4059E';

function extractCreateEventInlineScript() {
    const html = readFrontendFile('create_new_event.html');
    const match = html.match(/<script>\s*\(function \(\) \{[\s\S]*?void init\(\);\s*\}\)\(\);\s*<\/script>/);
    if (!match) {
        throw new Error('Cannot find create_new_event inline script.');
    }
    return match[0]
        .replace(/^<script>\s*/, '')
        .replace(/\s*<\/script>$/, '');
}

function makeCreateEventFetch() {
    return async (targetUrl) => {
        const url = new URL(String(targetUrl));
        if (url.pathname.endsWith('/event-types')) {
            return makeJsonResponse({ items: [] });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    };
}

async function loadCreateEventPage(options = makeCreateEventFetch()) {
    const config = typeof options === 'function' ? { fetch: options } : options;
    const dom = createDomFromHtml('create_new_event.html', {
        url: config.url || 'https://svpforum.fr/create_new_event.html',
        fetch: config.fetch || makeCreateEventFetch()
    });
    const { window } = dom;
    window.SVP_API_BASE_URL = 'https://api.svp.test';
    window.SVPAuth = config.svpAuth || {
        getValidAccessToken: async () => ''
    };

    runScript(dom, 'remote-image-upload.js');
    window.eval(extractCreateEventInlineScript());
    await flushAsync(window, 10);
    return dom;
}

function dispatchInput(window, element, value) {
    element.value = value;
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
}

test('create event form autofills end datetime after the chosen start datetime', async () => {
    const dom = await loadCreateEventPage();
    const { document, Event, MouseEvent } = dom.window;

    const startInput = document.getElementById('event-start-datetime');
    const endToggle = document.getElementById('event-end-toggle');
    const endInput = document.getElementById('event-end-datetime');
    const endWrap = document.getElementById('event-end-wrap');

    startInput.value = '2026-05-10T18:30';
    startInput.dispatchEvent(new Event('input', { bubbles: true }));

    endToggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    assert.equal(endWrap.classList.contains('d-none'), false);
    assert.equal(endInput.min, '2026-05-10T18:31');
    assert.equal(endInput.value, '2026-05-10T18:31');
});

test('create event form keeps end datetime strictly after start when start changes later', async () => {
    const dom = await loadCreateEventPage();
    const { document, Event, MouseEvent } = dom.window;

    const startInput = document.getElementById('event-start-datetime');
    const endToggle = document.getElementById('event-end-toggle');
    const endInput = document.getElementById('event-end-datetime');

    startInput.value = '2026-05-10T18:30';
    startInput.dispatchEvent(new Event('input', { bubbles: true }));
    endToggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    endInput.value = '2026-05-10T19:00';
    startInput.value = '2026-05-10T19:15';
    startInput.dispatchEvent(new Event('change', { bubbles: true }));

    assert.equal(endInput.min, '2026-05-10T19:16');
    assert.equal(endInput.value, '2026-05-10T19:16');
});

test('create event submit falls back to the first image found in description content', async () => {
    let submittedPayload = null;
    const dom = await loadCreateEventPage(async (targetUrl, options = {}) => {
        const url = new URL(String(targetUrl));
        if (url.pathname.endsWith('/event-types')) {
            return makeJsonResponse({ items: [] });
        }
        if (url.pathname.endsWith('/events')) {
            submittedPayload = JSON.parse(String(options.body || '{}'));
            return makeJsonResponse({ eventId: 77, status: 'CREATED' });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    });
    const { document } = dom.window;
    const realSetTimeout = dom.window.setTimeout.bind(dom.window);

    dom.window.setTimeout = (callback, delay = 0, ...args) => {
        if (Number(delay) >= 400) {
            return 1;
        }
        return realSetTimeout(callback, delay, ...args);
    };

    dispatchInput(dom.window, document.getElementById('event-email'), 'owner@example.com');
    dispatchInput(dom.window, document.getElementById('event-title'), 'Hoi thao du hoc');
    dispatchInput(dom.window, document.getElementById('event-start-datetime'), '2026-05-10T18:30');
    dispatchInput(dom.window, document.getElementById('event-location'), 'Maison du Vietnam');
    dispatchInput(dom.window, document.getElementById('event-price'), '0');
    dispatchInput(
        dom.window,
        document.getElementById('event-description'),
        '<p>Noi dung su kien du dai de hop le.</p><p><img src="https://cdn.svp.test/events/body-cover.jpg" alt="cover"></p>'
    );

    document.getElementById('event-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 12);

    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/events/body-cover.jpg');
});

test('create event submit sends uploaded cover as imageUrl', async () => {
    let submittedPayload = null;
    let presignCalls = 0;
    const dom = await loadCreateEventPage(async (targetUrl, options = {}) => {
        const url = String(targetUrl);
        const method = String(options.method || 'GET').toUpperCase();
        if (url.endsWith('/event-types')) {
            return makeJsonResponse({ items: [] });
        }
        if (url === 'https://api.svp.test/api/upload/post-image') {
            presignCalls += 1;
            return makeJsonResponse({
                uploadUrl: 'https://upload.svp.test/event-cover',
                publicUrl: 'https://cdn.svp.test/events/uploaded-cover.jpg'
            });
        }
        if (url === 'https://upload.svp.test/event-cover' && method === 'PUT') {
            return { ok: true, status: 200 };
        }
        if (url === 'https://api.svp.test/events' && method === 'POST') {
            submittedPayload = JSON.parse(String(options.body || '{}'));
            return makeJsonResponse({ eventId: 78, status: 'CREATED' });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    });
    const { document, File } = dom.window;
    const realSetTimeout = dom.window.setTimeout.bind(dom.window);
    const imageFileInput = document.getElementById('event-image-file');

    dom.window.setTimeout = (callback, delay = 0, ...args) => {
        if (Number(delay) >= 400) {
            return 1;
        }
        return realSetTimeout(callback, delay, ...args);
    };
    Object.defineProperty(imageFileInput, 'files', {
        configurable: true,
        value: [new File(['image-bytes'], 'cover.png', { type: 'image/png' })]
    });
    imageFileInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    dispatchInput(dom.window, document.getElementById('event-email'), 'owner@example.com');
    dispatchInput(dom.window, document.getElementById('event-title'), 'Hoi thao co upload');
    dispatchInput(dom.window, document.getElementById('event-start-datetime'), '2026-05-10T18:30');
    dispatchInput(dom.window, document.getElementById('event-location'), 'Maison du Vietnam');
    dispatchInput(dom.window, document.getElementById('event-price'), '0');
    dispatchInput(
        dom.window,
        document.getElementById('event-description'),
        '<p>Noi dung su kien du dai de hop le.</p>'
    );

    document.getElementById('event-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 16);

    assert.equal(presignCalls, 1);
    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/events/uploaded-cover.jpg');
});

test('create event can import a long remote image URL and upload it to R2 on submit', async () => {
    let submittedPayload = null;
    let remoteFetchCalls = 0;
    let presignCalls = 0;
    const dom = await loadCreateEventPage(async (targetUrl, options = {}) => {
        const url = String(targetUrl);
        const method = String(options.method || 'GET').toUpperCase();
        if (url.endsWith('/event-types')) {
            return makeJsonResponse({ items: [] });
        }
        if (url === LONG_REMOTE_IMAGE_URL) {
            remoteFetchCalls += 1;
            return new Response(new Blob(['remote-image-bytes'], { type: 'image/jpeg' }), {
                status: 200,
                headers: { 'Content-Type': 'image/jpeg' }
            });
        }
        if (url === 'https://api.svp.test/api/upload/post-image') {
            presignCalls += 1;
            return makeJsonResponse({
                uploadUrl: 'https://upload.svp.test/event-cover-from-url',
                publicUrl: 'https://cdn.svp.test/events/from-remote-url.jpg'
            });
        }
        if (url === 'https://upload.svp.test/event-cover-from-url' && method === 'PUT') {
            return { ok: true, status: 200 };
        }
        if (url === 'https://api.svp.test/events' && method === 'POST') {
            submittedPayload = JSON.parse(String(options.body || '{}'));
            return makeJsonResponse({ eventId: 79, status: 'CREATED' });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    });
    const { document } = dom.window;

    document.getElementById('event-image-url').value = LONG_REMOTE_IMAGE_URL;
    document.getElementById('event-image-url-import-btn').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    await flushAsync(dom.window, 12);

    dispatchInput(dom.window, document.getElementById('event-email'), 'owner@example.com');
    dispatchInput(dom.window, document.getElementById('event-title'), 'Hoi thao lay anh tu URL');
    dispatchInput(dom.window, document.getElementById('event-start-datetime'), '2026-05-10T18:30');
    dispatchInput(dom.window, document.getElementById('event-location'), 'Maison du Vietnam');
    dispatchInput(dom.window, document.getElementById('event-price'), '0');
    dispatchInput(
        dom.window,
        document.getElementById('event-description'),
        '<p>Noi dung su kien du dai de hop le.</p>'
    );

    document.getElementById('event-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 16);

    assert.equal(remoteFetchCalls, 1);
    assert.equal(presignCalls, 1);
    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/events/from-remote-url.jpg');
});

test('edit event submit sends imageUrl when updating an existing event', async () => {
    let submittedPayload = null;
    const dom = await loadCreateEventPage({
        url: 'https://svpforum.fr/create_new_event.html?editEventId=55',
        fetch: async (targetUrl, options = {}) => {
            const url = String(targetUrl);
            const method = String(options.method || 'GET').toUpperCase();
            if (url.endsWith('/event-types')) {
                return makeJsonResponse({ items: [] });
            }
            if (url === 'https://api.svp.test/events/55' && method === 'GET') {
                return makeJsonResponse({
                    event: {
                        title: 'Su kien cu',
                        content: '<p>Noi dung cu hop le.</p>',
                        startTime: '2026-05-10T18:30:00Z',
                        endTime: '2026-05-10T20:00:00Z',
                        address: 'Maison du Vietnam',
                        online: false,
                        price: 0
                    }
                });
            }
            if (url === 'https://api.svp.test/events/55' && method === 'PATCH') {
                submittedPayload = JSON.parse(String(options.body || '{}'));
                return makeJsonResponse({ status: 'updated' });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });
    const { document } = dom.window;
    const realSetTimeout = dom.window.setTimeout.bind(dom.window);

    dom.window.setTimeout = (callback, delay = 0, ...args) => {
        if (Number(delay) >= 400) {
            return 1;
        }
        return realSetTimeout(callback, delay, ...args);
    };

    dispatchInput(dom.window, document.getElementById('event-title'), 'Su kien da sua');
    dispatchInput(dom.window, document.getElementById('event-start-datetime'), '2026-05-10T18:30');
    dispatchInput(dom.window, document.getElementById('event-location'), 'Maison du Vietnam');
    dispatchInput(dom.window, document.getElementById('event-price'), '0');
    dispatchInput(
        dom.window,
        document.getElementById('event-description'),
        '<p>Noi dung su kien da cap nhat du dai de hop le.</p><p><img src="https://cdn.svp.test/events/edited-cover.jpg" alt="cover"></p>'
    );

    document.getElementById('event-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 12);

    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/events/edited-cover.jpg');
});

test('edit event load disables view tracking and comment loading', async () => {
    let requestedUrl = '';
    const dom = await loadCreateEventPage({
        url: 'https://svpforum.fr/create_new_event.html?editEventId=56',
        svpAuth: {
            getValidAccessToken: async () => 'fresh-event-token'
        },
        fetch: async (targetUrl, options = {}) => {
            const url = String(targetUrl);
            const method = String(options.method || 'GET').toUpperCase();
            if (url.endsWith('/event-types')) {
                return makeJsonResponse({ items: [] });
            }
            if (url === 'https://api.svp.test/events/56?trackView=false&includeComments=false' && method === 'GET') {
                requestedUrl = url;
                return makeJsonResponse({
                    event: {
                        title: 'Su kien cu',
                        content: '<p>Noi dung cu hop le.</p>',
                        startTime: '2026-05-10T18:30:00Z',
                        endTime: '2026-05-10T20:00:00Z',
                        address: 'Maison du Vietnam',
                        online: false,
                        price: 0
                    }
                });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });

    await flushAsync(dom.window, 8);
    assert.equal(requestedUrl, 'https://api.svp.test/events/56?trackView=false&includeComments=false');
});
