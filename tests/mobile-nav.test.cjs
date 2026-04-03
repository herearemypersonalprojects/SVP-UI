const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDom,
    flushAsync,
    runScript
} = require('./dom-test-helpers.cjs');

function createMobileMatchMedia() {
    return () => ({
        matches: true,
        media: '(max-width: 991.98px)',
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return false; }
    });
}

function buildNavDom() {
    return createDom({
        html: `
            <!doctype html>
            <html lang="vi">
            <body>
                <div class="sv-topbar">
                    <div class="container">
                        <div class="sv-brand">SVP</div>
                        <div id="sv-auth-box" class="sv-auth d-none d-md-flex align-items-center gap-2">
                            <a class="btn btn-outline-secondary" href="signup.html">Dang Ky</a>
                            <a class="btn btn-primary" href="login.html">Dang Nhap</a>
                        </div>
                    </div>
                </div>
                <div class="sv-nav">
                    <div class="container d-flex align-items-center justify-content-between">
                        <ul class="nav">
                            <li class="nav-item"><a class="nav-link active" href="index.html">Trang Chu</a></li>
                            <li class="nav-item"><a class="nav-link" href="forum.html">Dien Dan</a></li>
                            <li class="nav-item"><a class="nav-link" href="events.html">Su Kien</a></li>
                        </ul>
                        <div class="sv-search position-relative" style="width:min(320px, 60vw);">
                            <input class="form-control" type="search" placeholder="Tim kiem..." />
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
        url: 'https://svpforum.fr/index.html'
    });
}

test('mobile nav injects a collapsed trigger into the navbar and mirrors links into the drawer', async () => {
    const dom = buildNavDom();
    const { window } = dom;
    window.matchMedia = createMobileMatchMedia();

    runScript(dom, 'mobile-nav.js');
    window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
    await flushAsync(window, 4);

    const summary = window.document.querySelector('.sv-mobile-nav-summary');
    const trigger = window.document.querySelector('.sv-hamburger');
    const drawer = window.document.querySelector('.sv-mobile-drawer');

    assert.ok(window.document.body.classList.contains('sv-mobile-nav-active'));
    assert.ok(summary);
    const homeLink = summary.querySelector('.sv-mobile-nav-summary__home');
    assert.equal(homeLink?.textContent, 'Trang Chu');
    assert.match(homeLink?.getAttribute('href') || '', /index\.html/);
    assert.ok(trigger);
    assert.equal(trigger.textContent.trim(), '...');
    assert.ok(drawer);

    const drawerLinks = Array.from(drawer.querySelectorAll('.sv-mobile-drawer__nav a')).map((node) => node.textContent.trim());
    assert.deepEqual(drawerLinks, ['Trang Chu', 'Dien Dan', 'Su Kien']);
    assert.equal(drawer.querySelector('.sv-mobile-drawer__search input')?.getAttribute('placeholder'), 'Tim kiem...');
    assert.match(drawer.querySelector('.sv-mobile-drawer__auth')?.textContent || '', /Dang Nhap/);
});

test('mobile nav drawer opens and closes from the collapsed trigger', async () => {
    const dom = buildNavDom();
    const { window } = dom;
    window.matchMedia = createMobileMatchMedia();

    runScript(dom, 'mobile-nav.js');
    window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
    await flushAsync(window, 4);

    const trigger = window.document.querySelector('.sv-hamburger');
    const drawer = window.document.querySelector('.sv-mobile-drawer');
    const overlay = window.document.querySelector('.sv-mobile-overlay');

    trigger.click();
    await flushAsync(window, 2);

    assert.ok(drawer.classList.contains('open'));
    assert.ok(overlay.classList.contains('open'));
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');

    overlay.click();
    await flushAsync(window, 2);

    assert.equal(drawer.classList.contains('open'), false);
    assert.equal(overlay.classList.contains('open'), false);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
});
