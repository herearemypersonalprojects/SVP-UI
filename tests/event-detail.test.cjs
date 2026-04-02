const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    makeJsonResponse,
    readFrontendFile
} = require('./dom-test-helpers.cjs');

function extractEventDetailInlineScript() {
    const html = readFrontendFile('event_detail.html');
    const match = html.match(/<script>\s*\(function \(\) \{[\s\S]*?loadEventDetail\(\);\s*\}\)\(\);\s*<\/script>/);
    if (!match) {
        throw new Error('Cannot find event detail inline script.');
    }
    return match[0]
        .replace(/^<script>\s*/, '')
        .replace(/\s*<\/script>$/, '');
}

async function loadEventDetailPage(options = {}) {
    const dom = createDomFromHtml('event_detail.html', {
        url: options.url || 'https://svpforum.fr/event_detail.html?eventId=7',
        fetch: options.fetch || (async (targetUrl) => {
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        })
    });
    const { window } = dom;
    window.SVP_API_BASE_URL = 'https://api.svp.test';
    window.SVPAuth = options.svpAuth || {
        getValidAccessToken: async () => '',
        parseJwtPayload: () => null
    };
    window.SVPSeo = options.seo || {
        urls: null,
        htmlToText(value) {
            return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        },
        excerpt(value, maxLength) {
            return String(value || '').slice(0, Number(maxLength || 0));
        },
        defaultImage: 'https://svpforum.fr/assets/icons/logo_svp.png',
        setPage() {},
        compactObject(value) {
            return value;
        },
        absoluteUrl(value) {
            return String(value || '');
        },
        setStructuredData() {}
    };

    if (options.accessToken) {
        window.localStorage.setItem('accessToken', options.accessToken);
    }

    window.eval(extractEventDetailInlineScript());
    await flushAsync(window, 10);
    return dom;
}

test('event detail renders view count, comment count and existing comments', async () => {
    const dom = await loadEventDetailPage({
        fetch: async (targetUrl) => {
            const url = String(targetUrl);
            if (url === 'https://api.svp.test/events/7?trackView=true&includeComments=true') {
                return makeJsonResponse({
                    event: {
                        eventId: 7,
                        title: 'Hoi thao SVP',
                        content: '<p>Noi dung su kien day du.</p>',
                        eventTime: '2026-05-10T18:30:00Z',
                        address: 'Paris 13e',
                        price: 0,
                        online: false,
                        eventTypeName: 'Giao lưu',
                        viewCount: 12,
                        commentCount: 1,
                        organizer: {
                            displayName: 'SVP Admin'
                        }
                    },
                    comments: [
                        {
                            commentId: 91,
                            eventId: 7,
                            contentHtml: '<p>Hen gap o su kien!</p>',
                            createdAt: '2026-05-01T09:00:00Z',
                            author: {
                                displayName: 'Lan'
                            }
                        }
                    ]
                });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });

    const { document } = dom.window;
    assert.match(document.getElementById('event-detail-view-count').textContent || '', /12 lượt xem/);
    assert.match(document.getElementById('event-detail-comment-count').textContent || '', /1 bình luận/);
    assert.match(document.getElementById('event-comment-list').textContent || '', /Lan/);
    assert.match(document.getElementById('event-comment-list').textContent || '', /Hen gap o su kien/);
});

test('event detail submits a new comment and updates the visible count', async () => {
    let submittedPayload = null;
    const dom = await loadEventDetailPage({
        fetch: async (targetUrl, options = {}) => {
            const url = String(targetUrl);
            const method = String(options.method || 'GET').toUpperCase();
            if (url === 'https://api.svp.test/events/7?trackView=true&includeComments=true' && method === 'GET') {
                return makeJsonResponse({
                    event: {
                        eventId: 7,
                        title: 'Hoi thao SVP',
                        content: '<p>Noi dung su kien day du.</p>',
                        eventTime: '2026-05-10T18:30:00Z',
                        address: 'Paris 13e',
                        price: 0,
                        online: false,
                        eventTypeName: 'Giao lưu',
                        viewCount: 12,
                        commentCount: 1,
                        organizer: {
                            displayName: 'SVP Admin'
                        }
                    },
                    comments: [
                        {
                            commentId: 91,
                            eventId: 7,
                            contentHtml: '<p>Hen gap o su kien!</p>',
                            createdAt: '2026-05-01T09:00:00Z',
                            author: {
                                displayName: 'Lan'
                            }
                        }
                    ]
                });
            }
            if (url === 'https://api.svp.test/events/7/comments' && method === 'POST') {
                submittedPayload = JSON.parse(String(options.body || '{}'));
                return makeJsonResponse({
                    commentId: 92,
                    eventId: 7,
                    contentHtml: '<p>Moi nguoi nho den som nhe.</p>',
                    createdAt: '2026-05-02T10:00:00Z',
                    commentCount: 2,
                    author: {
                        displayName: 'Minh Duc'
                    }
                });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });

    const { document } = dom.window;
    document.getElementById('event-comment-name').value = 'Minh Duc';
    document.getElementById('event-comment-email').value = 'minh@example.com';
    document.getElementById('event-comment-message').value = 'Moi nguoi nho den som nhe.';

    document.getElementById('event-comment-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 12);

    assert.equal(submittedPayload.displayName, 'Minh Duc');
    assert.equal(submittedPayload.contentHtml, '<p>Moi nguoi nho den som nhe.</p>');
    assert.match(document.getElementById('event-detail-comment-count').textContent || '', /2 bình luận/);
    assert.match(document.getElementById('event-comment-list').textContent || '', /Minh Duc/);
    assert.match(document.getElementById('event-comment-list').textContent || '', /Moi nguoi nho den som nhe/);
    assert.equal(document.getElementById('event-comment-message').value, '');
});

test('event detail only shows hide action for SUPERADMIN', async () => {
    const fetch = async (targetUrl) => {
        const url = String(targetUrl);
        if (url === 'https://api.svp.test/events/7?trackView=true&includeComments=true') {
            return makeJsonResponse({
                event: {
                    eventId: 7,
                    title: 'Hoi thao SVP',
                    content: '<p>Noi dung su kien day du.</p>',
                    eventTime: '2026-05-10T18:30:00Z',
                    address: 'Paris 13e',
                    price: 0,
                    online: false,
                    eventTypeName: 'Giao lưu',
                    viewCount: 12,
                    commentCount: 0,
                    hidden: true,
                    organizer: {
                        nickname: 'owner'
                    }
                },
                comments: []
            });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    };

    const adminDom = await loadEventDetailPage({
        fetch,
        accessToken: 'admin-token',
        svpAuth: {
            getValidAccessToken: async () => 'admin-token',
            parseJwtPayload: () => ({ nickname: 'admin', role: 'ADMIN' })
        }
    });
    const adminButtons = Array.from(adminDom.window.document.querySelectorAll('button'))
        .map((button) => (button.textContent || '').trim());
    assert.equal(adminButtons.includes('Ẩn sự kiện'), false);
    assert.equal(adminButtons.includes('Hiện sự kiện'), false);

    const superadminDom = await loadEventDetailPage({
        fetch,
        accessToken: 'super-token',
        svpAuth: {
            getValidAccessToken: async () => 'super-token',
            parseJwtPayload: () => ({ nickname: 'superadmin', role: 'SUPERADMIN' })
        }
    });
    const superadminButtons = Array.from(superadminDom.window.document.querySelectorAll('button'))
        .map((button) => (button.textContent || '').trim());
    assert.equal(superadminButtons.includes('Hiện sự kiện'), true);
});
