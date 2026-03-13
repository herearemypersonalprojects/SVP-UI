/**
 * SVP Frontend Configuration
 *
 * API base URL for all frontend pages.
 * - Default on localhost / 127.0.0.1: local backend
 * - Default elsewhere: Cloud Run production backend
 * - Explicit overrides:
 *   ?api=local  -> force local backend
 *   ?api=cloud  -> force Cloud Run backend
 */
(function () {
    var CLOUD_URL = 'https://svp-api-5nxhggmy2a-od.a.run.app';
    var LOCAL_URL = 'http://localhost:8080';

    var params = new URLSearchParams(window.location.search);
    var apiMode = (params.get('api') || '').trim().toLowerCase();
    var hostname = (window.location.hostname || '').trim().toLowerCase();
    var isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    var forceLocal = apiMode === 'local';
    var forceCloud = apiMode === 'cloud';

    window.SVP_API_BASE_URL = forceCloud
        ? CLOUD_URL
        : ((forceLocal || isLocalHost) ? LOCAL_URL : CLOUD_URL);
})();
