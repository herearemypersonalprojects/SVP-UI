const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    makeJsonResponse,
    runScript
} = require('./dom-test-helpers.cjs');

function makeFeedFetch(eventItems) {
    return async (targetUrl) => {
        const url = new URL(String(targetUrl));
        if (url.pathname.endsWith('/posts/latest-discussions')) {
            return makeJsonResponse({ items: [] });
        }
        if (url.pathname.endsWith('/posts/latest-articles')) {
            return makeJsonResponse({ items: [] });
        }
        if (url.pathname.endsWith('/events/latest-added')) {
            return makeJsonResponse({ items: eventItems });
        }
        if (url.pathname.endsWith('/comments/latest')) {
            return makeJsonResponse({ items: [] });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    };
}

async function loadFeedPage(eventItems) {
    const dom = createDomFromHtml('feed.html', {
        url: 'https://svpforum.fr/feed.html',
        fetch: makeFeedFetch(eventItems)
    });
    const { window } = dom;
    window.SVPAuth = {
        getValidAccessToken: async () => ''
    };

    runScript(dom, 'seo.js');
    runScript(dom, 'svp-rich-content.js');
    runScript(dom, 'feed.js');
    await flushAsync(window);
    return dom;
}

test('feed renders event cover from the first fallback description image when coverImageUrl is missing', async () => {
    const dom = await loadFeedPage([
        {
            eventId: 23,
            title: 'Forum logement étudiant',
            contentHtml: '<p><img src=https://cdn.svp.test/events/forum-logement-cover.jpg alt="Forum logement"></p>',
            createdAt: '2026-03-26T09:11:25Z',
            eventTime: '2026-04-12T14:00:00Z',
            address: 'Paris 5e',
            price: 0,
            online: false,
            eventTypeName: 'Nhà cửa'
        }
    ]);

    const cover = dom.window.document.querySelector('.sv-feed-card__cover');
    assert.ok(cover);
    assert.match(cover.getAttribute('style') || '', /forum-logement-cover\.jpg/);
    assert.match(dom.window.document.getElementById('feed-stream').textContent, /Forum logement étudiant/);
});

test('feed prefers a leading image row cover for new event entries', async () => {
    const dom = await loadFeedPage([
        {
            eventId: 24,
            title: 'Projection documentaire SVP',
            contentHtml: `
                <div>
                    <img src="https://cdn.svp.test/events/row-1.jpg" alt="1">
                    <img src="https://cdn.svp.test/events/row-2.jpg" alt="2">
                    <img src="https://cdn.svp.test/events/row-3.jpg" alt="3">
                </div>
                <p>Chiếu phim và giao lưu.</p>
            `,
            createdAt: '2026-03-27T10:00:00Z',
            eventTime: '2026-04-18T19:00:00Z',
            address: 'Paris 11e',
            price: 0,
            online: false,
            eventTypeName: 'Văn hóa'
        }
    ]);

    const rowCover = dom.window.document.querySelector('.sv-feed-card .svp-image-row-cover');
    assert.ok(rowCover);
    assert.equal(rowCover.querySelectorAll('img').length, 3);
    assert.ok(!dom.window.document.querySelector('.sv-feed-card__cover[style*="row-1.jpg"]'));
});
