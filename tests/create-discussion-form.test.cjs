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
const CORS_BLOCKED_REMOTE_IMAGE_URL = 'https://www.francebleu.fr/pikapi/images/a0d34edb-7f3d-4c22-82a6-343dbb6ba742/1200x680?webp=false';

function extractCreateDiscussionInlineScript() {
    const html = readFrontendFile('create_new_discussion.html');
    const match = html.match(/<script>\s*\(function \(\) \{[\s\S]*?\}\)\(\);\s*<\/script>/);
    if (!match) {
        throw new Error('Cannot find create_new_discussion inline script.');
    }
    return match[0]
        .replace(/^<script>\s*/, '')
        .replace(/\s*<\/script>$/, '');
}

async function loadCreateDiscussionPage(options = {}) {
    const config = typeof options === 'function' ? { fetch: options } : options;
    const dom = createDomFromHtml('create_new_discussion.html', {
        url: config.url || 'https://svpforum.fr/create_new_discussion.html',
        fetch: config.fetch || (async (targetUrl) => {
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        })
    });
    const { window } = dom;
    window.SVP_API_BASE_URL = 'https://api.svp.test';
    window.SVPAuth = {
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
    window.eval(extractCreateDiscussionInlineScript());
    await flushAsync(window, 10);
    return dom;
}

function dispatchInput(window, element, value) {
    element.value = value;
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
}

test('create discussion submit falls back to the first image found in contentHtml', async () => {
    let submittedPayload = null;
    const dom = await loadCreateDiscussionPage(async (targetUrl, options = {}) => {
        assert.equal(String(targetUrl), 'https://api.svp.test/posts/discussions');
        assert.equal(String(options.method || 'GET').toUpperCase(), 'POST');
        submittedPayload = JSON.parse(String(options.body || '{}'));
        return makeJsonResponse({
            postId: 61,
            status: 'PUBLISHED',
            author: { displayName: 'Author' }
        });
    });
    const { document } = dom.window;

    dispatchInput(dom.window, document.getElementById('discussion-email'), 'author@example.com');
    dispatchInput(dom.window, document.getElementById('discussion-title'), 'Chu de co anh');
    document.getElementById('discussion-category').value = '3';
    dispatchInput(
        dom.window,
        document.getElementById('discussion-subject'),
        '<p>Noi dung chu de du dai de hop le tren he thong.</p><p><img src="https://cdn.svp.test/discussions/body-cover.jpg" alt="cover"></p>'
    );

    document.getElementById('discussion-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 12);

    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/discussions/body-cover.jpg');
    assert.equal(submittedPayload.contentHtml.includes('body-cover.jpg'), true);
});

test('create discussion submit sends uploaded cover as imageUrl', async () => {
    let submittedPayload = null;
    let presignCalls = 0;
    const dom = await loadCreateDiscussionPage(async (targetUrl, options = {}) => {
        const url = String(targetUrl);
        const method = String(options.method || 'GET').toUpperCase();
        if (url === 'https://api.svp.test/api/upload/post-image') {
            presignCalls += 1;
            return makeJsonResponse({
                uploadUrl: 'https://upload.svp.test/discussion-cover',
                publicUrl: 'https://cdn.svp.test/discussions/uploaded-cover.jpg'
            });
        }
        if (url === 'https://upload.svp.test/discussion-cover' && method === 'PUT') {
            return { ok: true, status: 200 };
        }
        if (url === 'https://api.svp.test/posts/discussions' && method === 'POST') {
            submittedPayload = JSON.parse(String(options.body || '{}'));
            return makeJsonResponse({
                postId: 62,
                status: 'PUBLISHED',
                author: { displayName: 'Author' }
            });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    });
    const { document, File } = dom.window;
    const coverFileInput = document.getElementById('discussion-cover-file');

    Object.defineProperty(coverFileInput, 'files', {
        configurable: true,
        value: [new File(['image-bytes'], 'cover.png', { type: 'image/png' })]
    });
    coverFileInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    dispatchInput(dom.window, document.getElementById('discussion-email'), 'author@example.com');
    dispatchInput(dom.window, document.getElementById('discussion-title'), 'Chu de upload cover');
    document.getElementById('discussion-category').value = '3';
    dispatchInput(
        dom.window,
        document.getElementById('discussion-subject'),
        '<p>Noi dung chu de du dai de hop le tren he thong.</p>'
    );

    document.getElementById('discussion-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 16);

    assert.equal(presignCalls, 1);
    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/discussions/uploaded-cover.jpg');
});

test('create discussion can import a long remote image URL and upload it to R2 on submit', async () => {
    let submittedPayload = null;
    let remoteFetchCalls = 0;
    let presignCalls = 0;
    const dom = await loadCreateDiscussionPage(async (targetUrl, options = {}) => {
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
                uploadUrl: 'https://upload.svp.test/discussion-cover-from-url',
                publicUrl: 'https://cdn.svp.test/discussions/from-remote-url.jpg'
            });
        }
        if (url === 'https://upload.svp.test/discussion-cover-from-url' && method === 'PUT') {
            return { ok: true, status: 200 };
        }
        if (url === 'https://api.svp.test/posts/discussions' && method === 'POST') {
            submittedPayload = JSON.parse(String(options.body || '{}'));
            return makeJsonResponse({
                postId: 63,
                status: 'PUBLISHED',
                author: { displayName: 'Author' }
            });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    });
    const { document } = dom.window;

    document.getElementById('discussion-cover-url').value = LONG_REMOTE_IMAGE_URL;
    document.getElementById('discussion-cover-url-import-btn').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    await flushAsync(dom.window, 12);

    dispatchInput(dom.window, document.getElementById('discussion-email'), 'author@example.com');
    dispatchInput(dom.window, document.getElementById('discussion-title'), 'Chu de lay anh tu URL');
    document.getElementById('discussion-category').value = '3';
    dispatchInput(
        dom.window,
        document.getElementById('discussion-subject'),
        '<p>Noi dung chu de du dai de hop le tren he thong.</p>'
    );

    document.getElementById('discussion-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 16);

    assert.equal(remoteFetchCalls, 1);
    assert.equal(presignCalls, 1);
    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/discussions/from-remote-url.jpg');
});

test('create discussion retries remote image import through the share-image proxy when direct fetch is CORS-blocked', async () => {
    let submittedPayload = null;
    let directFetchCalls = 0;
    let proxyFetchCalls = 0;
    let presignCalls = 0;
    const expectedProxyUrl = `https://api.svp.test/share-image?url=${encodeURIComponent(CORS_BLOCKED_REMOTE_IMAGE_URL)}`;
    const dom = await loadCreateDiscussionPage(async (targetUrl, options = {}) => {
        const url = String(targetUrl);
        const method = String(options.method || 'GET').toUpperCase();
        if (url === CORS_BLOCKED_REMOTE_IMAGE_URL) {
            directFetchCalls += 1;
            throw new TypeError('Failed to fetch');
        }
        if (url === expectedProxyUrl) {
            proxyFetchCalls += 1;
            return new Response(new Blob(['remote-image-via-proxy'], { type: 'image/jpeg' }), {
                status: 200,
                headers: { 'Content-Type': 'image/jpeg' }
            });
        }
        if (url === 'https://api.svp.test/api/upload/post-image') {
            presignCalls += 1;
            return makeJsonResponse({
                uploadUrl: 'https://upload.svp.test/discussion-cover-from-proxy',
                publicUrl: 'https://cdn.svp.test/discussions/from-proxy-url.jpg'
            });
        }
        if (url === 'https://upload.svp.test/discussion-cover-from-proxy' && method === 'PUT') {
            return { ok: true, status: 200 };
        }
        if (url === 'https://api.svp.test/posts/discussions' && method === 'POST') {
            submittedPayload = JSON.parse(String(options.body || '{}'));
            return makeJsonResponse({
                postId: 64,
                status: 'PUBLISHED',
                author: { displayName: 'Author' }
            });
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    });
    const { document } = dom.window;

    document.getElementById('discussion-cover-url').value = CORS_BLOCKED_REMOTE_IMAGE_URL;
    document.getElementById('discussion-cover-url-import-btn').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    await flushAsync(dom.window, 12);

    dispatchInput(dom.window, document.getElementById('discussion-email'), 'author@example.com');
    dispatchInput(dom.window, document.getElementById('discussion-title'), 'Chu de lay anh qua proxy');
    document.getElementById('discussion-category').value = '3';
    dispatchInput(
        dom.window,
        document.getElementById('discussion-subject'),
        '<p>Noi dung chu de du dai de hop le tren he thong.</p>'
    );

    document.getElementById('discussion-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 16);

    assert.equal(directFetchCalls, 1);
    assert.equal(proxyFetchCalls, 1);
    assert.equal(presignCalls, 1);
    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/discussions/from-proxy-url.jpg');
});

test('edit discussion submit sends imageUrl when updating an existing thread', async () => {
    let submittedPayload = null;
    const dom = await loadCreateDiscussionPage({
        url: 'https://svpforum.fr/create_new_discussion.html?editPostId=75',
        fetch: async (targetUrl, options = {}) => {
            const url = String(targetUrl);
            const method = String(options.method || 'GET').toUpperCase();
            if (url === 'https://api.svp.test/posts/75' && method === 'GET') {
                return makeJsonResponse({
                    post: {
                        title: 'Chu de cu',
                        categoryId: 3,
                        contentHtml: '<p>Noi dung cu hop le de tai form.</p>'
                    }
                });
            }
            if (url === 'https://api.svp.test/posts/75' && method === 'PATCH') {
                submittedPayload = JSON.parse(String(options.body || '{}'));
                return makeJsonResponse({ status: 'updated' });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });
    const { document } = dom.window;
    dom.window.SVPAuth.getValidAccessToken = async () => 'token';

    dispatchInput(dom.window, document.getElementById('discussion-title'), 'Chu de da sua');
    document.getElementById('discussion-category').value = '3';
    dispatchInput(
        dom.window,
        document.getElementById('discussion-subject'),
        '<p>Noi dung chu de da cap nhat du dai de hop le tren he thong.</p><p><img src="https://cdn.svp.test/discussions/edited-cover.jpg" alt="cover"></p>'
    );

    document.getElementById('discussion-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 12);

    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/discussions/edited-cover.jpg');
});
