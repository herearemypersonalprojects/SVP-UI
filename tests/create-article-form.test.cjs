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

function extractCreateArticleInlineScript() {
    const html = readFrontendFile('create_new_article.html');
    const match = html.match(/<script>\s*\(function \(\) \{[\s\S]*?\}\)\(\);\s*<\/script>/);
    if (!match) {
        throw new Error('Cannot find create_new_article inline script.');
    }
    return match[0]
        .replace(/^<script>\s*/, '')
        .replace(/\s*<\/script>$/, '');
}

async function loadCreateArticlePage(options = {}) {
    const config = typeof options === 'function' ? { fetch: options } : options;
    const dom = createDomFromHtml('create_new_article.html', {
        url: config.url || 'https://svpforum.fr/create_new_article.html',
        fetch: config.fetch || (async (targetUrl) => {
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        })
    });
    const { window } = dom;
    window.SVP_API_BASE_URL = 'https://api.svp.test';
    window.SVPAuth = config.svpAuth || {
        getValidAccessToken: async () => ''
    };
    const realSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay = 0, ...args) => {
        if (Number(delay) >= 400) {
            return 1;
        }
        return realSetTimeout(callback, delay, ...args);
    };

    runScript(dom, 'remote-image-upload.js');
    window.eval(extractCreateArticleInlineScript());
    await flushAsync(window, 10);
    return dom;
}

function dispatchInput(window, element, value) {
    element.value = value;
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
}

test('create article submit falls back to the first image found in contentHtml', async () => {
    let submittedPayload = null;
    const dom = await loadCreateArticlePage(async (targetUrl, options = {}) => {
        assert.equal(String(targetUrl), 'https://api.svp.test/posts/articles');
        assert.equal(String(options.method || 'GET').toUpperCase(), 'POST');
        submittedPayload = JSON.parse(String(options.body || '{}'));
        return makeJsonResponse({
            postId: 91,
            status: 'PUBLISHED',
            isBlog: false,
            author: { displayName: 'Writer' }
        });
    });
    const { document } = dom.window;

    dispatchInput(dom.window, document.getElementById('article-email'), 'writer@example.com');
    dispatchInput(dom.window, document.getElementById('article-title'), 'Bai viet co anh');
    document.getElementById('article-category').value = '3';
    dispatchInput(
        dom.window,
        document.getElementById('article-content-editor'),
        '<p>Noi dung bai viet du dai de hop le tren he thong.</p><p><img src="https://cdn.svp.test/articles/body-cover.jpg" alt="cover"></p>'
    );

    document.getElementById('article-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 12);

    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/articles/body-cover.jpg');
    assert.equal(submittedPayload.contentHtml.includes('body-cover.jpg'), true);
});

test('create article submit sends uploaded cover as imageUrl', async () => {
    let submittedPayload = null;
    let presignCalls = 0;
    const dom = await loadCreateArticlePage(async (targetUrl, options = {}) => {
        const url = String(targetUrl);
        const method = String(options.method || 'GET').toUpperCase();
        if (url === 'https://api.svp.test/api/upload/post-image') {
            presignCalls += 1;
            return makeJsonResponse({
                uploadUrl: 'https://upload.svp.test/article-cover',
                publicUrl: 'https://cdn.svp.test/articles/uploaded-cover.jpg'
            });
        }
        if (url === 'https://upload.svp.test/article-cover' && method === 'PUT') {
            return { ok: true, status: 200 };
        }
        if (url === 'https://api.svp.test/posts/articles' && method === 'POST') {
            submittedPayload = JSON.parse(String(options.body || '{}'));
            return makeJsonResponse({
                postId: 92,
                status: 'PUBLISHED',
                isBlog: false,
                author: { displayName: 'Writer' }
            });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    });
    const { document, File } = dom.window;
    const coverFileInput = document.getElementById('article-cover-file');

    Object.defineProperty(coverFileInput, 'files', {
        configurable: true,
        value: [new File(['image-bytes'], 'cover.png', { type: 'image/png' })]
    });
    coverFileInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    dispatchInput(dom.window, document.getElementById('article-email'), 'writer@example.com');
    dispatchInput(dom.window, document.getElementById('article-title'), 'Bai viet upload cover');
    document.getElementById('article-category').value = '3';
    dispatchInput(
        dom.window,
        document.getElementById('article-content-editor'),
        '<p>Noi dung bai viet du dai de hop le tren he thong.</p>'
    );

    document.getElementById('article-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 16);

    assert.equal(presignCalls, 1);
    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/articles/uploaded-cover.jpg');
});

test('create article can import a long remote image URL and upload it to R2 on submit', async () => {
    let submittedPayload = null;
    let remoteFetchCalls = 0;
    let presignCalls = 0;
    const dom = await loadCreateArticlePage(async (targetUrl, options = {}) => {
        const url = String(targetUrl);
        const method = String(options.method || 'GET').toUpperCase();
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
                uploadUrl: 'https://upload.svp.test/article-cover-from-url',
                publicUrl: 'https://cdn.svp.test/articles/from-remote-url.jpg'
            });
        }
        if (url === 'https://upload.svp.test/article-cover-from-url' && method === 'PUT') {
            return { ok: true, status: 200 };
        }
        if (url === 'https://api.svp.test/posts/articles' && method === 'POST') {
            submittedPayload = JSON.parse(String(options.body || '{}'));
            return makeJsonResponse({
                postId: 95,
                status: 'PUBLISHED',
                isBlog: false,
                author: { displayName: 'Writer' }
            });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    });
    const { document } = dom.window;

    document.getElementById('article-cover-url').value = LONG_REMOTE_IMAGE_URL;
    document.getElementById('article-cover-url-import-btn').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    await flushAsync(dom.window, 12);

    dispatchInput(dom.window, document.getElementById('article-email'), 'writer@example.com');
    dispatchInput(dom.window, document.getElementById('article-title'), 'Bai viet lay anh tu URL');
    document.getElementById('article-category').value = '3';
    dispatchInput(
        dom.window,
        document.getElementById('article-content-editor'),
        '<p>Noi dung bai viet du dai de hop le tren he thong.</p>'
    );

    document.getElementById('article-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 16);

    assert.equal(remoteFetchCalls, 1);
    assert.equal(presignCalls, 1);
    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/articles/from-remote-url.jpg');
});

test('edit article submit sends imageUrl when updating an existing post', async () => {
    let submittedPayload = null;
    const dom = await loadCreateArticlePage({
        url: 'https://svpforum.fr/create_new_article.html?editPostId=93',
        fetch: async (targetUrl, options = {}) => {
            const url = String(targetUrl);
            const method = String(options.method || 'GET').toUpperCase();
            if (url === 'https://api.svp.test/posts/93' && method === 'GET') {
                return makeJsonResponse({
                    post: {
                        title: 'Bai viet cu',
                        categoryId: 3,
                        contentHtml: '<p>Noi dung cu hop le de tai form.</p>'
                    }
                });
            }
            if (url === 'https://api.svp.test/posts/93' && method === 'PATCH') {
                submittedPayload = JSON.parse(String(options.body || '{}'));
                return makeJsonResponse({ status: 'updated' });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });
    const { document } = dom.window;

    dispatchInput(dom.window, document.getElementById('article-title'), 'Bai viet da sua');
    document.getElementById('article-category').value = '3';
    dispatchInput(
        dom.window,
        document.getElementById('article-content-editor'),
        '<p>Noi dung cap nhat du dai de hop le tren he thong.</p><p><img src="https://cdn.svp.test/articles/edited-cover.jpg" alt="cover"></p>'
    );

    document.getElementById('article-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 12);

    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/articles/edited-cover.jpg');
});

test('edit article load uses getValidAccessToken so pending posts still open for superadmin', async () => {
    let capturedAuthorization = '';

    const dom = await loadCreateArticlePage({
        url: 'https://svpforum.fr/create_new_article.html?editPostId=94',
        svpAuth: {
            getValidAccessToken: async () => 'fresh-superadmin-token'
        },
        fetch: async (targetUrl, options = {}) => {
            const url = String(targetUrl);
            const method = String(options.method || 'GET').toUpperCase();
            if (url === 'https://api.svp.test/posts/94' && method === 'GET') {
                capturedAuthorization = String(options.headers?.Authorization || '');
                return makeJsonResponse({
                    post: {
                        title: 'Bai viet pending',
                        categoryId: 3,
                        status: 'PENDING',
                        contentHtml: '<p>Noi dung pending hop le de tai form.</p>'
                    }
                });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });
    const { document } = dom.window;

    assert.equal(capturedAuthorization, 'Bearer fresh-superadmin-token');
    assert.equal(document.getElementById('article-title').value, 'Bai viet pending');
});
