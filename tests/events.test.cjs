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

function makeEventsFetch(items, eventTypes = []) {
    return async (targetUrl) => {
        const url = new URL(String(targetUrl));
        if (url.pathname.endsWith('/events')) {
            return makeJsonResponse({ items });
        }
        if (url.pathname.endsWith('/event-types')) {
            return makeJsonResponse({ items: eventTypes });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    };
}

async function loadEventsPage(items, options = {}) {
    const dom = createDomFromHtml('events.html', {
        url: 'https://svpforum.fr/events.html',
        fetch: makeEventsFetch(items, options.eventTypes)
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

test('events page omits repetitive status copy from event cards', async () => {
    const dom = await loadEventsPage([
        {
            eventId: 73,
            title: 'Hoi cho viec lam',
            coverImageUrl: 'https://cdn.svp.test/events/career-fair.jpg',
            eventTime: '2026-05-15T09:00:00Z',
            address: 'Paris 5e',
            price: 0,
            online: false,
            eventTypeName: 'Huong nghiep'
        }
    ]);

    const cardText = dom.window.document.getElementById('sv-events-upcoming-list').textContent || '';
    assert.doesNotMatch(cardText, /Sự kiện sắp diễn ra/i);
    assert.doesNotMatch(cardText, /Hãy mở ra để xem chi tiết/i);
    assert.doesNotMatch(cardText, /Lưu lại để xem chi tiết/i);
    assert.match(cardText, /Miễn phí/);
    assert.match(cardText, /Xem chi tiết/);
    assert.ok(dom.window.document.querySelector('#sv-events-upcoming-list .sv-event-item__meta .sv-event-item__link'));
    assert.equal(dom.window.document.querySelector('#sv-events-upcoming-list .sv-event-item__footer'), null);
});

test('events page filters listed events by selected event type', async () => {
    const dom = await loadEventsPage([
        {
            eventId: 74,
            title: 'Hoi thao du hoc',
            coverImageUrl: 'https://cdn.svp.test/events/study.jpg',
            eventTime: '2026-05-18T09:00:00Z',
            address: 'Paris 13e',
            price: 0,
            online: false,
            eventTypeName: 'Giao lưu'
        },
        {
            eventId: 75,
            title: 'Dem nhac ngoai troi',
            coverImageUrl: 'https://cdn.svp.test/events/music.jpg',
            eventTime: '2026-05-19T20:00:00Z',
            address: 'Paris 11e',
            price: 15,
            online: false,
            eventTypeName: 'Âm nhạc'
        }
    ], {
        eventTypes: [
            { eventTypeId: 1, name: 'Giao lưu' },
            { eventTypeId: 2, name: 'Âm nhạc' }
        ]
    });

    const filterSelect = dom.window.document.getElementById('sv-events-type-filter');
    assert.ok(filterSelect);
    assert.match(filterSelect.textContent || '', /Tất cả sự kiện/);
    assert.match(filterSelect.textContent || '', /Âm nhạc/);

    filterSelect.value = 'âm nhạc';
    filterSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const upcomingListText = dom.window.document.getElementById('sv-events-upcoming-list').textContent || '';
    assert.match(upcomingListText, /Dem nhac ngoai troi/);
    assert.doesNotMatch(upcomingListText, /Hoi thao du hoc/);
    assert.match(dom.window.document.getElementById('sv-events-upcoming-page-info').textContent || '', /1 \/ 1 sự kiện/);
});
