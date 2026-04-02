const test = require('node:test');
const assert = require('node:assert/strict');

const { createDom, readFrontendFile } = require('./dom-test-helpers.cjs');
const parisMapApi = require('../paris-map.js');

test('Paris detail page renders place content from slug and updates SEO tags', async () => {
    const dom = createDom({
        html: `
            <!doctype html>
            <html lang="vi">
            <head></head>
            <body data-paris-slug="thap-eiffel">
                <div id="parisPlaceDetail"></div>
            </body>
            </html>
        `,
        url: 'https://svpforum.fr/ban-do-paris/thap-eiffel/'
    });

    dom.window.SVPParisMap = parisMapApi;
    dom.window.eval(readFrontendFile('paris-detail-page.js'));
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));

    const title = dom.window.document.title;
    const canonical = dom.window.document.querySelector('link[rel="canonical"]');
    const content = dom.window.document.getElementById('parisPlaceDetail').textContent;

    assert.match(title, /Tháp Eiffel/);
    assert.equal(canonical.href, 'https://www.svpforum.fr/ban-do-paris/thap-eiffel/');
    assert.match(content, /Khoảnh khắc nên đi/);
    assert.match(content, /Google Maps/);
});
