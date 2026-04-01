const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    installLeafletStub,
    makeJsonResponse,
    runScript
} = require('./dom-test-helpers.cjs');

async function loadHousingFormPage(options = {}) {
    const dom = createDomFromHtml('housing_form.html', {
        url: 'https://svpforum.fr/housing_form.html',
        fetch: options.fetch || (async (targetUrl) => {
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        })
    });
    const { window } = dom;
    installLeafletStub(window);
    window.localStorage.setItem('accessToken', 'token');
    window.URL.createObjectURL = () => 'blob:test-upload-image';
    window.URL.revokeObjectURL = () => {};
    if (typeof options.configureWindow === 'function') {
        options.configureWindow(window);
    }

    runScript(dom, 'seo.js');
    runScript(dom, 'housing-shared.js');
    runScript(dom, 'svp-rich-content.js');
    runScript(dom, 'housing-form.js');
    await flushAsync(window);
    return dom;
}

function dispatchInput(window, element, value) {
    element.value = value;
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function dispatchChange(window, element, value) {
    element.value = value;
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
}

test('housing form preview uses a leading image row from the description when available', async () => {
    const dom = await loadHousingFormPage();
    const { document, Event } = dom.window;

    dispatchInput(dom.window, document.getElementById('housing-title-input'), 'Studio T9');
    dispatchInput(dom.window, document.getElementById('housing-description-input'), `
        <div>
            <img src="https://cdn.svp.test/housing/preview-1.jpg" alt="1">
            <img src="https://cdn.svp.test/housing/preview-2.jpg" alt="2">
        </div>
    `);

    const preview = document.getElementById('housing-preview-main');
    assert.ok(preview.querySelector('.svp-image-row-cover'));
    assert.match(preview.textContent, /Studio T9/);

    document.getElementById('housing-description-input').dispatchEvent(new Event('change', { bubbles: true }));
});

test('housing form preview falls back to the uploaded primary image when there is no description row', async () => {
    const dom = await loadHousingFormPage();
    const { document, File } = dom.window;
    const imageFilesEl = document.getElementById('housing-image-files');
    const file = new File(['image-bytes'], 'preview.png', { type: 'image/png' });

    Object.defineProperty(imageFilesEl, 'files', {
        configurable: true,
        value: [file]
    });
    imageFilesEl.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const previewImage = document.getElementById('housing-preview-main').querySelector('img.sv-housing-image-thumb');
    assert.ok(previewImage);
    assert.equal(previewImage.getAttribute('src'), 'blob:test-upload-image');
});

test('housing form preview still prioritizes the description image row over uploaded images', async () => {
    const dom = await loadHousingFormPage();
    const { document, File } = dom.window;
    const imageFilesEl = document.getElementById('housing-image-files');
    const file = new File(['image-bytes'], 'preview.png', { type: 'image/png' });

    Object.defineProperty(imageFilesEl, 'files', {
        configurable: true,
        value: [file]
    });
    imageFilesEl.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    dispatchInput(dom.window, document.getElementById('housing-description-input'), `
        <div>
            <img src="https://cdn.svp.test/housing/override-1.jpg" alt="1">
            <img src="https://cdn.svp.test/housing/override-2.jpg" alt="2">
        </div>
    `);

    const preview = document.getElementById('housing-preview-main');
    assert.ok(preview.querySelector('.svp-image-row-cover'));
    assert.equal(preview.querySelector('.svp-image-row-cover img').getAttribute('src'), 'https://cdn.svp.test/housing/override-1.jpg');
    assert.ok(!preview.innerHTML.includes('blob:test-upload-image'));
});

test('housing form geocode button supports touchend without double firing', async () => {
    let geocodeCalls = 0;
    const dom = await loadHousingFormPage({
        fetch: async (targetUrl) => {
            geocodeCalls += 1;
            assert.match(String(targetUrl), /\/api\/housing\/geocode\?/);
            return makeJsonResponse({
                suggestions: [
                    {
                        label: 'Tolbiac, Paris',
                        latitude: 48.826,
                        longitude: 2.357,
                        city: 'Paris',
                        arrondissement: '13'
                    }
                ]
            });
        }
    });
    const { document } = dom.window;
    const addressInput = document.getElementById('housing-address-text-input');
    const geocodeBtn = document.getElementById('housing-geocode-btn');

    dispatchInput(dom.window, addressInput, 'Tolbiac');
    geocodeBtn.dispatchEvent(new dom.window.Event('touchend', { bubbles: true, cancelable: true }));
    geocodeBtn.dispatchEvent(new dom.window.Event('click', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window);

    assert.equal(geocodeCalls, 1);
    assert.equal(document.querySelectorAll('#housing-geocode-results button').length, 1);
    assert.match(document.getElementById('housing-geocode-status').textContent, /Đã tải gợi ý/);
});

test('housing form submit button supports touchend without double submit', async () => {
    let submitCalls = 0;
    let submittedPayload = null;
    const dom = await loadHousingFormPage({
        fetch: async (targetUrl, options = {}) => {
            submitCalls += 1;
            assert.equal(String(targetUrl), 'http://localhost:8080/api/housing');
            assert.equal(options.method, 'POST');
            submittedPayload = JSON.parse(String(options.body || '{}'));
            return makeJsonResponse({ listingId: 'listing-touch-123' });
        }
    });
    const { document } = dom.window;
    const form = document.getElementById('housing-form');
    const submitBtn = document.getElementById('housing-submit-btn');
    const typeEl = document.getElementById('housing-type-input');
    const realSetTimeout = document.defaultView.setTimeout.bind(document.defaultView);

    document.defaultView.setTimeout = (callback, delay = 0, ...args) => {
        if (Number(delay) >= 400) {
            return 1;
        }
        return realSetTimeout(callback, delay, ...args);
    };
    Object.defineProperty(form, 'requestSubmit', {
        configurable: true,
        value: function requestSubmit() {
            this.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
        }
    });

    dispatchInput(dom.window, document.getElementById('housing-title-input'), 'Studio quai de Seine');
    dispatchInput(dom.window, document.getElementById('housing-price-input'), '650');
    dispatchChange(dom.window, typeEl, 'STUDIO');
    dispatchInput(dom.window, document.getElementById('housing-city-input'), 'Paris');
    dispatchInput(dom.window, document.getElementById('housing-address-text-input'), 'Tolbiac');
    dispatchInput(dom.window, document.getElementById('housing-description-input'), `
        <p>Studio meublé très calme, lumineux, disponible immédiatement.</p>
        <p><img src="https://cdn.svp.test/housing/detail-submit.jpg" alt="detail"></p>
    `);

    submitBtn.dispatchEvent(new dom.window.Event('touchend', { bubbles: true, cancelable: true }));
    submitBtn.dispatchEvent(new dom.window.Event('click', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window);

    assert.equal(submitCalls, 1);
    assert.equal(submittedPayload.title, 'Studio quai de Seine');
    assert.equal(submittedPayload.propertyType, 'STUDIO');
    assert.equal(submittedPayload.addressText, 'Tolbiac');
    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/housing/detail-submit.jpg');
    assert.equal(submittedPayload.transitPoints.length, 1);
    assert.equal(document.getElementById('housing-submit-feedback').textContent, 'Đã đăng tin thuê nhà.');
});

test('housing form submit sends imageUrl from the uploaded primary image when a gallery image exists', async () => {
    let submitCalls = 0;
    let submittedPayload = null;
    let presignCalls = 0;
    const dom = await loadHousingFormPage({
        fetch: async (targetUrl, options = {}) => {
            const url = String(targetUrl);
            const method = String(options.method || 'GET').toUpperCase();
            if (url === 'http://localhost:8080/api/upload/post-image') {
                presignCalls += 1;
                return makeJsonResponse({
                    uploadUrl: 'https://upload.svp.test/housing/image-1',
                    publicUrl: 'https://cdn.svp.test/housing/uploaded-primary.jpg'
                });
            }
            if (url === 'https://upload.svp.test/housing/image-1' && method === 'PUT') {
                return { ok: true, status: 200 };
            }
            if (url === 'http://localhost:8080/api/housing' && method === 'POST') {
                submitCalls += 1;
                submittedPayload = JSON.parse(String(options.body || '{}'));
                return makeJsonResponse({ listingId: 'listing-upload-123' });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });
    const { document, File } = dom.window;
    const imageFilesEl = document.getElementById('housing-image-files');
    const form = document.getElementById('housing-form');
    const submitBtn = document.getElementById('housing-submit-btn');
    const realSetTimeout = document.defaultView.setTimeout.bind(document.defaultView);

    document.defaultView.setTimeout = (callback, delay = 0, ...args) => {
        if (Number(delay) >= 400) {
            return 1;
        }
        return realSetTimeout(callback, delay, ...args);
    };
    Object.defineProperty(form, 'requestSubmit', {
        configurable: true,
        value: function requestSubmit() {
            this.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
        }
    });

    Object.defineProperty(imageFilesEl, 'files', {
        configurable: true,
        value: [new File(['image-bytes'], 'primary.png', { type: 'image/png' })]
    });
    imageFilesEl.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    dispatchInput(dom.window, document.getElementById('housing-title-input'), 'Studio Tolbiac');
    dispatchInput(dom.window, document.getElementById('housing-price-input'), '640');
    dispatchChange(dom.window, document.getElementById('housing-type-input'), 'STUDIO');
    dispatchInput(dom.window, document.getElementById('housing-city-input'), 'Paris');
    dispatchInput(dom.window, document.getElementById('housing-address-text-input'), 'Tolbiac');
    dispatchInput(dom.window, document.getElementById('housing-description-input'), 'Studio meublé très calme, lumineux, disponible immédiatement.');

    submitBtn.dispatchEvent(new dom.window.Event('touchend', { bubbles: true, cancelable: true }));
    submitBtn.dispatchEvent(new dom.window.Event('click', { bubbles: true, cancelable: true }));
    await flushAsync(dom.window, 12);

    assert.equal(presignCalls, 1);
    assert.equal(submitCalls, 1);
    assert.equal(submittedPayload.imageUrl, 'https://cdn.svp.test/housing/uploaded-primary.jpg');
    assert.equal(submittedPayload.images[0].imageUrl, 'https://cdn.svp.test/housing/uploaded-primary.jpg');
});
