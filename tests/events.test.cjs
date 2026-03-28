const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    makeJsonResponse,
    readFrontendFile
} = require('./dom-test-helpers.cjs');

function extractEventsInlineScript() {
    const html = readFrontendFile('events.html');
    const match = html.match(/<script>\s*\(function \(\) \{[\s\S]*?loadEvents\(\);\s*\}\)\(\);\s*<\/script>/);
    if (!match) {
        throw new Error('Cannot find events inline script.');
    }
    return match[0]
        .replace(/^<script>\s*/, '')
        .replace(/\s*<\/script>$/, '');
}

function makeEventsFetch(items) {
    return async (targetUrl) => {
        const url = new URL(String(targetUrl));
        if (url.pathname.endsWith('/events')) {
            return makeJsonResponse({ items });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    };
}

async function loadEventsPage(items) {
    const dom = createDomFromHtml('events.html', {
        url: 'https://svpforum.fr/events.html',
        fetch: makeEventsFetch(items)
    });
    const { window } = dom;
    window.SVP_API_BASE_URL = 'https://api.svp.test';
    window.SVPSeo = {
        urls: {
            buildDetailPath(kind, id) {
                return `/${kind}/${id}`;
            }
        }
    };

    window.eval(extractEventsInlineScript());
    await flushAsync(window, 10);
    return dom;
}

test('events page renders uploaded preview image for listed events', async () => {
    const dom = await loadEventsPage([
        {
            eventId: 71,
            title: 'Hoi thao du hoc',
            coverImageUrl: 'https://cdn.svp.test/events/uploaded-cover.jpg',
            eventTime: '2026-05-10T18:30:00Z',
            address: 'Paris 13e',
            price: 0,
            online: false,
            eventTypeName: 'Giao lưu'
        }
    ]);

    const image = dom.window.document.querySelector('#sv-events-upcoming-list .sv-event-item__thumb');
    assert.ok(image);
    assert.match(image.getAttribute('src') || '', /uploaded-cover\.jpg/);
    assert.match(dom.window.document.getElementById('sv-events-upcoming-list').textContent, /Hoi thao du hoc/);
});

test('events page falls back to the first image URL found in event content when no uploaded preview exists', async () => {
    const dom = await loadEventsPage([
        {
            eventId: 72,
            title: 'Dem nhac ngoai troi',
            coverImageUrl: '',
            content: 'Mo cua tu 19h. https://cdn.svp.test/events/outdoor-night-cover.webp Sau do vao san khau chinh.',
            eventTime: '2026-05-21T19:00:00Z',
            address: 'Paris 11e',
            price: 12,
            online: false,
            eventTypeName: 'Am nhac'
        }
    ]);

    const image = dom.window.document.querySelector('#sv-events-upcoming-list .sv-event-item__thumb');
    assert.ok(image);
    assert.match(image.getAttribute('src') || '', /outdoor-night-cover\.webp/);
    assert.match(dom.window.document.getElementById('sv-events-upcoming-list').textContent, /Dem nhac ngoai troi/);
});
