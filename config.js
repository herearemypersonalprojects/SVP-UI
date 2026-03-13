/**
 * SVP Frontend Configuration
 *
 * API base URL for all frontend pages.
 * - Default: Cloud Run production backend
 * - To use a local backend, add ?api=local to any page URL
 *   e.g.  http://localhost:3000/index.html?api=local
 */
(function () {
    var CLOUD_URL = 'https://svp-api-5nxhggmy2a-od.a.run.app';
    var LOCAL_URL = 'http://localhost:8080';

    var params = new URLSearchParams(window.location.search);
    var forceLocal = params.get('api') === 'local';

    window.SVP_API_BASE_URL = forceLocal ? LOCAL_URL : CLOUD_URL;
})();
