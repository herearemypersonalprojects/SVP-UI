const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDom,
    createDomFromHtml,
    runScript
} = require('./dom-test-helpers.cjs');

test('seo guard redirects logged-out visitors away from protected pages', () => {
    const dom = createDomFromHtml('forum.html', {
        url: 'https://svpforum.fr/forum.html'
    });
    const { window } = dom;

    window.__SVP_BYPASS_AUTH_GUARD = false;
    window.localStorage.clear();

    runScript(dom, 'seo.js');

    assert.equal(
        window.__SVP_LAST_AUTH_REDIRECT,
        'https://svpforum.fr/login.html?redirect=%2Fforum.html'
    );
});

test('seo guard keeps index public for logged-out visitors', () => {
    const dom = createDomFromHtml('index.html', {
        url: 'https://svpforum.fr/index.html'
    });
    const { window } = dom;

    window.__SVP_BYPASS_AUTH_GUARD = false;
    window.localStorage.clear();

    runScript(dom, 'seo.js');

    assert.equal(window.__SVP_LAST_AUTH_REDIRECT, undefined);
});

test('seo guard allows guests to stay on login page', () => {
    const dom = createDomFromHtml('login.html', {
        url: 'https://svpforum.fr/login.html?redirect=%2Fforum.html'
    });
    const { window } = dom;

    window.__SVP_BYPASS_AUTH_GUARD = false;
    window.localStorage.clear();

    runScript(dom, 'seo.js');

    assert.equal(window.__SVP_LAST_AUTH_REDIRECT, undefined);
});

test('seo guard redirects logged-in users away from login page', () => {
    const dom = createDomFromHtml('login.html', {
        url: 'https://svpforum.fr/login.html?redirect=%2Fforum.html'
    });
    const { window } = dom;

    window.__SVP_BYPASS_AUTH_GUARD = false;
    window.localStorage.setItem('refreshToken', 'refresh-token');

    runScript(dom, 'seo.js');

    assert.equal(window.__SVP_LAST_AUTH_REDIRECT, 'https://svpforum.fr/forum.html');
});

test('config guard protects nested Paris pages that do not load seo.js', () => {
    const dom = createDom({
        html: '<!doctype html><html lang="vi"><head></head><body></body></html>',
        url: 'https://svpforum.fr/assets/paris/index.html'
    });
    const { window } = dom;

    window.__SVP_BYPASS_AUTH_GUARD = false;
    window.localStorage.clear();

    runScript(dom, 'config.js');

    assert.equal(
        window.__SVP_LAST_AUTH_REDIRECT,
        'https://svpforum.fr/login.html?redirect=%2Fassets%2Fparis%2Findex.html'
    );
});
