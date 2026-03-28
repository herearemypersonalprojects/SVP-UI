const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    installLeafletStub,
    runScript
} = require('./dom-test-helpers.cjs');

async function loadHousingFormPage() {
    const dom = createDomFromHtml('housing_form.html', {
        url: 'https://svpforum.fr/housing_form.html',
        fetch: async (targetUrl) => {
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });
    const { window } = dom;
    installLeafletStub(window);
    window.localStorage.setItem('accessToken', 'token');
    window.URL.createObjectURL = () => 'blob:test-upload-image';
    window.URL.revokeObjectURL = () => {};

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
