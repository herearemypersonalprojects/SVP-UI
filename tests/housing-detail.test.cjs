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

async function loadHousingDetailPage(payload) {
    const dom = createDomFromHtml('housing_detail.html', {
        url: `https://svpforum.fr/housing_detail.html?listingId=${encodeURIComponent(payload.id)}`,
        fetch: async (targetUrl) => {
            const url = new URL(String(targetUrl));
            if (url.pathname.endsWith(`/api/housing/${payload.id}`)) {
                return makeJsonResponse(payload);
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
    return dom;
}

test('housing detail falls back to a leading image row from the description when gallery is empty', async () => {
    const dom = await loadHousingDetailPage(buildHousingPayload({
        description: `
            <div>
                <img src="https://cdn.svp.test/housing/row-1.jpg" alt="1">
                <img src="https://cdn.svp.test/housing/row-2.jpg" alt="2">
            </div>
            <p>Colocation proche T9.</p>
        `
    }));

    const gallery = dom.window.document.getElementById('housing-detail-gallery');
    assert.ok(gallery.querySelector('.svp-image-row-cover'));
    assert.match(gallery.textContent, /Ảnh cover đang được lấy từ cụm ảnh đầu bài/);
    assert.equal(
        dom.window.document.querySelector('meta[property="og:image"]').getAttribute('content'),
        'https://cdn.svp.test/housing/row-1.jpg'
    );
});

test('housing detail falls back to the first description image when no gallery exists', async () => {
    const dom = await loadHousingDetailPage(buildHousingPayload({
        description: `
            <p>Colocation proche T9.</p>
            <p><img src="https://cdn.svp.test/housing/single-preview.jpg" alt="preview"></p>
        `
    }));

    const gallery = dom.window.document.getElementById('housing-detail-gallery');
    const image = gallery.querySelector('img.sv-housing-image-thumb');
    assert.ok(image);
    assert.match(image.getAttribute('src') || '', /single-preview\.jpg/);
    assert.match(gallery.textContent, /Ảnh đang được lấy từ mô tả chi tiết của tin/);
    assert.equal(
        dom.window.document.querySelector('meta[property="og:image"]').getAttribute('content'),
        'https://cdn.svp.test/housing/single-preview.jpg'
    );
    assert.equal(dom.window.document.getElementById('housing-detail-share').classList.contains('d-none'), false);
    assert.match(dom.window.document.getElementById('housing-detail-meta').textContent, /27 lượt xem/);
});
