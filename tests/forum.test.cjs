const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    makeJsonResponse
} = require('./dom-test-helpers.cjs');

function runForumInlineScript(dom) {
    const script = Array.from(dom.window.document.querySelectorAll('script'))
        .find((candidate) => String(candidate.textContent || '').includes('fetchThreads'));
    assert.ok(script, 'forum inline script not found');
    dom.window.eval(script.textContent);
}

async function loadForumPage(fetch) {
    const dom = createDomFromHtml('forum.html', {
        url: 'https://svpforum.fr/forum.html',
        fetch
    });
    dom.window.SVP_API_BASE_URL = 'https://api.svp.test';
    runForumInlineScript(dom);
    await flushAsync(dom.window, 12);
    return dom;
}

function makeThread(overrides = {}) {
    return {
        postId: overrides.postId ?? 1,
        title: overrides.title || 'Chủ đề SVP',
        categoryId: overrides.categoryId ?? 3,
        viewCount: overrides.viewCount ?? 10,
        commentCount: overrides.commentCount ?? 0,
        createdAt: overrides.createdAt || '2026-04-01T10:00:00Z',
        updatedAt: overrides.updatedAt || overrides.createdAt || '2026-04-01T10:00:00Z',
        lastCommentAt: overrides.lastCommentAt || '',
        lastActivityAt: overrides.lastActivityAt || overrides.lastCommentAt || overrides.updatedAt || overrides.createdAt || '2026-04-01T10:00:00Z',
        featured: Boolean(overrides.featured ?? false),
        contentHtml: overrides.contentHtml || '<p>Nội dung thảo luận.</p>',
        author: overrides.author || {
            displayName: 'Thành viên SVP',
            nickname: 'svp'
        }
    };
}

function readThreadTitles(document) {
    return Array.from(document.querySelectorAll('#forum-thread-list .sv-forum-topic__title'))
        .map((element) => element.textContent.trim());
}

test('forum sorts topics by featured first, then latest edit or comment activity', async () => {
    const payload = {
        items: [
            makeThread({
                postId: 1,
                title: 'Tin mới tạo',
                createdAt: '2026-04-03T10:00:00Z',
                updatedAt: '2026-04-03T10:00:00Z'
            }),
            makeThread({
                postId: 2,
                title: 'Tin cũ vừa sửa',
                createdAt: '2026-03-20T10:00:00Z',
                updatedAt: '2026-04-05T10:00:00Z'
            }),
            makeThread({
                postId: 3,
                title: 'Tin cũ có comment mới',
                createdAt: '2026-03-18T10:00:00Z',
                updatedAt: '2026-03-18T10:00:00Z',
                lastCommentAt: '2026-04-06T10:00:00Z',
                lastActivityAt: '2026-04-06T10:00:00Z'
            }),
            makeThread({
                postId: 4,
                title: 'Tin nổi bật cũ',
                createdAt: '2026-03-01T10:00:00Z',
                updatedAt: '2026-03-01T10:00:00Z',
                featured: true
            })
        ]
    };

    const dom = await loadForumPage(async (targetUrl) => {
        assert.match(String(targetUrl), /^https:\/\/api\.svp\.test\/posts\/latest-discussions\?limit=20/);
        return makeJsonResponse(payload);
    });

    assert.deepEqual(readThreadTitles(dom.window.document), [
        'Tin nổi bật cũ',
        'Tin cũ có comment mới',
        'Tin cũ vừa sửa',
        'Tin mới tạo'
    ]);
});

test('forum ignores null activity fields and falls back to createdAt', async () => {
    const withNullActivity = makeThread({
        postId: 11,
        title: 'Chủ đề chỉ có ngày tạo mới',
        createdAt: '2026-04-07T10:00:00Z'
    });
    withNullActivity.lastActivityAt = null;
    withNullActivity.lastCommentAt = null;
    withNullActivity.updatedAt = null;

    const olderWithNullActivity = makeThread({
        postId: 12,
        title: 'Chủ đề chỉ có ngày tạo cũ',
        createdAt: '2026-04-01T10:00:00Z'
    });
    olderWithNullActivity.lastActivityAt = null;
    olderWithNullActivity.lastCommentAt = null;
    olderWithNullActivity.updatedAt = null;

    const editedThread = makeThread({
        postId: 13,
        title: 'Chủ đề có ngày sửa mới nhất',
        createdAt: '2026-03-20T10:00:00Z',
        updatedAt: '2026-04-08T10:00:00Z'
    });
    editedThread.lastActivityAt = null;
    editedThread.lastCommentAt = null;

    const payload = {
        items: [
            olderWithNullActivity,
            withNullActivity,
            editedThread
        ]
    };

    const dom = await loadForumPage(async () => makeJsonResponse(payload));

    assert.deepEqual(readThreadTitles(dom.window.document), [
        'Chủ đề có ngày sửa mới nhất',
        'Chủ đề chỉ có ngày tạo mới',
        'Chủ đề chỉ có ngày tạo cũ'
    ]);
});
