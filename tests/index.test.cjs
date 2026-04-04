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

function makePost(postId, createdAt) {
    return {
        postId,
        categoryId: 1,
        title: `Bai viet ${postId}`,
        contentHtml: `<p>Noi dung bai viet ${postId}.</p>`,
        coverImageUrl: `https://cdn.svp.test/posts/${postId}.jpg`,
        createdAt,
        isArticle: true,
        isBlog: false,
        author: {
            userId: `00000000-0000-4000-8000-${String(postId).padStart(12, '0')}`,
            nickname: `user-${postId}`,
            displayName: `User ${postId}`
        }
    };
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
                json: async () => ({ latestPosts: [], upcomingEvents: [], topStars: [] })
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
                    topStars: [],
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

test('index derives homepage post summaries from full contentHtml', async () => {
    const latestPosts = [
        {
            postId: 101,
            categoryId: 1,
            title: 'Bai noi bat',
            contentHtml: '<p>Tom tat noi bat tu noi dung day du cua bai viet dau tien.</p>',
            coverImageUrl: 'https://cdn.svp.test/posts/featured.jpg',
            createdAt: '2026-04-04T10:00:00Z',
            isArticle: true,
            isBlog: false,
            author: { userId: '11111111-1111-1111-1111-111111111111', nickname: 'a', displayName: 'A' }
        },
        {
            postId: 102,
            categoryId: 1,
            title: 'Bai phu 1',
            contentHtml: '<p>Tom tat bai phu 1 tu noi dung day du.</p>',
            coverImageUrl: 'https://cdn.svp.test/posts/sub-1.jpg',
            createdAt: '2026-04-04T09:00:00Z',
            isArticle: true,
            isBlog: false,
            author: { userId: '22222222-2222-2222-2222-222222222222', nickname: 'b', displayName: 'B' }
        },
        {
            postId: 103,
            categoryId: 1,
            title: 'Bai phu 2',
            contentHtml: '<p>Tom tat bai phu 2 tu noi dung day du.</p>',
            coverImageUrl: 'https://cdn.svp.test/posts/sub-2.jpg',
            createdAt: '2026-04-04T08:00:00Z',
            isArticle: true,
            isBlog: false,
            author: { userId: '33333333-3333-3333-3333-333333333333', nickname: 'c', displayName: 'C' }
        },
        {
            postId: 104,
            categoryId: 1,
            title: 'Bai cot trai',
            contentHtml: '<p>Tom tat cot trai tu noi dung day du cho the bai viet thu tu.</p>',
            coverImageUrl: 'https://cdn.svp.test/posts/left.jpg',
            createdAt: '2026-04-04T07:00:00Z',
            isArticle: true,
            isBlog: false,
            author: { userId: '44444444-4444-4444-4444-444444444444', nickname: 'd', displayName: 'D' }
        }
    ];

    const fetchStub = async (targetUrl) => {
        const url = new URL(String(targetUrl));
        if (url.pathname === '/api/home') {
            return {
                ok: true,
                status: 200,
                json: async () => ({ latestPosts, upcomingEvents: [], topStars: [] })
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

    const featuredExcerpt = window.document.querySelector('.sv-featured-main__excerpt');
    const leftExcerpt = window.document.querySelector('.sv-headline__excerpt');

    assert.equal(featuredExcerpt?.textContent.trim(), 'Tom tat noi bat tu noi dung day du cua bai viet dau tien.');
    assert.equal(leftExcerpt?.textContent.trim(), 'Tom tat cot trai tu noi dung day du cho the bai viet thu tu.');
});

test('index renders 25 star avatars from topStars independently of loaded posts', async () => {
    const topStars = Array.from({ length: 25 }, (_, index) => ({
        authUserId: String(index + 1),
        userId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        nickname: `star-${index + 1}`,
        displayName: `Star ${index + 1}`,
        avatarUrl: ''
    }));

    const latestPosts = [
        {
            postId: 201,
            categoryId: 1,
            title: 'Mot bai viet duy nhat',
            contentHtml: '<p>Noi dung bai viet.</p>',
            coverImageUrl: 'https://cdn.svp.test/posts/only-post.jpg',
            createdAt: '2026-04-04T11:00:00Z',
            isArticle: true,
            isBlog: false,
            author: { userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', nickname: 'solo', displayName: 'Solo' }
        }
    ];

    const fetchStub = async (targetUrl) => {
        const url = new URL(String(targetUrl));
        if (url.pathname === '/api/home') {
            return {
                ok: true,
                status: 200,
                json: async () => ({ latestPosts, upcomingEvents: [], topStars })
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

    const memberLinks = window.document.querySelectorAll('#sv-featured-members .sv-member-link');

    assert.equal(memberLinks.length, 25);
    assert.match(memberLinks[0]?.getAttribute('aria-label') || '', /Star 1/);
    assert.match(memberLinks[24]?.getAttribute('aria-label') || '', /Star 25/);
});

test('index load more fetches 2 posts per click and only hides the button after a click returns no posts', async () => {
    const calls = [];
    const latestPosts = Array.from({ length: 18 }, (_, index) => makePost(
        500 - index,
        `2026-04-${String(30 - index).padStart(2, '0')}T10:00:00Z`
    ));
    const loadMorePages = [
        [
            makePost(482, '2026-04-12T10:00:00Z'),
            makePost(481, '2026-04-11T10:00:00Z')
        ],
        []
    ];

    const fetchStub = async (targetUrl) => {
        calls.push(String(targetUrl));
        const url = new URL(String(targetUrl));
        if (url.pathname === '/api/home') {
            return {
                ok: true,
                status: 200,
                json: async () => ({ latestPosts, upcomingEvents: [], topStars: [] })
            };
        }
        if (url.pathname === '/posts/latest-articles') {
            return {
                ok: true,
                status: 200,
                json: async () => ({ items: loadMorePages.shift() || [] })
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

    const loadMoreButton = window.document.getElementById('sv-posts-load-more');
    const pagination = window.document.getElementById('sv-post-pagination');

    assert.equal(pagination.style.display, 'flex');

    loadMoreButton.click();
    await flushAsync(window, 12);

    const loadMoreCalls = calls.filter((url) => url.includes('/posts/latest-articles'));
    assert.equal(loadMoreCalls.length, 1);
    assert.equal(new URL(loadMoreCalls[0]).searchParams.get('limit'), '2');
    assert.equal(pagination.style.display, 'flex');
    assert.equal(loadMoreButton.disabled, false);

    loadMoreButton.click();
    await flushAsync(window, 12);

    assert.equal(calls.filter((url) => url.includes('/posts/latest-articles')).length, 2);
    assert.equal(pagination.style.display, 'none');
});
