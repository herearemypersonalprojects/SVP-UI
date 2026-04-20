const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    installLeafletStub,
    makeJsonResponse,
    runScript
} = require('./dom-test-helpers.cjs');

function buildHousingPayload(overrides = {}) {
    return {
        id: '073e429c-c634-493b-9f4c-f5438b8bb979',
        title: 'Tìm người sous-coloc Paris métro T9',
        status: 'AVAILABLE',
        statusLabel: 'Còn trống',
        price: 520,
        priceLabel: '520€',
        city: 'Choisy-le-Roi',
        arrondissement: '94',
        areaM2: 14,
        viewCount: 27,
        propertyType: 'ROOM',
        propertyTypeLabel: 'Chambre',
        cafEligible: true,
        tags: ['colocation'],
        description: '',
        images: [],
        transitPoints: [],
        contact: {},
        owner: { displayName: 'Minh', nickname: 'minh' },
        latitude: 48.787,
        longitude: 2.392,
        addressText: 'Choisy-le-Roi',
        viewerCanEdit: false,
        ...overrides
    };
}

async function loadHousingDetailPage(payload, options = {}) {
    const requests = [];
    const initialComments = Array.isArray(options.comments) ? options.comments : [];
    const uploadedCommentImageUrl = options.uploadedCommentImageUrl || 'https://cdn.svp.test/housing/comment-upload.jpg';
    const dom = createDomFromHtml('housing_detail.html', {
        url: `https://svpforum.fr/housing_detail.html?listingId=${encodeURIComponent(payload.id)}`,
        fetch: async (targetUrl, requestOptions = {}) => {
            requests.push({ url: String(targetUrl), options: requestOptions || {} });
            const url = new URL(String(targetUrl));
            const method = String(requestOptions?.method || 'GET').toUpperCase();
            if (url.pathname.endsWith('/api/upload/post-image') && method === 'POST') {
                return makeJsonResponse({
                    method: 'PUT',
                    uploadUrl: 'https://upload.svp.test/housing/comment-image',
                    publicUrl: uploadedCommentImageUrl,
                    contentType: 'image/png'
                });
            }
            if (url.href === 'https://upload.svp.test/housing/comment-image' && method === 'PUT') {
                return makeJsonResponse({});
            }
            if (url.pathname.endsWith('/api/upload/post-image/delete') && method === 'POST') {
                return makeJsonResponse({ status: 'deleted' });
            }
            if (url.pathname.endsWith(`/api/housing/${payload.id}`)) {
                return makeJsonResponse(payload);
            }
            if (url.pathname.endsWith(`/api/housing/${payload.id}/comments`)) {
                if (method === 'POST') {
                    return makeJsonResponse(options.createCommentResponse || {
                        commentId: 999,
                        listingId: payload.id,
                        userId: '',
                        contentHtml: '<p>Bình luận mới</p>',
                        createdAt: '2026-04-01T12:00:00Z',
                        modifiedAt: '',
                        hidden: false,
                        viewCount: 83,
                        commentCount: 1,
                        author: {
                            userId: '',
                            nickname: '',
                            displayName: 'Khách',
                            avatarUrl: '',
                            authUserId: ''
                        }
                    });
                }
                return makeJsonResponse({ listingId: payload.id, commentCount: initialComments.length, items: initialComments });
            }
            if (url.pathname.endsWith('/auth/providers')) {
                return makeJsonResponse({ facebook: { appId: '123456' } });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });
    const { window } = dom;
    installLeafletStub(window);
    window.URL.createObjectURL = () => 'blob:housing-comment-image';
    window.URL.revokeObjectURL = () => {};
    window.SVPCommentEditor = {
        sanitizeHtml: (value) => String(value || '').trim()
    };

    runScript(dom, 'seo.js');
    runScript(dom, 'housing-shared.js');
    runScript(dom, 'svp-rich-content.js');
    runScript(dom, 'remote-image-upload.js');
    if (typeof options.configureRemoteImageUpload === 'function') {
        options.configureRemoteImageUpload(window);
    }
    runScript(dom, 'housing-detail.js');
    await flushAsync(window);
    dom.requests = requests;
    return dom;
}

test('housing detail uses persisted imageUrl when gallery is empty', async () => {
    const dom = await loadHousingDetailPage(buildHousingPayload({
        imageUrl: 'https://cdn.svp.test/housing/persisted-cover.jpg',
        description: `
            <div>
                <img src="https://cdn.svp.test/housing/row-1.jpg" alt="1">
                <img src="https://cdn.svp.test/housing/row-2.jpg" alt="2">
            </div>
            <p>Colocation proche T9.</p>
        `
    }));

    const gallery = dom.window.document.getElementById('housing-detail-gallery');
    const image = gallery.querySelector('img.sv-housing-image-thumb');
    assert.ok(image);
    assert.match(image.getAttribute('src') || '', /persisted-cover\.jpg/);
    assert.match(gallery.textContent, /Ảnh chính của tin thuê nhà/);
    assert.equal(
        dom.window.document.querySelector('meta[property="og:image"]').getAttribute('content'),
        'https://cdn.svp.test/housing/persisted-cover.jpg'
    );
});

test('housing detail replaces legacy query URL with SEO-friendly path', async () => {
    const payload = buildHousingPayload();
    const dom = await loadHousingDetailPage(payload);

    assert.equal(
        dom.window.location.pathname,
        '/housing/073e429c-c634-493b-9f4c-f5438b8bb979/tim-nguoi-sous-coloc-paris-metro-t9'
    );
    assert.equal(dom.window.location.search, '');
});

test('housing detail does not scan description images when imageUrl is missing', async () => {
    const dom = await loadHousingDetailPage(buildHousingPayload({
        description: `
            <p>Colocation proche T9.</p>
            <p><img src="https://cdn.svp.test/housing/single-preview.jpg" alt="preview"></p>
        `
    }));

    const gallery = dom.window.document.getElementById('housing-detail-gallery');
    assert.equal(gallery.querySelector('img.sv-housing-image-thumb'), null);
    assert.equal(gallery.querySelector('.svp-image-row-cover'), null);
    assert.match(gallery.textContent, /Tin này chưa có gallery ảnh riêng/);
    assert.equal(
        dom.window.document.querySelector('meta[property="og:image"]').getAttribute('content'),
        'https://svpforum.fr/assets/icons/og_housing_map.png'
    );
    assert.equal(dom.window.document.getElementById('housing-detail-share').classList.contains('d-none'), false);
    assert.match(dom.window.document.getElementById('housing-detail-meta').textContent, /27 lượt xem/);
});

test('housing detail defers auth provider fetch until messenger share is interacted with', async () => {
    const payload = buildHousingPayload();
    const dom = await loadHousingDetailPage(payload);
    const { window } = dom;
    const messengerLink = window.document.getElementById('housing-detail-share-messenger');

    assert.equal(dom.requests.some((entry) => String(entry.url).endsWith('/auth/providers')), false);
    assert.match(String(messengerLink.getAttribute('href') || ''), /^fb-messenger:\/\/share\/\?/);

    messengerLink.dispatchEvent(new window.Event('mouseenter', { bubbles: true }));
    await flushAsync(window);

    assert.equal(dom.requests.some((entry) => String(entry.url).endsWith('/auth/providers')), true);
    assert.match(String(messengerLink.getAttribute('href') || ''), /facebook\.com\/dialog\/send/);
});

test('housing detail decodes encoded description html and renders inline images', async () => {
    const dom = await loadHousingDetailPage(buildHousingPayload({
        description: [
            '&lt;p&gt;Studio sáng, gần tram và fac.&lt;/p&gt;',
            '&lt;p&gt;&lt;img src=&quot;https://cdn.svp.test/housing/inline-detail.jpg?size=1600&amp;amp;fit=cover&quot; alt=&quot;detail&quot;&gt;&lt;/p&gt;'
        ].join('')
    }));

    const description = dom.window.document.getElementById('housing-detail-description');
    const image = description.querySelector('img');

    assert.ok(image);
    assert.equal(
        image.getAttribute('src'),
        'https://cdn.svp.test/housing/inline-detail.jpg?size=1600&fit=cover'
    );
    assert.match(description.textContent, /Studio sáng, gần tram và fac/);
    assert.equal(description.textContent.includes('<p>'), false);
});

test('housing detail submits a guest comment and updates the rendered view count', async () => {
    const payload = buildHousingPayload();
    const dom = await loadHousingDetailPage(payload, {
        comments: [],
        createCommentResponse: {
            commentId: 42,
            listingId: payload.id,
            userId: '',
            contentHtml: '<p>Đã inbox chủ nhà và nhận phản hồi nhanh.</p>',
            createdAt: '2026-04-01T12:34:56Z',
            modifiedAt: '',
            hidden: false,
            viewCount: 121,
            commentCount: 1,
            author: {
                userId: '',
                nickname: '',
                displayName: 'Minh Duc',
                avatarUrl: '',
                authUserId: ''
            }
        }
    });
    const { window } = dom;
    const document = window.document;

    const captchaText = document.getElementById('housing-reply-captcha-q').textContent || '';
    const captchaParts = captchaText.match(/\d+/g).map((item) => Number(item));
    document.getElementById('housing-reply-name').value = 'Minh Duc';
    document.getElementById('housing-reply-message').value = 'Đã inbox chủ nhà và nhận phản hồi nhanh.';
    document.getElementById('housing-reply-captcha-a').value = String(captchaParts[0] + captchaParts[1]);
    document.getElementById('housing-reply-form').dispatchEvent(new window.Event('submit', {
        bubbles: true,
        cancelable: true
    }));

    await flushAsync(window, 10);

    assert.match(document.getElementById('housing-comments-list').textContent, /Đã inbox chủ nhà và nhận phản hồi nhanh/);
    assert.match(document.getElementById('housing-detail-meta').textContent, /121 lượt xem/);
    assert.match(document.getElementById('housing-comment-badge').textContent, /1 bình luận/);
    assert.ok(dom.requests.some((entry) => String(entry.url).includes(`/api/housing/${payload.id}/comments`) && String(entry.options?.method || 'GET').toUpperCase() === 'POST'));
});

test('housing detail uploads an authenticated comment image up to 300KB', async () => {
    const payload = buildHousingPayload();
    const uploadedUrl = 'https://cdn.svp.test/housing/comment-upload.jpg';
    const dom = await loadHousingDetailPage(payload, {
        comments: [],
        uploadedCommentImageUrl: uploadedUrl,
        createCommentResponse: {
            commentId: 77,
            listingId: payload.id,
            userId: 'user-77',
            contentHtml: `<p>Ảnh hiện trạng phòng.</p><figure class="image"><img src="${uploadedUrl}" alt="Ảnh đính kèm"></figure>`,
            createdAt: '2026-04-01T12:34:56Z',
            modifiedAt: '',
            hidden: false,
            viewCount: 83,
            commentCount: 1,
            author: {
                userId: 'user-77',
                nickname: 'lan',
                displayName: 'Lan Anh',
                avatarUrl: '',
                authUserId: '77'
            }
        }
    });
    const { window } = dom;
    const document = window.document;
    window.localStorage.setItem('accessToken', [
        'header',
        window.btoa(JSON.stringify({
            userId: 'user-77',
            nickname: 'lan',
            displayName: 'Lan Anh',
            role: 'USER'
        })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        'sig'
    ].join('.'));

    window.dispatchEvent(new window.Event('storage'));
    await flushAsync(window);

    const imageInput = document.getElementById('housing-reply-image');
    const file = new window.File(['image-bytes'], 'room.png', { type: 'image/png' });
    Object.defineProperty(imageInput, 'files', {
        configurable: true,
        value: [file]
    });
    imageInput.dispatchEvent(new window.Event('change', { bubbles: true }));

    document.getElementById('housing-reply-message').value = 'Ảnh hiện trạng phòng.';
    document.getElementById('housing-reply-form').dispatchEvent(new window.Event('submit', {
        bubbles: true,
        cancelable: true
    }));

    await flushAsync(window, 10);

    const presignRequest = dom.requests.find((entry) => String(entry.url).endsWith('/api/upload/post-image'));
    assert.ok(presignRequest);
    assert.match(String(presignRequest.options.body || ''), /room\.png/);
    assert.ok(dom.requests.some((entry) => String(entry.url) === 'https://upload.svp.test/housing/comment-image' && String(entry.options?.method || '').toUpperCase() === 'PUT'));

    const commentPost = dom.requests.find((entry) => String(entry.url).includes(`/api/housing/${payload.id}/comments`) && String(entry.options?.method || 'GET').toUpperCase() === 'POST');
    const submittedPayload = JSON.parse(String(commentPost.options.body || '{}'));
    assert.match(submittedPayload.contentHtml, new RegExp(uploadedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.ok(document.getElementById('housing-comments-list').querySelector(`img[src="${uploadedUrl}"]`));
});

test('housing detail falls back to 300KB when comment image cannot compress to 100KB', async () => {
    const payload = buildHousingPayload();
    const uploadedUrl = 'https://cdn.svp.test/housing/comment-fallback-upload.jpg';
    const compressionCalls = [];
    const dom = await loadHousingDetailPage(payload, {
        comments: [],
        uploadedCommentImageUrl: uploadedUrl,
        configureRemoteImageUpload: (window) => {
            const originalTools = window.SVPRemoteImageUpload || {};
            window.SVPRemoteImageUpload = {
                ...originalTools,
                compressImageBelowLimit: async (file, maxBytes) => {
                    compressionCalls.push(maxBytes);
                    if (maxBytes === 100 * 1024) {
                        throw new Error('Không thể nén ảnh xuống dưới 100.0KB.');
                    }
                    return new window.File(
                        [new window.Uint8Array(250 * 1024)],
                        'room-fallback.jpg',
                        { type: 'image/jpeg' }
                    );
                }
            };
        },
        createCommentResponse: {
            commentId: 78,
            listingId: payload.id,
            userId: 'user-78',
            contentHtml: `<p>Ảnh sau khi fallback.</p><figure class="image"><img src="${uploadedUrl}" alt="Ảnh đính kèm"></figure>`,
            createdAt: '2026-04-01T12:34:56Z',
            modifiedAt: '',
            hidden: false,
            viewCount: 84,
            commentCount: 1,
            author: {
                userId: 'user-78',
                nickname: 'hoa',
                displayName: 'Hoa Tran',
                avatarUrl: '',
                authUserId: '78'
            }
        }
    });
    const { window } = dom;
    const document = window.document;
    window.localStorage.setItem('accessToken', [
        'header',
        window.btoa(JSON.stringify({
            userId: 'user-78',
            nickname: 'hoa',
            displayName: 'Hoa Tran',
            role: 'USER'
        })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        'sig'
    ].join('.'));

    window.dispatchEvent(new window.Event('storage'));
    await flushAsync(window);

    const imageInput = document.getElementById('housing-reply-image');
    const file = new window.File(
        [new window.Uint8Array(180 * 1024)],
        'room-large.png',
        { type: 'image/png' }
    );
    Object.defineProperty(imageInput, 'files', {
        configurable: true,
        value: [file]
    });
    imageInput.dispatchEvent(new window.Event('change', { bubbles: true }));

    document.getElementById('housing-reply-message').value = 'Ảnh sau khi fallback.';
    document.getElementById('housing-reply-form').dispatchEvent(new window.Event('submit', {
        bubbles: true,
        cancelable: true
    }));

    await flushAsync(window, 10);

    assert.deepEqual(compressionCalls, [100 * 1024, 300 * 1024]);
    const presignRequest = dom.requests.find((entry) => String(entry.url).endsWith('/api/upload/post-image'));
    assert.ok(presignRequest);
    assert.match(String(presignRequest.options.body || ''), /room-fallback\.jpg/);

    const uploadRequest = dom.requests.find((entry) => String(entry.url) === 'https://upload.svp.test/housing/comment-image');
    assert.ok(uploadRequest);
    assert.equal(String(uploadRequest.options?.method || '').toUpperCase(), 'PUT');
    assert.ok(Number(uploadRequest.options?.body?.size || 0) <= 300 * 1024);
});

test('housing detail shows owner displayName without rendering nickname', async () => {
    const dom = await loadHousingDetailPage(buildHousingPayload({
        owner: {
            displayName: 'Lan Anh',
            nickname: 'lan-anh',
            userId: '4e999a2a-d4c6-4e1b-95dc-ae4f699dd8cf'
        }
    }));

    const owner = dom.window.document.getElementById('housing-detail-owner');
    assert.match(owner.textContent || '', /Lan Anh/);
    assert.equal((owner.textContent || '').includes('@lan-anh'), false);
});
