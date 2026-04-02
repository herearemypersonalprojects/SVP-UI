const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    readFrontendFile,
    runScript
} = require('./dom-test-helpers.cjs');

function extractLastInlineScript(html) {
    const matches = [...String(html || '').matchAll(/<script>([\s\S]*?)<\/script>/g)];
    return matches.length ? matches[matches.length - 1][1] : '';
}

test('index only loads the home payload on first render', async () => {
    const calls = [];
    const fetchStub = async (targetUrl) => {
        calls.push(String(targetUrl));
        const url = new URL(String(targetUrl));
        if (url.pathname === '/api/home') {
            return {
                ok: true,
                status: 200,
                json: async () => ({ latestPosts: [], upcomingEvents: [] })
            };
        }
        if (url.pathname === '/stats/visit' || url.pathname === '/stats/visit-session') {
            return {
                ok: true,
                status: 200,
                json: async () => ({})
            };
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    };

    const dom = createDomFromHtml('index.html', {
        url: 'https://svpforum.fr/index.html',
        fetch: fetchStub
    });
    const { window } = dom;
    window.localStorage.clear();
    window.fetch = fetchStub;
    window.AbortController = global.AbortController;
    window.URLSearchParams = global.URLSearchParams;
    window.requestIdleCallback = (callback) => window.setTimeout(() => callback({
        didTimeout: false,
        timeRemaining: () => 50
    }), 0);
    window.cancelIdleCallback = (id) => window.clearTimeout(id);

    runScript(dom, 'config.js');
    runScript(dom, 'seo.js');
    runScript(dom, 'avatar-utils.js');
    runScript(dom, 'auth-topbar.js');
    window.eval(extractLastInlineScript(readFrontendFile('index.html')));

    await flushAsync(window, 12);

    assert.equal(window.document.getElementById('sv-hot-posts'), null);
    assert.equal(calls.some((url) => url.includes('/api/home/top-viewed-posts')), false);
    assert.equal(calls.some((url) => url.includes('/posts/latest-articles')), false);
    assert.equal(window.document.body.textContent.includes('Chưa có bài viết theo chuyên mục để hiển thị.'), false);
    assert.equal(window.document.body.textContent.includes('Hiển thị 16+ / 16+ bài viết'), false);
    assert.equal(window.document.getElementById('sv-category-latest-block').style.display, 'none');
    assert.equal(window.document.getElementById('sv-posts-page-info').style.display, 'none');
});

test('index wraps upcoming event preview images with links to event detail pages', async () => {
    const fetchStub = async (targetUrl) => {
        const url = new URL(String(targetUrl));
        if (url.pathname === '/api/home') {
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    latestPosts: [],
                    upcomingEvents: [
                        {
                            eventId: 7,
                            title: 'Hoi thao du hoc',
                            eventTime: '2026-04-10T18:00:00Z',
                            address: 'Paris',
                            online: false,
                            price: 0,
                            coverImageUrl: 'https://cdn.svp.test/events/preview-7.jpg'
                        }
                    ]
                })
            };
        }
        if (url.pathname === '/stats/visit' || url.pathname === '/stats/visit-session') {
            return {
                ok: true,
                status: 200,
                json: async () => ({})
            };
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    };

    const dom = createDomFromHtml('index.html', {
        url: 'https://svpforum.fr/index.html',
        fetch: fetchStub
    });
    const { window } = dom;
    window.localStorage.clear();
    window.fetch = fetchStub;
    window.AbortController = global.AbortController;
    window.URLSearchParams = global.URLSearchParams;
    window.requestIdleCallback = (callback) => window.setTimeout(() => callback({
        didTimeout: false,
        timeRemaining: () => 50
    }), 0);
    window.cancelIdleCallback = (id) => window.clearTimeout(id);

    runScript(dom, 'config.js');
    runScript(dom, 'seo.js');
    runScript(dom, 'avatar-utils.js');
    runScript(dom, 'auth-topbar.js');
    window.eval(extractLastInlineScript(readFrontendFile('index.html')));

    await flushAsync(window, 12);

    const previewLink = window.document.querySelector('#sv-upcoming-events .sv-event-item__thumb-link');
    const previewImage = previewLink?.querySelector('.sv-event-item__thumb');

    assert.ok(previewLink);
    assert.ok(previewImage);
    assert.match(previewImage.getAttribute('src') || '', /preview-7\.jpg/);
    assert.match(previewLink.getAttribute('href') || '', /\/su-kien\/7\//);
});
