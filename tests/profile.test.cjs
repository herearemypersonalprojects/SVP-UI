const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROFILE_PATH = path.join(__dirname, '..', 'profile.js');
const PROFILE_HTML_PATH = path.join(__dirname, '..', 'profile.html');
const PROFILE_SOURCE = fs.readFileSync(PROFILE_PATH, 'utf8');
const PROFILE_HTML_SOURCE = fs.readFileSync(PROFILE_HTML_PATH, 'utf8');
const PUBLIC_USER_ID = '08984bba-f5dd-40f8-97fc-d7338b97155a';
const REQUIRED_IDS = [
    'profile-avatar',
    'profile-display-name',
    'profile-nickname',
    'profile-role',
    'profile-email',
    'profile-blog-count',
    'profile-follower-count',
    'profile-message-actions',
    'profile-write-link',
    'profile-follow-btn',
    'profile-follow-login',
    'profile-message-link',
    'profile-panel-head',
    'profile-panel-title',
    'profile-headline',
    'profile-space-title',
    'profile-space-note',
    'profile-tabs',
    'profile-tab-blog',
    'profile-tab-manage',
    'profile-panel-blog',
    'profile-panel-manage',
    'profile-blog-list',
    'profile-form',
    'profile-readonly',
    'profile-display-input',
    'profile-avatar-url',
    'profile-avatar-file',
    'profile-preview-avatar',
    'profile-preview-label',
    'profile-status',
    'profile-clear-avatar'
];

function createClassList() {
    const tokens = new Set();
    return {
        add(...values) {
            values.forEach((value) => tokens.add(String(value)));
        },
        remove(...values) {
            values.forEach((value) => tokens.delete(String(value)));
        },
        toggle(value, force) {
            const token = String(value);
            if (typeof force === 'boolean') {
                if (force) tokens.add(token);
                else tokens.delete(token);
                return force;
            }
            if (tokens.has(token)) {
                tokens.delete(token);
                return false;
            }
            tokens.add(token);
            return true;
        },
        contains(value) {
            return tokens.has(String(value));
        }
    };
}

function createElement(id) {
    return {
        id,
        value: '',
        href: '',
        textContent: '',
        innerHTML: '',
        className: '',
        disabled: false,
        style: {},
        files: [],
        classList: createClassList(),
        addEventListener() {},
        setAttribute() {},
        getAttribute() { return ''; }
    };
}

async function flushMicrotasks() {
    for (let index = 0; index < 6; index += 1) {
        await Promise.resolve();
    }
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.resolve();
}

function loadProfilePage({ search = '', fetchImpl } = {}) {
    const elements = new Map(REQUIRED_IDS.map((id) => [id, createElement(id)]));
    const fetchCalls = [];
    const historyCalls = [];
    const document = {
        title: '',
        getElementById(id) {
            return elements.get(id) || null;
        }
    };
    const location = {
        href: `https://svpforum.fr/profile.html${search}`,
        search,
        pathname: '/profile.html'
    };
    const history = {
        replaceState(_state, _title, url) {
            historyCalls.push(String(url));
            location.href = `https://svpforum.fr/${String(url).replace(/^\/+/, '')}`;
        }
    };
    const fetch = async (url, options) => {
        fetchCalls.push({ url: String(url), options: options || {} });
        return fetchImpl(url, options);
    };
    const window = {
        location,
        history,
        fetch,
        SVPAuth: {
            buildProfileHref({ nickname, userId, authUserId }, fallback = 'profile.html') {
                if (String(authUserId || '').trim()) {
                    return `profile.html?auth_user_id=${encodeURIComponent(String(authUserId).trim())}`;
                }
                if (String(userId || '').trim()) {
                    return `profile.html?user_id=${encodeURIComponent(String(userId).trim())}`;
                }
                if (String(nickname || '').trim()) {
                    return `profile.html?nickname=${encodeURIComponent(String(nickname).trim())}`;
                }
                return fallback;
            },
            getValidAccessToken: async () => null
        },
        SVPAvatar: null,
        setTimeout: () => 1,
        clearTimeout: () => {}
    };
    const context = {
        window,
        document,
        fetch,
        console,
        URL,
        URLSearchParams,
        Intl,
        Math,
        JSON,
        Promise,
        Date,
        setTimeout: () => 1,
        clearTimeout: () => {}
    };

    window.document = document;
    window.URL = URL;
    vm.createContext(context);
    vm.runInContext(PROFILE_SOURCE, context, { filename: 'profile.js' });
    return { fetchCalls, historyCalls, elements, document, window };
}

test('profile.html keeps all DOM hooks required by profile.js', () => {
    const missingIds = REQUIRED_IDS.filter((id) => !PROFILE_HTML_SOURCE.includes(`id="${id}"`));
    assert.deepEqual(missingIds, []);
});

test('profile page requests espace by authUserId when auth_user_id is present', async () => {
    const env = loadProfilePage({
        search: '?auth_user_id=81',
        fetchImpl: async (url) => {
            if (String(url).includes('/users/espace?')) {
                return {
                    ok: true,
                    json: async () => ({
                        profile: {
                            userId: PUBLIC_USER_ID,
                            authUserId: '81',
                            nickname: 'alice',
                            displayName: 'Alice',
                            avatarUrl: '',
                            role: 'USER'
                        },
                        stats: { blogCount: 2, followerCount: 5 },
                        viewer: { authenticated: false, self: false, canFollow: false, following: false },
                        articles: []
                    })
                };
            }
            throw new Error(`Unexpected fetch: ${url}`);
        }
    });

    await flushMicrotasks();

    assert.ok(env.fetchCalls.some((call) => call.url.includes('/users/espace?authUserId=81&limit=12')));
    assert.equal(env.historyCalls.at(-1), 'profile.html?auth_user_id=81');
});

test('profile page canonicalizes legacy nickname URL to auth_user_id after loading espace', async () => {
    const env = loadProfilePage({
        search: '?nickname=alice',
        fetchImpl: async (url) => {
            if (String(url).includes('/users/espace?nickname=alice&limit=12')) {
                return {
                    ok: true,
                    json: async () => ({
                        profile: {
                            userId: PUBLIC_USER_ID,
                            authUserId: '81',
                            nickname: 'alice',
                            displayName: 'Alice',
                            avatarUrl: '',
                            role: 'USER'
                        },
                        stats: { blogCount: 0, followerCount: 0 },
                        viewer: { authenticated: false, self: false, canFollow: false, following: false },
                        articles: []
                    })
                };
            }
            throw new Error(`Unexpected fetch: ${url}`);
        }
    });

    await flushMicrotasks();

    assert.equal(env.historyCalls.at(-1), 'profile.html?auth_user_id=81');
    assert.equal(env.document.title, 'Alice - Espace SVP');
    assert.equal(env.elements.get('profile-nickname').textContent, '');
    assert.equal(env.elements.get('profile-nickname').classList.contains('d-none'), true);
});
