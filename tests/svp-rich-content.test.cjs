const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDom,
    runScript,
    setImageNaturalSize
} = require('./dom-test-helpers.cjs');

function loadRichContentDom() {
    const dom = createDom();
    runScript(dom, 'svp-rich-content.js');
    return dom;
}

test('sanitizeHtml preserves valid image-row and strips unknown classes', () => {
    const dom = loadRichContentDom();
    const { SVPRichContent } = dom.window;

    const sanitized = SVPRichContent.sanitizeHtml(`
        <div class="image-row foo">
            <img src="https://cdn.svp.test/a.jpg">
            <img src="https://cdn.svp.test/b.jpg">
        </div>
    `, {
        allowedTags: ['div', 'img']
    });

    assert.match(sanitized, /class="image-row"/);
    assert.ok(!sanitized.includes('foo'));
});

test('sanitizeHtml auto-upgrades two inline images into image-row markup', () => {
    const dom = loadRichContentDom();
    const { SVPRichContent } = dom.window;

    const sanitized = SVPRichContent.sanitizeHtml(`
        <div>
            <img src="https://cdn.svp.test/a.jpg">
            <img src="https://cdn.svp.test/b.jpg">
        </div>
    `, {
        allowedTags: ['div', 'img']
    });

    assert.match(sanitized, /<div class="image-row">/);
});

test('sanitizeHtml removes stale image-row class when only one image remains', () => {
    const dom = loadRichContentDom();
    const { SVPRichContent } = dom.window;

    const sanitized = SVPRichContent.sanitizeHtml(`
        <div class="image-row">
            <img src="https://cdn.svp.test/a.jpg">
        </div>
    `, {
        allowedTags: ['div', 'img']
    });

    assert.ok(!sanitized.includes('class="image-row"'));
});

test('extractLeadingImageRowUrls returns only the leading row and respects maxItems', () => {
    const dom = loadRichContentDom();
    const { SVPRichContent } = dom.window;

    const urls = SVPRichContent.extractLeadingImageRowUrls(`
        <div>
            <img src="https://cdn.svp.test/1.jpg">
            <img src="https://cdn.svp.test/2.jpg">
            <img src="https://cdn.svp.test/3.jpg">
        </div>
        <p>Nội dung phía sau</p>
    `, { maxItems: 2 });

    assert.deepEqual(Array.from(urls), [
        'https://cdn.svp.test/1.jpg',
        'https://cdn.svp.test/2.jpg'
    ]);
});

test('buildImageRowCoverHtml renders a cover grid with safe attributes', () => {
    const dom = loadRichContentDom();
    const { SVPRichContent } = dom.window;

    const html = SVPRichContent.buildImageRowCoverHtml({
        href: 'https://svpforum.fr/chu-de/1/test',
        imageUrls: [
            'https://cdn.svp.test/1.jpg',
            'https://cdn.svp.test/2.jpg',
            'https://cdn.svp.test/3.jpg'
        ],
        className: 'sv-feed-card__cover',
        tabIndex: -1,
        ariaHidden: true,
        altPrefix: 'Feed cover',
        maxItems: 3
    });

    assert.match(html, /class="svp-image-row-cover sv-feed-card__cover"/);
    assert.match(html, /href="https:\/\/svpforum\.fr\/chu-de\/1\/test"/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /tabindex="-1"/);
    assert.match(html, /--svp-image-row-count:3/);
    assert.equal((html.match(/<img /g) || []).length, 3);
});

test('parseMultiImageUrls normalizes Google Drive image links and reports invalid rows', () => {
    const dom = loadRichContentDom();
    const { SVPRichContent } = dom.window;

    const result = SVPRichContent.parseMultiImageUrls([
        'https://cdn.svp.test/a.jpg',
        'https://drive.google.com/file/d/1Vk-7RL02TScufMkLefuFqk6Igd56RTKw/view?usp=sharing',
        'ftp://invalid.example/image.jpg'
    ].join('\n'));

    assert.deepEqual(Array.from(result.urls), [
        'https://cdn.svp.test/a.jpg',
        'https://drive.google.com/thumbnail?id=1Vk-7RL02TScufMkLefuFqk6Igd56RTKw&sz=w1600'
    ]);
    assert.deepEqual(Array.from(result.invalidEntries), ['ftp://invalid.example/image.jpg']);
});

test('buildImageRowHtml requires at least two valid URLs', () => {
    const dom = loadRichContentDom();
    const { SVPRichContent } = dom.window;

    assert.equal(SVPRichContent.buildImageRowHtml(['https://cdn.svp.test/1.jpg']), '');
    assert.match(
        SVPRichContent.buildImageRowHtml([
            'https://cdn.svp.test/1.jpg',
            'https://cdn.svp.test/2.jpg'
        ]),
        /<div class="image-row">/
    );
});

test('applyImageLayouts groups consecutive horizontal image blocks into one image-row', () => {
    const dom = loadRichContentDom();
    const { document, SVPRichContent } = dom.window;
    const root = document.createElement('div');
    root.innerHTML = `
        <p><img src="https://cdn.svp.test/a.jpg" alt="A"></p>
        <p><img src="https://cdn.svp.test/b.jpg" alt="B"></p>
        <p>Đoạn text sau ảnh</p>
    `;

    SVPRichContent.applyImageLayouts(root);

    const row = root.querySelector('.image-row');
    assert.ok(row);
    assert.equal(row.children.length, 2);
    assert.equal(root.lastElementChild.textContent.trim(), 'Đoạn text sau ảnh');
});

test('arrangePortraitImageRows wraps consecutive portrait images into portrait rows', () => {
    const dom = loadRichContentDom();
    const { document, SVPRichContent } = dom.window;
    const root = document.createElement('div');
    root.innerHTML = `
        <p><img src="https://cdn.svp.test/p1.jpg" alt="P1"></p>
        <p><img src="https://cdn.svp.test/p2.jpg" alt="P2"></p>
        <p><img src="https://cdn.svp.test/p3.jpg" alt="P3"></p>
    `;

    root.querySelectorAll('img').forEach((image) => setImageNaturalSize(image, 600, 1200));
    SVPRichContent.arrangePortraitImageRows(root);

    const row = root.querySelector('.svp-portrait-row');
    assert.ok(row);
    assert.equal(row.children.length, 3);
    assert.ok(Array.from(row.children).every((item) => item.classList.contains('svp-portrait-row__item')));
});

test('cleanupPortraitLayoutHtml removes generated portrait and auto image row wrappers', () => {
    const dom = loadRichContentDom();
    const { SVPRichContent } = dom.window;

    const cleaned = SVPRichContent.cleanupPortraitLayoutHtml(`
        <div class="svp-portrait-row">
            <p class="svp-portrait-row__item" style="--svp-portrait-ratio:0.5"><img src="https://cdn.svp.test/p1.jpg"></p>
            <p class="svp-portrait-row__item" style="--svp-portrait-ratio:0.5"><img src="https://cdn.svp.test/p2.jpg"></p>
        </div>
        <div class="image-row" data-svp-auto-image-row="block">
            <img src="https://cdn.svp.test/p3.jpg">
            <img src="https://cdn.svp.test/p4.jpg">
        </div>
    `);

    assert.ok(!cleaned.includes('svp-portrait-row'));
    assert.ok(!cleaned.includes('svp-portrait-row__item'));
    assert.ok(!cleaned.includes('data-svp-auto-image-row'));
});

test('hasRenderableContent accepts image-only HTML after sanitization', () => {
    const dom = loadRichContentDom();
    const { SVPRichContent } = dom.window;

    const result = SVPRichContent.hasRenderableContent('<p><img src="https://cdn.svp.test/only-image.jpg"></p>', {
        allowedTags: ['p', 'img']
    });

    assert.equal(result, true);
});
