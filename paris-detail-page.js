(function () {
    const SITE_URL = 'https://www.svpforum.fr';

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildAbsoluteUrl(path) {
        return new URL(String(path || ''), `${SITE_URL}/`).href;
    }

    function setMeta(attribute, key, content) {
        const value = String(content || '').trim();
        if (!value) return;

        let meta = document.head.querySelector(`meta[${attribute}="${key}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attribute, key);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', value);
    }

    function setLink(rel, href) {
        let link = document.head.querySelector(`link[rel="${rel}"]`);
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', rel);
            document.head.appendChild(link);
        }
        link.setAttribute('href', href);
    }

    function setStructuredData(payload) {
        const scriptId = 'svp-paris-place-ldjson';
        let script = document.getElementById(scriptId);
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(payload);
    }

    function buildMapsUrl(place) {
        const query = `${place.lat},${place.lon}`;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }

    function renderHighlight(item) {
        return `
            <article class="sv-paris-place-highlight">
                <i class="fa-solid ${escapeHtml(item.icon || 'fa-star')}"></i>
                <h3>${escapeHtml(item.title || '')}</h3>
                <p>${escapeHtml(item.text || '')}</p>
            </article>
        `;
    }

    function renderSource(item) {
        return `
            <a class="sv-paris-place-source" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noreferrer noopener">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                ${escapeHtml(item.label || 'Nguồn tham khảo')}
            </a>
        `;
    }

    function renderRelatedCard(place) {
        return `
            <a class="sv-paris-place-related" href="${escapeHtml(place.routeHref)}">
                <img src="${escapeHtml(place.imageSrc)}" alt="${escapeHtml(place.shortName)}" loading="lazy" decoding="async" />
                <div class="sv-paris-place-related__meta">${escapeHtml((place.editorial && place.editorial.eyebrow) || place.category_vn || 'Paris')}</div>
                <div>
                    <h3>${escapeHtml(place.shortName)}</h3>
                    <p>${escapeHtml((place.editorial && place.editorial.teaser) || place.story_vn || '')}</p>
                </div>
            </a>
        `;
    }

    function renderPlace(rootElement, place, relatedPlaces) {
        rootElement.innerHTML = `
            <nav class="sv-paris-place-breadcrumbs" aria-label="breadcrumb">
                <a href="ban-do-paris.html">Khám phá Paris</a>
                <span>/</span>
                <span>${escapeHtml(place.shortName)}</span>
            </nav>

            <section class="sv-paris-place-hero">
                <div class="sv-paris-place-hero__grid">
                    <div>
                        <p class="sv-paris-place-eyebrow">${escapeHtml(place.heroEyebrow || 'Khám phá Paris')}</p>
                        <h1 class="sv-paris-place-title">${escapeHtml(place.shortName)}</h1>
                        <p class="sv-paris-place-summary">${escapeHtml(place.intro)}</p>

                        <div class="sv-paris-place-chips">
                            ${(Array.isArray(place.moods) ? place.moods : []).map((item) => `<span class="sv-paris-place-chip"><i class="fa-solid fa-sparkles"></i>${escapeHtml(item)}</span>`).join('')}
                        </div>

                        <div class="sv-paris-place-facts">
                            <span class="sv-paris-place-fact"><i class="fa-solid fa-location-dot"></i>${escapeHtml(place.areaLabel || place.address_vn || 'Paris')}</span>
                            <span class="sv-paris-place-fact"><i class="fa-solid fa-star"></i>${escapeHtml(place.ratingLabel || '')}</span>
                            <span class="sv-paris-place-fact"><i class="fa-solid fa-landmark"></i>${escapeHtml(place.category_vn || 'Di tích Paris')}</span>
                        </div>

                        <div class="sv-paris-place-actions">
                            <a class="btn btn-dark" href="ban-do-paris.html">Quay lại bản đồ</a>
                            <a class="btn btn-outline-dark" href="${escapeHtml(buildMapsUrl(place))}" target="_blank" rel="noreferrer noopener">Mở Google Maps</a>
                        </div>
                    </div>

                    <div class="sv-paris-place-hero__visual">
                        <img class="sv-paris-place-image" src="${escapeHtml(place.imageSrc)}" alt="${escapeHtml(place.shortName)}" loading="eager" decoding="async" />
                        <div class="sv-paris-place-quote">${escapeHtml((place.editorial && place.editorial.teaser) || place.metaDescription)}</div>
                    </div>
                </div>
            </section>

            <div class="sv-paris-place-grid">
                <section class="sv-paris-place-section">
                    <p class="sv-paris-place-eyebrow">Điểm hấp dẫn</p>
                    <h2>Vì sao nơi này khiến người ta muốn đi thật</h2>
                    <div class="sv-paris-place-copy">
                        <p>${escapeHtml(place.overview)}</p>
                        <p>${escapeHtml(place.whyGo)}</p>
                    </div>
                    <div class="sv-paris-place-highlights">
                        ${(Array.isArray(place.highlights) ? place.highlights : []).map(renderHighlight).join('')}
                    </div>
                </section>

                <section class="sv-paris-place-section">
                    <p class="sv-paris-place-eyebrow">Đi thực tế</p>
                    <h2>Nếu bạn muốn chuyến đi trọn và đẹp ảnh</h2>
                    <div class="sv-paris-place-practical">
                        <article class="sv-paris-place-practical__item">
                            <strong>Khoảnh khắc nên đi</strong>
                            <p>${escapeHtml(place.bestMoment)}</p>
                        </article>
                        <article class="sv-paris-place-practical__item">
                            <strong>Cách ghép vào lịch trình</strong>
                            <p>${escapeHtml(place.routePlan)}</p>
                        </article>
                        <article class="sv-paris-place-practical__item">
                            <strong>Nối thêm quanh khu này</strong>
                            <p>${escapeHtml(place.nearby)}</p>
                        </article>
                    </div>
                </section>

                <section class="sv-paris-place-section">
                    <p class="sv-paris-place-eyebrow">Nguồn chính thức</p>
                    <h2>Tham khảo thêm trước khi đi</h2>
                    <p>Nếu cần giờ mở cửa, thông báo tham quan hoặc thông tin cập nhật theo mùa, nên kiểm tra trực tiếp các trang chính thức dưới đây trước khi lên đường.</p>
                    <div class="sv-paris-place-sources">
                        ${(Array.isArray(place.sourceLinks) ? place.sourceLinks : []).map(renderSource).join('')}
                    </div>
                </section>

                <section class="sv-paris-place-section">
                    <p class="sv-paris-place-eyebrow">Khám phá tiếp</p>
                    <h2>Những điểm khác trong hành trình Paris</h2>
                    <div class="sv-paris-place-related-grid">
                        ${(Array.isArray(relatedPlaces) ? relatedPlaces : []).map(renderRelatedCard).join('')}
                    </div>
                </section>
            </div>
        `;
    }

    function renderError(rootElement) {
        rootElement.innerHTML = `
            <section class="sv-paris-place-empty">
                <h1>Không tìm thấy địa điểm Paris này</h1>
                <p>Liên kết có thể đã sai slug hoặc trang đang thiếu dữ liệu. Bạn có thể quay lại bản đồ để chọn lại một điểm khác.</p>
                <p><a class="btn btn-dark" href="ban-do-paris.html">Quay lại bản đồ Paris</a></p>
            </section>
        `;
    }

    function updateSeo(place) {
        const title = `${place.shortName} | Khám phá Paris | SVP`;
        const description = place.metaDescription || place.story_vn || '';
        const canonicalUrl = buildAbsoluteUrl(place.routeHref);
        const imageUrl = buildAbsoluteUrl(place.imageSrc);

        document.title = title;
        setMeta('name', 'description', description);
        setMeta('name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
        setMeta('property', 'og:locale', 'vi_VN');
        setMeta('property', 'og:site_name', 'SVP Forum');
        setMeta('property', 'og:type', 'article');
        setMeta('property', 'og:title', title);
        setMeta('property', 'og:description', description);
        setMeta('property', 'og:url', canonicalUrl);
        setMeta('property', 'og:image', imageUrl);
        setMeta('property', 'og:image:alt', place.shortName);
        setMeta('name', 'twitter:card', 'summary_large_image');
        setMeta('name', 'twitter:title', title);
        setMeta('name', 'twitter:description', description);
        setMeta('name', 'twitter:image', imageUrl);
        setLink('canonical', canonicalUrl);

        setStructuredData({
            '@context': 'https://schema.org',
            '@type': 'TouristAttraction',
            name: place.shortName,
            description,
            url: canonicalUrl,
            image: imageUrl,
            touristType: 'Khách du lịch tự túc tại Paris',
            address: {
                '@type': 'PostalAddress',
                addressLocality: 'Paris',
                streetAddress: place.address_vn
            },
            geo: {
                '@type': 'GeoCoordinates',
                latitude: place.lat,
                longitude: place.lon
            },
            sameAs: (Array.isArray(place.sourceLinks) ? place.sourceLinks : []).map((item) => item.url).filter(Boolean)
        });
    }

    function init() {
        const rootElement = document.getElementById('parisPlaceDetail');
        if (!rootElement) return;

        const slug = String(document.body.getAttribute('data-paris-slug') || '').trim();
        const parisMapApi = window.SVPParisMap;
        if (!slug || !parisMapApi || typeof parisMapApi.getParisPlaceDetailBySlug !== 'function') {
            renderError(rootElement);
            return;
        }

        const place = parisMapApi.getParisPlaceDetailBySlug(slug, { window });
        if (!place) {
            renderError(rootElement);
            return;
        }

        updateSeo(place);
        renderPlace(rootElement, place, parisMapApi.getRelatedParisPlaces(place.reference, 3, { window }));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
