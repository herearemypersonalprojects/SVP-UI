const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const AUTH_TOPBAR_PATH = path.join(__dirname, '..', 'auth-topbar.js');
const AUTH_TOPBAR_SOURCE = fs.readFileSync(AUTH_TOPBAR_PATH, 'utf8');
const PUBLIC_USER_ID = '08984bba-f5dd-40f8-97fc-d7338b97155a';

function makeToken(payload) {
    const encode = (value) => Buffer.from(JSON.stringify(value), 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
    return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

function loadAuthTopbar({ localStorageEntries = {} } = {}) {
    const store = new Map(
        Object.entries(localStorageEntries).map(([key, value]) => [key, String(value)])
    );
    const authBox = {
        innerHTML: '<a href="login.html">Login</a>',
        querySelector: () => null
    };
    const document = {
        hidden: false,
        referrer: '',
        querySelector: (selector) => (selector === '.sv-auth' ? authBox : null),
        getElementById: () => null,
        addEventListener: () => {}
    };
    const location = {
        origin: 'https://svpforum.fr',
        href: 'https://svpforum.fr/index.html',
        pathname: '/index.html',
        search: '',
        protocol: 'https:'
    };
    const window = {
        location,
        requestIdleCallback: () => 1,
        setTimeout: () => 1,
        clearTimeout: () => {},
        addEventListener: () => {},
        crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' }
    };
    const localStorage = {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        }
    };
    const fetch = async () => ({ ok: true, json: async () => ({}) });
    const context = {
        window,
        document,
        localStorage,
        fetch,
        console,
        URL,
        Promise,
        JSON,
        Math,
        Date,
        setTimeout: () => 1,
        clearTimeout: () => {},
        atob: (value) => Buffer.from(value, 'base64').toString('binary')
    };

    window.document = document;
    window.localStorage = localStorage;
    window.fetch = fetch;
    window.console = console;
    window.URL = URL;

    vm.createContext(context);
    vm.runInContext(AUTH_TOPBAR_SOURCE, context, { filename: 'auth-topbar.js' });
    return { window: context.window, store, authBox };
}

test('saveSession stores public userId UUID separately from authUserId', () => {
    const env = loadAuthTopbar();

    const saved = env.window.SVPAuth.saveSession({
        accessToken: 'header.payload.signature',
        refreshToken: 'refresh-token',
        userId: PUBLIC_USER_ID,
        authUserId: 81,
        email: 'alice@example.com',
        nickname: 'alice',
        displayName: 'Alice'
    });

    assert.equal(saved, true);
    assert.equal(env.store.get('userId'), PUBLIC_USER_ID);
    assert.equal(env.store.get('authUserId'), '81');
    assert.equal(env.store.get('userEmail'), 'alice@example.com');
});

test('buildProfileHref prefers auth_user_id over public UUID', () => {
    const env = loadAuthTopbar();

    const href = env.window.SVPAuth.buildProfileHref({
        userId: PUBLIC_USER_ID,
        authUserId: '81',
        nickname: 'alice'
    });

    assert.equal(href, 'profile.html?auth_user_id=81');
});

test('topbar renders profile link with auth_user_id from access token claim', () => {
    const token = makeToken({
        sub: '81',
        userId: PUBLIC_USER_ID,
        email: 'alice@example.com',
        nickname: 'alice',
        displayName: 'Alice',
        role: 'USER',
        exp: Math.floor(Date.now() / 1000) + 3600
    });
    const env = loadAuthTopbar({
        localStorageEntries: {
            accessToken: token
        }
    });

    assert.match(env.authBox.innerHTML, /profile\.html\?auth_user_id=81/);
    assert.ok(!env.authBox.innerHTML.includes('nickname=alice'));
});

test('topbar uses auth_user_id from JWT sub when only stale numeric userId exists', () => {
    const token = makeToken({
        sub: '81',
        email: 'alice@example.com',
        nickname: 'alice',
        displayName: 'Alice',
        role: 'USER',
        exp: Math.floor(Date.now() / 1000) + 3600
    });
    const env = loadAuthTopbar({
        localStorageEntries: {
            accessToken: token,
            userId: '81',
            userNickname: 'alice'
        }
    });

    assert.ok(env.authBox.innerHTML.includes('href="profile.html?auth_user_id=81"'));
    assert.ok(!env.authBox.innerHTML.includes('nickname=alice'));
});
