const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDomFromHtml,
    flushAsync,
    readFrontendFile
} = require('./dom-test-helpers.cjs');

function extractLastInlineScript(html) {
    const matches = [...String(html || '').matchAll(/<script>([\s\S]*?)<\/script>/g)];
    return matches.length ? matches[matches.length - 1][1] : '';
}

test('housing subscribe shows unreachable email error inline in red', async () => {
    const dom = createDomFromHtml('ban-do-thue-nha.html', {
        url: 'https://svpforum.fr/ban-do-thue-nha.html',
        fetch: async (targetUrl) => {
            const url = new URL(String(targetUrl));
            if (url.pathname.endsWith('/housing/subscribe')) {
                return {
                    ok: false,
                    status: 400,
                    json: async () => ({
                        error: 'Email không tồn tại hoặc domain email không nhận được thư. Vui lòng kiểm tra lại.'
                    })
                };
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });

    const { window } = dom;
    window.SVPHousing = {
        API_BASE_URL: 'https://api.svp.test'
    };
    window.eval(extractLastInlineScript(readFrontendFile('ban-do-thue-nha.html')));
    await flushAsync(window, 4);

    const emailInput = window.document.getElementById('housing-subscribe-email');
    const submitBtn = window.document.getElementById('housing-subscribe-submit');
    const errorEl = window.document.getElementById('housing-subscribe-email-error');
    const statusEl = window.document.getElementById('housing-subscribe-status');

    emailInput.value = 'reader@missing.example';
    submitBtn.click();
    await flushAsync(window, 8);

    assert.equal(emailInput.classList.contains('is-invalid'), true);
    assert.equal(errorEl.classList.contains('d-none'), false);
    assert.match(errorEl.textContent || '', /domain email không nhận được thư/i);
    assert.equal((statusEl.textContent || '').trim(), '');
});

test('housing subscribe uses logged-in user email without showing email input', async () => {
    let submittedPayload = null;
    const dom = createDomFromHtml('ban-do-thue-nha.html', {
        url: 'https://svpforum.fr/ban-do-thue-nha.html',
        fetch: async (targetUrl, options = {}) => {
            const url = new URL(String(targetUrl));
            if (url.pathname.endsWith('/housing/subscribe')) {
                submittedPayload = JSON.parse(String(options.body || '{}'));
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ status: 'SUBSCRIBED' })
                };
            }
            throw new Error(`Unexpected fetch: ${targetUrl}`);
        }
    });

    const { window } = dom;
    window.localStorage.setItem('refreshToken', 'refresh-token');
    window.localStorage.setItem('userEmail', 'member@example.com');
    window.SVPHousing = {
        API_BASE_URL: 'https://api.svp.test'
    };
    window.eval(extractLastInlineScript(readFrontendFile('ban-do-thue-nha.html')));
    await flushAsync(window, 4);

    const emailInput = window.document.getElementById('housing-subscribe-email');
    const emailField = emailInput.closest('.sv-housing-subscribe-card__field');
    const submitBtn = window.document.getElementById('housing-subscribe-submit');

    assert.equal(emailField.hidden, true);
    assert.equal(emailInput.value, 'member@example.com');
    assert.equal(submitBtn.textContent.trim(), 'Nhận tin mới');

    submitBtn.click();
    await flushAsync(window, 8);

    assert.deepEqual(submittedPayload, { email: 'member@example.com' });
});
