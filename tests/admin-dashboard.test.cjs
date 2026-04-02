const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    makeJsonResponse,
    readFrontendFile
} = require('./dom-test-helpers.cjs');

function extractAdminDashboardInlineScript() {
    const html = readFrontendFile('admin_dashboard.html');
    const match = html.match(/<script>\s*\(function \(\) \{[\s\S]*?loadAll\(\);\s*\}\)\(\);\s*<\/script>/);
    if (!match) {
        throw new Error('Cannot find admin_dashboard inline script.');
    }
    return match[0]
        .replace(/^<script>\s*/, '')
        .replace(/\s*<\/script>$/, '');
}

function installDashboardLeafletStub(window) {
    window.L = {
        map() {
            return {
                setView() { return this; },
                fitBounds() { return this; }
            };
        },
        tileLayer() {
            return {
                addTo() { return this; }
            };
        },
        layerGroup() {
            return {
                addTo() { return this; },
                clearLayers() { return this; }
            };
        },
        circleMarker() {
            return {
                addTo() { return this; },
                bindPopup() { return this; }
            };
        }
    };
}

function makeDashboardFetch(visitsPayload) {
    return async (targetUrl) => {
        const url = new URL(String(targetUrl));
        if (url.pathname.endsWith('/admin/dashboard/overview')) {
            return makeJsonResponse({
                totalUsers: 120,
                totalAdmins: 3,
                totalPosts: 88,
                publishedPosts: 71,
                pendingPosts: 17,
                totalComments: 245,
                totalEvents: 14,
                activeDiscussionNewsletters: 11,
                activeEventNewsletters: 7,
                activeHousingNewsletters: 5,
                activeNewsletters: 11
            });
        }
        if (url.pathname.endsWith('/admin/dashboard/visits')) {
            return makeJsonResponse(visitsPayload);
        }
        throw new Error(`Unexpected fetch: ${targetUrl}`);
    };
}

async function loadAdminDashboard(role, visitsPayload) {
    const dom = createDomFromHtml('admin_dashboard.html', {
        url: 'https://svpforum.fr/admin_dashboard.html',
        fetch: makeDashboardFetch(visitsPayload)
    });
    const { window } = dom;
    window.SVP_API_BASE_URL = 'https://api.svp.test';
    window.SVPAuth = {
        getValidAccessToken: async () => 'token',
        parseJwtPayload: () => ({ role })
    };
    installDashboardLeafletStub(window);

    window.eval(extractAdminDashboardInlineScript());
    await flushAsync(window, 12);
    return dom;
}

test('admin dashboard shows visitor activity hour stats for SUPERADMIN only', async () => {
    const dom = await loadAdminDashboard('SUPERADMIN', {
        days: 30,
        totalVisits: 340,
        uniqueIps: 96,
        daily: [],
        cities: [],
        countries: [],
        paths: [],
        ips: [],
        recentVisits: [],
        activityHours: [
            { hour: 20, visits: 48, uniqueIps: 21 },
            { hour: 9, visits: 31, uniqueIps: 15 },
            { hour: 14, visits: 27, uniqueIps: 12 }
        ],
        loggedInActivityHours: [
            { hour: 18, visits: 19, uniqueIps: 10 },
            { hour: 10, visits: 14, uniqueIps: 8 }
        ],
        engagementSummary: {
            totalSessions: 96,
            totalEngagedSeconds: 7200,
            avgEngagedSeconds: 75,
            totalPageViews: 340,
            loggedInSessions: 34,
            loggedInUsers: 18,
            loggedInReturnVisits: 16,
            loggedInEngagedSeconds: 2800,
            avgLoggedInEngagedSeconds: 82
        },
        loggedInUsers: []
    });

    const { document } = dom.window;
    const engagementCard = document.getElementById('engagement-card');
    const visitorHourListText = document.getElementById('engagement-visitor-hour-list').textContent || '';
    const loggedHourListText = document.getElementById('engagement-logged-hour-list').textContent || '';

    assert.equal(engagementCard.classList.contains('d-none'), false);
    assert.match(engagementCard.textContent || '', /Báo cáo visitor/i);
    assert.match(engagementCard.textContent || '', /Báo cáo user đã đăng nhập/i);
    assert.equal(document.getElementById('engagement-visitor-total-sessions').textContent.trim(), '96');
    assert.equal(document.getElementById('engagement-logged-total-sessions').textContent.trim(), '34');
    assert.equal(document.getElementById('engagement-logged-user-count').textContent.trim(), '18');
    assert.equal(document.getElementById('engagement-visitor-peak-hour').textContent.trim(), '20:00 - 21:00');
    assert.equal(document.getElementById('engagement-logged-peak-hour').textContent.trim(), '18:00 - 19:00');
    assert.match(visitorHourListText, /20:00 - 21:00/);
    assert.match(visitorHourListText, /48 lượt/);
    assert.match(loggedHourListText, /18:00 - 19:00/);
    assert.match(loggedHourListText, /19 phiên/);
    assert.match(loggedHourListText, /10 user/);
});

test('admin dashboard keeps visitor activity stats hidden from ADMIN', async () => {
    const dom = await loadAdminDashboard('ADMIN', {
        days: 30,
        totalVisits: 340,
        uniqueIps: 96,
        daily: [],
        cities: [],
        countries: [],
        paths: [],
        ips: [],
        recentVisits: [],
        activityHours: [
            { hour: 20, visits: 48, uniqueIps: 21 }
        ],
        loggedInActivityHours: [
            { hour: 18, visits: 19, uniqueIps: 10 }
        ],
        engagementSummary: {
            totalSessions: 96,
            totalEngagedSeconds: 7200,
            avgEngagedSeconds: 75,
            totalPageViews: 340,
            loggedInSessions: 34,
            loggedInUsers: 18,
            loggedInReturnVisits: 16,
            loggedInEngagedSeconds: 2800,
            avgLoggedInEngagedSeconds: 82
        },
        loggedInUsers: []
    });

    const engagementCard = dom.window.document.getElementById('engagement-card');
    assert.equal(engagementCard.classList.contains('d-none'), true);
    assert.equal(engagementCard.style.display, 'none');
});

test('admin dashboard lets ADMIN update pending article status quickly', async () => {
    let detailCalls = 0;
    let patchedPayload = null;

    const dom = createDomFromHtml('admin_dashboard.html', {
        url: 'https://svpforum.fr/admin_dashboard.html',
        fetch: async (targetUrl, options = {}) => {
            const url = new URL(String(targetUrl));
            const method = String(options.method || 'GET').toUpperCase();

            if (url.pathname.endsWith('/admin/dashboard/overview')) {
                return makeJsonResponse({
                    totalUsers: 120,
                    totalAdmins: 3,
                    totalPosts: 88,
                    publishedPosts: 71,
                    pendingPosts: 17,
                    totalComments: 245,
                    totalEvents: 14,
                    activeDiscussionNewsletters: 11,
                    activeEventNewsletters: 7,
                    activeHousingNewsletters: 5,
                    activeNewsletters: 11
                });
            }
            if (url.pathname.endsWith('/admin/dashboard/visits')) {
                return makeJsonResponse({
                    days: 30,
                    totalVisits: 340,
                    uniqueIps: 96,
                    daily: [],
                    cities: [],
                    countries: [],
                    paths: [],
                    ips: [],
                    recentVisits: [],
                    activityHours: [],
                    loggedInActivityHours: [],
                    engagementSummary: null,
                    loggedInUsers: []
                });
            }
            if (url.pathname.endsWith('/admin/dashboard/details')) {
                detailCalls += 1;
                assert.equal(url.searchParams.get('type'), 'posts');
                assert.equal(url.searchParams.get('status'), 'PENDING');
                return makeJsonResponse(detailCalls === 1 ? {
                    items: [
                        {
                            postId: 91,
                            title: 'Bai viet dang cho duyet',
                            status: 'PENDING',
                            isArticle: true,
                            createdAt: '2026-04-02T08:00:00Z',
                            authorDisplayName: 'Writer'
                        }
                    ],
                    hasMore: false,
                    page: 1,
                    limit: 20
                } : {
                    items: [],
                    hasMore: false,
                    page: 1,
                    limit: 20
                });
            }
            if (url.pathname.endsWith('/posts/91/status') && method === 'PATCH') {
                patchedPayload = JSON.parse(String(options.body || '{}'));
                return makeJsonResponse({
                    postId: 91,
                    status: 'PUBLISHED'
                });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });

    const { window } = dom;
    window.SVP_API_BASE_URL = 'https://api.svp.test';
    window.SVPAuth = {
        getValidAccessToken: async () => 'token',
        parseJwtPayload: () => ({ role: 'ADMIN' })
    };
    installDashboardLeafletStub(window);

    window.eval(extractAdminDashboardInlineScript());
    await flushAsync(window, 12);

    const { document } = window;
    document.querySelector('[data-detail="posts"][data-status="PENDING"]').click();
    await flushAsync(window, 12);

    const statusSelect = document.querySelector('[data-post-status-select="91"]');
    const statusSaveBtn = document.querySelector('[data-post-status-save="91"]');
    assert.ok(statusSelect);
    assert.ok(statusSaveBtn);

    statusSelect.value = 'PUBLISHED';
    statusSaveBtn.click();
    await flushAsync(window, 16);

    assert.deepEqual(patchedPayload, { status: 'PUBLISHED' });
    assert.equal(document.getElementById('kpi-posts-pending').textContent.trim(), '16');
    assert.equal(document.getElementById('kpi-posts-published').textContent.trim(), '72');
    assert.match(document.getElementById('detail-status').textContent || '', /#91 → PUBLISHED/);
    assert.match(document.getElementById('detail-body').textContent || '', /Chưa có dữ liệu/);
});
