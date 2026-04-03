const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDom,
    flushAsync,
    runScript
} = require('./dom-test-helpers.cjs');

function buildTopbarDom() {
    return createDom({
        html: `
            <!doctype html>
            <html lang="vi">
            <body>
                <div class="sv-topbar">
                    <div class="container d-flex align-items-center justify-content-between">
                        <div class="sv-brand">
                            <img class="sv-brand__logo-img" src="assets/icons/logo_svp.png" alt="SVP" />
                            <div class="sv-brand__title">
                                <h1>DIEN DAN SINH VIEN & TRI THUC VIET TAI PHAP</h1>
                                <div class="sv-brand__divider"></div>
                                <small class="sv-brand__tagline">Ket Noi - Chia Se - Thanh Cong</small>
                            </div>
                        </div>
                        <div class="sv-auth d-none d-md-flex align-items-center gap-2">
                            <a class="btn btn-primary" href="login.html">Dang Nhap</a>
                        </div>
                    </div>
                </div>
                <div class="sv-nav">
                    <div class="container">
                        <ul class="nav">
                            <li class="nav-item"><a class="nav-link active" href="index.html">Trang Chu</a></li>
                            <li class="nav-item"><a class="nav-link" href="forum.html">Dien Dan</a></li>
                        </ul>
                    </div>
                </div>
            </body>
            </html>
        `,
        url: 'https://svpforum.fr/forum.html',
        fetch: async (targetUrl) => {
            const url = new URL(String(targetUrl));
            if (url.pathname === '/stats/visit' || url.pathname === '/stats/visit-session') {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({})
                };
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });
}

test('auth topbar wraps the main brand with a homepage link', async () => {
    const dom = buildTopbarDom();
    const { window } = dom;
    window.requestIdleCallback = (callback) => window.setTimeout(() => callback({
        didTimeout: false,
        timeRemaining: () => 50
    }), 0);
    window.cancelIdleCallback = (id) => window.clearTimeout(id);
    window.crypto = { randomUUID: () => '00000000-0000-4000-8000-000000000000' };
    window.navigator.sendBeacon = () => false;

    runScript(dom, 'auth-topbar.js');
    await flushAsync(window, 8);

    const brandLink = window.document.querySelector('.sv-topbar .sv-brand > .sv-brand__home');
    assert.ok(brandLink);
    assert.equal(brandLink.getAttribute('href'), 'index.html');
    assert.ok(brandLink.querySelector('.sv-brand__logo-img'));
    assert.ok(brandLink.querySelector('.sv-brand__title'));
    assert.equal(window.document.querySelectorAll('.sv-topbar .sv-brand > .sv-brand__home').length, 1);
});
