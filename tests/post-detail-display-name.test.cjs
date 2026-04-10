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

async function loadPostDetailPage({ post = {}, comments = [] } = {}) {
    const dom = createDomFromHtml('post_detail.html', {
        url: 'https://svpforum.fr/post_detail.html?postId=99',
        fetch: async (targetUrl) => {
            const url = new URL(String(targetUrl));
            if (/\/posts\/\d+$/.test(url.pathname)) {
                return makeJsonResponse({
                    post: {
                        postId: 99,
                        title: 'Bai viet demo',
                        categoryId: 3,
                        createdAt: '2026-03-20T10:00:00Z',
                        contentHtml: '<p>Mo bai.</p>',
                        coverImageUrl: '',
                        viewCount: 12,
                        likeCount: 2,
                        author: {
                            nickname: 'tac-gia'
                        },
                        ...post
                    },
                    comments
                });
            }
            if (url.pathname.endsWith('/posts/latest-articles')) {
                return makeJsonResponse({ items: [] });
            }
            if (url.pathname.endsWith('/posts/latest-discussions')) {
                return makeJsonResponse({ items: [] });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
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

test('post detail renders the main author displayName instead of nickname', async () => {
    const dom = await loadPostDetailPage({
        post: {
            authorDisplayName: 'Tac Gia Hien Thi'
        }
    });

    const authorName = dom.window.document.getElementById('pd-author-name');
    assert.equal(authorName.textContent, 'Tac Gia Hien Thi');
    assert.equal((authorName.textContent || '').includes('tac-gia'), false);
});

test('post detail renders comment author displayName instead of nickname', async () => {
    const dom = await loadPostDetailPage({
        comments: [
            {
                commentId: 91,
                postId: 99,
                createdAt: '2026-03-21T08:00:00Z',
                contentHtml: '<p>Xin chao moi nguoi.</p>',
                authorName: 'Lan Anh',
                author: {
                    nickname: 'lan-anh'
                }
            }
        ]
    });

    const commentList = dom.window.document.getElementById('pd-comment-list');
    assert.match(commentList.textContent || '', /Lan Anh/);
    assert.equal((commentList.textContent || '').includes('lan-anh'), false);
});
