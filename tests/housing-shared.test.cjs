const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDom,
    runScript
} = require('./dom-test-helpers.cjs');

function loadHousingSharedDom() {
    const dom = createDom();
    runScript(dom, 'seo.js');
    runScript(dom, 'housing-shared.js');
    return dom;
}

test('buildHousingShareUrl creates a stable share slug for accented titles', () => {
    const dom = loadHousingSharedDom();
    const shareUrl = dom.window.SVPHousing.buildHousingShareUrl(
        '073e429c-c634-493b-9f4c-f5438b8bb979',
        'Tìm người sous-coloc Paris métro T9'
    );

    assert.equal(
        shareUrl,
        'https://share.svpforum.fr/housing/073e429c-c634-493b-9f4c-f5438b8bb979/tim-nguoi-sous-coloc-paris-metro-t9'
    );
});

test('buildHousingDetailHref creates SEO-friendly housing detail paths', () => {
    const dom = loadHousingSharedDom();
    const detailHref = dom.window.SVPHousing.buildHousingDetailHref(
        '073e429c-c634-493b-9f4c-f5438b8bb979',
        'Tìm người sous-coloc Paris métro T9'
    );

    assert.equal(
        detailHref,
        '/housing/073e429c-c634-493b-9f4c-f5438b8bb979/tim-nguoi-sous-coloc-paris-metro-t9'
    );
});

test('extractFirstImageUrlFromHtml reads the first image from HTML content', () => {
    const dom = loadHousingSharedDom();
    const imageUrl = dom.window.SVPHousing.extractFirstImageUrlFromHtml(`
        <p>Studio sáng.</p>
        <p><img src=https://cdn.svp.test/housing/preview.jpg alt="preview"></p>
    `);

    assert.equal(imageUrl, 'https://cdn.svp.test/housing/preview.jpg');
});

test('extractFirstImageUrlFromHtml falls back to direct image URLs embedded in text', () => {
    const dom = loadHousingSharedDom();
    const imageUrl = dom.window.SVPHousing.extractFirstImageUrlFromHtml(`
        <p>Xem ảnh tại https://cdn.svp.test/housing/direct-preview.webp trước khi liên hệ.</p>
    `);

    assert.equal(imageUrl, 'https://cdn.svp.test/housing/direct-preview.webp');
});

test('formatPrice keeps integer and decimal euro values human-readable', () => {
    const dom = loadHousingSharedDom();
    const { formatPrice } = dom.window.SVPHousing;

    assert.equal(formatPrice(520), '520€');
    assert.equal(formatPrice(520.5), '520,5€');
});
