const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    makeJsonResponse,
    readFrontendFile,
    runScript
} = require('./dom-test-helpers.cjs');

function extractPostDetailInlineScript() {
    const html = readFrontendFile('post_detail.html');
    const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    if (!matches.length) {
        throw new Error('Cannot find post detail inline script.');
    }
    return matches[matches.length - 1][1];
}

function makePostDetailFetch(options = {}) {
    const post = {
        postId: 99,
        title: 'Bai viet demo',
        categoryId: 3,
        createdAt: '2026-03-20T10:00:00Z',
        contentHtml: '<p>Mo bai.</p><p><img src="https://cdn.svp.test/articles/embedded-body-image.jpg" alt="body"></p><p>Doan noi dung cuoi bai van hien day du.</p>',
        coverImageUrl: 'https://cdn.svp.test/articles/demo-cover.jpg',
        viewCount: 12,
        likeCount: 2,
        author: {
            displayName: 'Tac gia',
            nickname: 'tac-gia'
        },
        ...(options.post || {})
    };
    const latestArticles = Array.isArray(options.latestArticles) ? options.latestArticles : [];
    const latestDiscussions = Array.isArray(options.latestDiscussions) ? options.latestDiscussions : [];
    const calls = Array.isArray(options.calls) ? options.calls : null;
    return async (targetUrl) => {
        const url = new URL(String(targetUrl));
        if (calls) {
            calls.push(url.toString());
        }
        if (/\/posts\/\d+$/.test(url.pathname)) {
            return makeJsonResponse({
                post,
                comments: []
            });
        }
        if (url.pathname.endsWith('/posts/latest-articles')) {
            return makeJsonResponse({ items: latestArticles });
        }
        if (url.pathname.endsWith('/posts/latest-discussions')) {
            return makeJsonResponse({ items: latestDiscussions });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    };
}

async function loadPostDetailPage(options = {}) {
    const dom = createDomFromHtml('post_detail.html', {
        url: 'https://svpforum.fr/post_detail.html?postId=99',
        fetch: makePostDetailFetch(options)
    });
    const { window } = dom;
    window.SVPAuth = {
        getValidAccessToken: async () => ''
    };

    runScript(dom, 'config.js');
    runScript(dom, 'seo.js');
    runScript(dom, 'avatar-utils.js');
    runScript(dom, 'svp-rich-content.js');
    window.eval(extractPostDetailInlineScript());
    await flushAsync(window, 12);
    return dom;
}

test('post detail shows the full article without requiring login', async () => {
    const dom = await loadPostDetailPage();
    const { document } = dom.window;
    const body = document.getElementById('pd-body');

    assert.ok(body);
    assert.match(body.textContent || '', /Doan noi dung cuoi bai van hien day du/);
    assert.equal(document.getElementById('pd-login-gate'), null);
    assert.equal(body.classList.contains('pd-body--locked'), false);
});

test('post detail uses persisted coverImageUrl for hero and seo', async () => {
    const dom = await loadPostDetailPage();
    const { document } = dom.window;

    assert.match(document.getElementById('pd-hero').style.backgroundImage || '', /demo-cover\.jpg/);
    assert.equal(
        document.querySelector('meta[property="og:image"]').getAttribute('content'),
        'https://cdn.svp.test/articles/demo-cover.jpg'
    );
});

test('post detail shows other articles from the same author and removes the stats card', async () => {
    const dom = await loadPostDetailPage({
        latestArticles: [
            {
                postId: 99,
                title: 'Bai viet demo',
                createdAt: '2026-03-20T10:00:00Z',
                coverImageUrl: 'https://cdn.svp.test/articles/current-cover.jpg',
                author: { displayName: 'Tac gia', nickname: 'tac-gia' }
            },
            {
                postId: 120,
                title: 'Bai viet khac cung tac gia',
                createdAt: '2026-03-18T08:00:00Z',
                coverImageUrl: 'https://cdn.svp.test/articles/author-cover.jpg',
                author: { displayName: 'Tac gia', nickname: 'tac-gia' }
            },
            {
                postId: 121,
                title: 'Bai viet cua nguoi khac',
                createdAt: '2026-03-17T08:00:00Z',
                coverImageUrl: 'https://cdn.svp.test/articles/related-cover.jpg',
                author: { displayName: 'Nguoi khac', nickname: 'nguoi-khac' }
            }
        ],
        latestDiscussions: [
            {
                postId: 201,
                title: 'Thao luan lien quan',
                createdAt: '2026-03-16T08:00:00Z',
                coverImageUrl: 'https://cdn.svp.test/discussions/thread-cover.jpg',
                author: { displayName: 'Thanh vien', nickname: 'thanh-vien' }
            }
        ]
    });
    const { document } = dom.window;
    const authorCard = document.getElementById('pd-author-articles-card');
    const authorPreview = authorCard.querySelector('a img');
    const relatedPreviewSources = Array.from(document.querySelectorAll('#pd-related a img'))
        .map((image) => image.getAttribute('src') || '');
    const threadPreview = document.querySelector('#pd-related-threads a img');

    assert.ok(authorCard);
    assert.equal(authorCard.hidden, false);
    assert.match(authorCard.textContent || '', /Bài viết khác của tác giả/);
    assert.match(authorCard.textContent || '', /Bai viet khac cung tac gia/);
    assert.equal((authorCard.textContent || '').includes('Bai viet cua nguoi khac'), false);
    assert.equal((document.body.textContent || '').includes('Thống kê bài viết'), false);
    assert.match(authorPreview?.getAttribute('src') || '', /author-cover\.jpg/);
    assert.match(authorPreview?.closest('a')?.getAttribute('href') || '', /120/);
    assert.equal(relatedPreviewSources.some((src) => /related-cover\.jpg/.test(src)), true);
    assert.equal(relatedPreviewSources.some((src) => /author-cover\.jpg/.test(src)), false);
    assert.match(threadPreview?.getAttribute('src') || '', /thread-cover\.jpg/);
    assert.match(threadPreview?.closest('a')?.getAttribute('href') || '', /201/);
});

test('post detail requests article sidebars in summary mode', async () => {
    const calls = [];
    await loadPostDetailPage({
        calls,
        latestArticles: [
            {
                postId: 120,
                title: 'Bai viet khac cung tac gia',
                createdAt: '2026-03-18T08:00:00Z',
                coverImageUrl: 'https://cdn.svp.test/articles/author-cover.jpg',
                author: { displayName: 'Tac gia', nickname: 'tac-gia' }
            }
        ]
    });

    const articleCalls = calls
        .map((entry) => new URL(entry))
        .filter((url) => url.pathname.endsWith('/posts/latest-articles'));

    assert.equal(articleCalls.length >= 2, true);
    assert.equal(articleCalls.every((url) => url.searchParams.get('summaryOnly') === 'true'), true);
});
