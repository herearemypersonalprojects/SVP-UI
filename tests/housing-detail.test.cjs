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
    const dom = createDomFromHtml('housing_detail.html', {
        url: `https://svpforum.fr/housing_detail.html?listingId=${encodeURIComponent(payload.id)}`,
        fetch: async (targetUrl, requestOptions = {}) => {
            requests.push({ url: String(targetUrl), options: requestOptions || {} });
            const url = new URL(String(targetUrl));
            const method = String(requestOptions?.method || 'GET').toUpperCase();
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
    window.SVPCommentEditor = {
        sanitizeHtml: (value) => String(value || '').trim()
    };

    runScript(dom, 'seo.js');
    runScript(dom, 'housing-shared.js');
    runScript(dom, 'svp-rich-content.js');
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
