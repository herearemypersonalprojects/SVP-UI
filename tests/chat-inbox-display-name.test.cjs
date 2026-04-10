const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    makeJsonResponse,
    runScript
} = require('./dom-test-helpers.cjs');

async function loadChatPage() {
    const dom = createDomFromHtml('chat.html', {
        url: 'https://svpforum.fr/chat.html?conversationId=12',
        fetch: async (targetUrl, options = {}) => {
            const url = String(targetUrl);
            const method = String(options.method || 'GET').toUpperCase();
            if (url === 'https://api.svp.test/api/messages/conversation/12?limit=30' && method === 'GET') {
                return makeJsonResponse({
                    conversation: {
                        conversationId: 12,
                        otherUser: {
                            userId: 'c4eb4d07-9740-4cfb-a9aa-636a7578bb5f',
                            nickname: 'lan-anh',
                            displayName: 'Lan Anh',
                            avatarUrl: ''
                        }
                    },
                    items: [
                        {
                            messageId: 1,
                            content: 'Chao ban',
                            createdAt: '2026-04-10T08:00:00Z',
                            ownMessage: false
                        }
                    ],
                    nextCursor: null
                });
            }
            if (url === 'https://api.svp.test/api/messages/conversation/12/read' && method === 'PUT') {
                return makeJsonResponse({ markedCount: 0 });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });
    const { window } = dom;
    window.SVP_API_BASE_URL = 'https://api.svp.test';
    window.SVPAuth = {
        getValidAccessToken: async () => 'token'
    };
    window.SVPInbox = {
        refreshUnreadCount: async () => {}
    };

    runScript(dom, 'chat.js');
    await flushAsync(window, 10);
    return dom;
}

async function loadInboxPage() {
    const dom = createDomFromHtml('inbox.html', {
        url: 'https://svpforum.fr/inbox.html',
        fetch: async (targetUrl) => {
            const url = String(targetUrl);
            if (url === 'https://api.svp.test/api/messages/conversations') {
                return makeJsonResponse({
                    items: [
                        {
                            conversationId: 12,
                            unreadCount: 2,
                            updatedAt: '2026-04-10T09:00:00Z',
                            otherUser: {
                                userId: 'c4eb4d07-9740-4cfb-a9aa-636a7578bb5f',
                                nickname: 'lan-anh',
                                displayName: 'Lan Anh',
                                avatarUrl: ''
                            },
                            lastMessage: {
                                content: 'Hen gap truoc thu 7',
                                createdAt: '2026-04-10T09:00:00Z'
                            }
                        }
                    ]
                });
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });
    const { window } = dom;
    window.SVP_API_BASE_URL = 'https://api.svp.test';
    window.SVPAuth = {
        getValidAccessToken: async () => 'token'
    };

    runScript(dom, 'inbox.js');
    await flushAsync(window, 10);
    return dom;
}

test('chat header renders displayName without showing nickname', async () => {
    const dom = await loadChatPage();
    const header = dom.window.document.getElementById('chat-header');

    assert.match(header.textContent || '', /Lan Anh/);
    assert.equal((header.textContent || '').includes('@lan-anh'), false);
});

test('inbox conversation rows render displayName without showing nickname', async () => {
    const dom = await loadInboxPage();
    const list = dom.window.document.getElementById('inbox-conversation-list');

    assert.match(list.textContent || '', /Lan Anh/);
    assert.equal((list.textContent || '').includes('@lan-anh'), false);
});
