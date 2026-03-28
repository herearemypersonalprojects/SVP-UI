(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
        return;
    }
    root.SVPParisMap = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const FEATURED_REFERENCE_ORDER = Object.freeze([
        'PA00088801',
        'PA00088804',
        'PA00086250',
        'PA00088420',
        'PA75180004',
        'PA00085992',
        'PA00088714',
        'PA00089004',
        'PA00088689',
        'PA00086001'
    ]);

    const FEATURED_EDITORIAL = Object.freeze({
        PA00088801: Object.freeze({
            eyebrow: 'Biểu tượng hoàng hôn',
            teaser: 'Điểm ngắm Paris rực sáng nhất khi bầu trời chuyển vàng cam.',
            accent: '#ff7a59',
            icon: 'fa-tower-observation'
        }),
        PA00088804: Object.freeze({
            eyebrow: 'Trục đại lộ kinh điển',
            teaser: 'Một vòng sao đô thị nơi Paris phô diễn sự hùng vĩ rõ nhất.',
            accent: '#ffb703',
            icon: 'fa-monument'
        }),
        PA00086250: Object.freeze({
            eyebrow: 'Gothic giữa sông Seine',
            teaser: 'Trái tim lịch sử của Paris, đẹp nhất khi đi bộ dọc Ile de la Cite.',
            accent: '#f97316',
            icon: 'fa-church'
        }),
        PA00088420: Object.freeze({
            eyebrow: 'Mái vòm tri thức',
            teaser: 'Một điểm dừng vừa uy nghi vừa có tầm nhìn cổ điển của Khu Latin.',
            accent: '#14b8a6',
            icon: 'fa-landmark-dome'
        }),
        PA75180004: Object.freeze({
            eyebrow: 'Montmartre trên cao',
            teaser: 'Toàn cảnh Paris bừng lên từ triền đồi trắng và những bậc thang dài.',
            accent: '#ef476f',
            icon: 'fa-camera-retro'
        }),
        PA00085992: Object.freeze({
            eyebrow: 'Paris của nghệ thuật',
            teaser: 'Louvre và Tuileries tạo nên một dải tham quan vừa sang vừa thoáng.',
            accent: '#2563eb',
            icon: 'fa-gem'
        }),
        PA00088714: Object.freeze({
            eyebrow: 'Mái vòm vàng',
            teaser: 'Một trong những silhouette đẹp nhất Paris, nổi bật nhất lúc nắng nhẹ.',
            accent: '#d97706',
            icon: 'fa-medal'
        }),
        PA00089004: Object.freeze({
            eyebrow: 'Kịch tính Belle Epoque',
            teaser: 'Mặt tiền lộng lẫy và khu phố sáng đèn khiến khu Opera luôn có năng lượng.',
            accent: '#d946ef',
            icon: 'fa-masks-theater'
        }),
        PA00088689: Object.freeze({
            eyebrow: 'Bảo tàng bên sông',
            teaser: 'Một khối kiến trúc vừa mềm vừa sang, đi cùng bờ Seine rất hút mắt.',
            accent: '#0ea5e9',
            icon: 'fa-train-subway'
        }),
        PA00086001: Object.freeze({
            eyebrow: 'Kính màu huyền ảo',
            teaser: 'Không gian Gothic nén lại trong một điểm dừng cực giàu chi tiết.',
            accent: '#8b5cf6',
            icon: 'fa-place-of-worship'
        })
    });

    const FEATURED_BOOTSTRAP_ITEMS = Object.freeze([
        Object.freeze({
            reference: 'PA00088801',
            name_vn: 'Tháp Eiffel',
            address_vn: 'Champ-de-Mars, Quận 7 Paris',
            commune_forme_index: 'Paris 7e Arrondissement',
            lat: 48.8582640632748,
            lon: 2.29450471981574,
            score: 0.925,
            category_vn: 'tượng đài',
            domaine_vn: 'kiến trúc văn hóa, nghiên cứu, thể thao hoặc giải trí',
            story_vn: 'Tháp Eiffel là biểu tượng rực sáng nhất của Paris, nổi bật với khung thép thanh mảnh và tầm nhìn 360 độ trên toàn thành phố.'
        }),
        Object.freeze({
            reference: 'PA00088804',
            name_vn: "Khải Hoàn Môn de l'Etoile",
            address_vn: 'quảng trường Charles-de-Gaulle, Quận 8, Paris',
            commune_forme_index: 'Paris 8e Arrondissement',
            lat: 48.873780394850904,
            lon: 2.29504124772799,
            score: 0.9025,
            category_vn: 'khải hoàn môn',
            domaine_vn: 'kiến trúc tang lễ, tưởng niệm hoặc dâng hiến',
            story_vn: 'Khải Hoàn Môn neo trục Champs-Elysees bằng một hình khối đầy uy lực, rất hợp cho những khung hình đại lộ Paris.'
        }),
        Object.freeze({
            reference: 'PA00086250',
            name_vn: 'Nhà thờ Đức Bà',
            address_vn: 'Quận 4 Paris',
            commune_forme_index: 'Paris 4e Arrondissement',
            lat: 48.85293687448671,
            lon: 2.3500514067889,
            score: 0.875,
            category_vn: 'nhà thờ lớn',
            domaine_vn: 'kiến trúc tôn giáo',
            story_vn: 'Nhà thờ Đức Bà là điểm neo lịch sử của Ile de la Cite, nổi bật với lớp Gothic nhiều chiều sâu và câu chuyện của cả thành phố.'
        }),
        Object.freeze({
            reference: 'PA00088420',
            name_vn: 'Nhà thờ Sainte-Geneviève cũ, trở thành Le Panthéon',
            address_vn: 'quảng trường Panthéon, Quận 5 Paris',
            commune_forme_index: 'Paris 5e Arrondissement',
            lat: 48.8462196694408,
            lon: 2.3460392355371,
            score: 0.875,
            category_vn: 'nhà thờ',
            domaine_vn: 'kiến trúc tôn giáo',
            story_vn: 'Panthéon mang cảm giác Paris cổ điển, cân xứng và tĩnh tại, nằm giữa khu Latin đầy tri thức.'
        }),
        Object.freeze({
            reference: 'PA75180004',
            name_vn: 'Vương cung thánh đường Sacré-Coeur, các công trình phụ và quảng trường Louise-Michel',
            address_vn: '35 rue du Chevalier de la Barre, Quận 18, Paris',
            commune_forme_index: 'Paris 18e Arrondissement',
            lat: 48.88541912477373,
            lon: 2.3435657636270992,
            score: 0.875,
            category_vn: 'vương cung thánh đường;quảng trường',
            domaine_vn: 'kiến trúc tôn giáo; kiến trúc vườn',
            story_vn: 'Sacré-Coeur đứng trên đỉnh Montmartre như một sân thượng trắng nhìn trọn thành phố, rất sáng và rất Paris.'
        }),
        Object.freeze({
            reference: 'PA00085992',
            name_vn: 'Cung điện Louvre và vườn Tuileries',
            address_vn: 'quai du Louvre ; avenue du Général-Lemonier ; rue de Rivoli, Quận 1 Paris',
            commune_forme_index: 'Paris 1er Arrondissement',
            lat: 48.8627008026149,
            lon: 2.32992797460275,
            score: 0.875,
            category_vn: 'cung điện; lâu đài',
            domaine_vn: 'kiến trúc nhà ở',
            story_vn: 'Louvre và Tuileries kết nối nghệ thuật, sân trong và mảng xanh thành một trục tham quan cực giàu nhịp điệu thị giác.'
        }),
        Object.freeze({
            reference: 'PA00088714',
            name_vn: 'Khách sạn des Invalides',
            address_vn: 'Quận 7 Paris',
            commune_forme_index: 'Paris 7e Arrondissement',
            lat: 48.8562400513428,
            lon: 2.31236490065949,
            score: 0.8725,
            category_vn: 'bệnh viện;khách sạn;công trình quân sự',
            domaine_vn: 'kiến trúc tôn giáo; kiến trúc bệnh viện, hỗ trợ hoặc bảo trợ xã hội; kiến trúc quân sự',
            story_vn: 'Invalides gây ấn tượng bởi mái vòm vàng, các khối sân rộng và cảm giác trật tự rất đặc trưng của Paris cổ điển.'
        }),
        Object.freeze({
            reference: 'PA00089004',
            name_vn: 'Nhà hát quốc gia Opéra, gọi là Opéra Garnier',
            address_vn: 'Quận 9 Paris',
            commune_forme_index: 'Paris 9e Arrondissement',
            lat: 48.8720310148122,
            lon: 2.33179066386024,
            score: 0.8575,
            category_vn: 'nhà hát opera',
            domaine_vn: 'kiến trúc văn hóa, nghiên cứu, thể thao hoặc giải trí',
            story_vn: 'Opéra Garnier là lớp Paris sân khấu, lộng lẫy và sáng đèn, rất hợp để mở một hành trình khám phá thành phố.'
        }),
        Object.freeze({
            reference: 'PA00088689',
            name_vn: 'Ga Orsay cũ, hiện nay là bảo tàng Orsay',
            address_vn: '7, 9 quai Anatole-France; rue de Lille, Quận 7 Paris',
            commune_forme_index: 'Paris 7e Arrondissement',
            lat: 48.859918789814,
            lon: 2.32657970144273,
            score: 0.8575,
            category_vn: 'nhà ga; bảo tàng',
            domaine_vn: null,
            story_vn: 'Orsay biến kiến trúc nhà ga thành một bảo tàng mềm mại nhìn ra sông Seine, vừa nghệ thuật vừa gần gũi.'
        }),
        Object.freeze({
            reference: 'PA00086001',
            name_vn: 'Sainte-Chapelle',
            address_vn: 'đại lộ du Palais, Quận 1 Paris',
            commune_forme_index: 'Paris 1er Arrondissement',
            lat: 48.8553930118762,
            lon: 2.34499381915239,
            score: 0.8525,
            category_vn: 'nhà nguyện',
            domaine_vn: 'kiến trúc tôn giáo',
            story_vn: 'Sainte-Chapelle là một viên ngọc Gothic cô đọng, nổi bật bởi chiều cao nội thất và lớp kính màu đầy kịch tính.'
        })
    ]);

    const DEFAULT_CENTER = Object.freeze([48.8566, 2.3522]);
    const DEFAULT_LIMIT = 10;

    function normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .toLowerCase();
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function getScoreValue(scoreRaw) {
        const value = Number(scoreRaw);
        return Number.isFinite(value) ? clamp(value, 0, 1) : 0;
    }

    function getStarCount(scoreRaw) {
        const stars = Math.round(getScoreValue(scoreRaw) * 5);
        return clamp(stars || 1, 1, 5);
    }

    function formatRating(scoreRaw) {
        return `${(getScoreValue(scoreRaw) * 5).toFixed(1)}/5`;
    }

    function truncateText(value, maxLength) {
        const source = String(value || '').trim();
        if (!source || source.length <= maxLength) return source;
        const shortened = source.slice(0, Math.max(0, maxLength - 1)).replace(/\s+\S*$/, '').trim();
        return `${shortened || source.slice(0, maxLength - 1)}…`;
    }

    function toImagePath(reference) {
        return reference ? `assets/paris/images/${String(reference).toLowerCase()}.jpg` : '';
    }

    function buildFallbackImage(label, accent) {
        const svg = [
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 560'>",
            "<defs>",
            `<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${String(accent || '#ff7a59')}'/><stop offset='100%' stop-color='#fff3df'/></linearGradient>`,
            '</defs>',
            "<rect width='800' height='560' fill='url(#g)'/>",
            "<circle cx='628' cy='116' r='84' fill='rgba(255,255,255,0.24)'/>",
            "<circle cx='134' cy='434' r='110' fill='rgba(255,255,255,0.2)'/>",
            "<path d='M148 410c76-112 146-170 212-170s136 58 212 170' fill='none' stroke='rgba(17,24,39,0.12)' stroke-width='16' stroke-linecap='round'/>",
            "<path d='M397 132l16 176h34l-24 34 10 108h-72l10-108-24-34h34l16-176Z' fill='rgba(17,24,39,0.2)'/>",
            "<text x='74' y='100' fill='#ffffff' font-size='26' font-family='Arial,sans-serif' font-weight='700'>Paris Spotlight</text>",
            `<text x='74' y='444' fill='#172033' font-size='54' font-family='Arial,sans-serif' font-weight='700'>${escapeHtml(String(label || 'Paris')).slice(0, 28)}</text>`,
            "<text x='74' y='490' fill='#243248' font-size='26' font-family='Arial,sans-serif'>Guide visuel SVP</text>",
            '</svg>'
        ].join('');

        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }

    function isParisItem(item) {
        return normalizeText(item && item.commune_forme_index).includes('paris') ||
            normalizeText(item && item.address_vn).includes('paris');
    }

    function resolveAreaLabel(item) {
        const commune = String(item.commune_forme_index || '').trim();
        if (commune) return commune.split(';')[0].trim();
        const address = String(item.address_vn || '').trim();
        if (!address) return 'Paris';
        const districtMatch = address.match(/Qu[aạ]n\s+\d+\s*Paris/i);
        return districtMatch ? districtMatch[0] : address;
    }

    function resolveTheme(categoryRaw, editorial) {
        if (editorial) {
            return {
                color: editorial.accent,
                icon: editorial.icon,
                label: editorial.eyebrow
            };
        }

        const category = normalizeText(categoryRaw);
        if (category.includes('nha tho') || category.includes('vuong cung') || category.includes('nha nguyen')) {
            return { color: '#f59e0b', icon: 'fa-church', label: 'Tôn giáo' };
        }
        if (category.includes('opera') || category.includes('nha hat')) {
            return { color: '#d946ef', icon: 'fa-masks-theater', label: 'Nghệ thuật' };
        }
        if (category.includes('cung dien') || category.includes('bao tang') || category.includes('lau dai')) {
            return { color: '#2563eb', icon: 'fa-landmark-dome', label: 'Di sản' };
        }
        if (category.includes('khai hoan mon') || category.includes('tuong dai')) {
            return { color: '#f97316', icon: 'fa-monument', label: 'Biểu tượng' };
        }
        if (category.includes('nha ga')) {
            return { color: '#06b6d4', icon: 'fa-train-subway', label: 'Bờ sông' };
        }
        if (category.includes('cau')) {
            return { color: '#0ea5e9', icon: 'fa-bridge', label: 'Cầu' };
        }
        return { color: '#4f46e5', icon: 'fa-location-dot', label: 'Paris' };
    }

    function prepareMonuments(rawItems, options = {}) {
        const featuredOrder = Array.isArray(options.featuredOrder) ? options.featuredOrder : FEATURED_REFERENCE_ORDER;
        const featuredRankByRef = new Map(featuredOrder.map((reference, index) => [reference, index + 1]));
        const editorials = options.editorials || FEATURED_EDITORIAL;

        return (Array.isArray(rawItems) ? rawItems : [])
            .map((item) => ({
                ...item,
                __lat: Number(item && item.lat),
                __lon: Number(item && item.lon)
            }))
            .filter((item) => Number.isFinite(item.__lat) && Number.isFinite(item.__lon))
            .filter((item) => (options.includeAll ? true : isParisItem(item)))
            .map((item) => {
                const reference = String(item.reference || '').trim();
                const editorial = editorials[reference] || null;
                const theme = resolveTheme(item.category_vn, editorial);
                const teaserSource = editorial && editorial.teaser
                    ? editorial.teaser
                    : item.story_vn || item.description_vn || '';

                return {
                    ...item,
                    reference,
                    __featuredRank: featuredRankByRef.get(reference) || 0,
                    __editorial: editorial,
                    __score: getScoreValue(item.score),
                    __stars: getStarCount(item.score),
                    __areaLabel: resolveAreaLabel(item),
                    __imageSrc: item.imageUrl || toImagePath(reference),
                    __fallbackImage: buildFallbackImage(item.name_vn || 'Paris', theme.color),
                    __teaser: truncateText(teaserSource, 145),
                    __theme: theme
                };
            })
            .sort((left, right) => {
                if (left.__featuredRank && right.__featuredRank) return left.__featuredRank - right.__featuredRank;
                if (left.__featuredRank) return -1;
                if (right.__featuredRank) return 1;
                if (right.__score !== left.__score) return right.__score - left.__score;
                return String(left.name_vn || '').localeCompare(String(right.name_vn || ''), 'vi');
            });
    }

    function getFeaturedItems(items, limit = DEFAULT_LIMIT) {
        return (Array.isArray(items) ? items : [])
            .filter((item) => item.__featuredRank > 0)
            .sort((left, right) => left.__featuredRank - right.__featuredRank)
            .slice(0, limit);
    }

    function resolveBoundsBox(bounds) {
        if (!bounds) return null;

        if (typeof bounds.getSouthWest === 'function' && typeof bounds.getNorthEast === 'function') {
            const southWest = bounds.getSouthWest();
            const northEast = bounds.getNorthEast();
            const center = typeof bounds.getCenter === 'function'
                ? bounds.getCenter()
                : {
                    lat: (Number(southWest.lat) + Number(northEast.lat)) / 2,
                    lng: (Number(southWest.lng) + Number(northEast.lng)) / 2
                };

            return {
                south: Number(southWest.lat),
                west: Number(southWest.lng),
                north: Number(northEast.lat),
                east: Number(northEast.lng),
                center: { lat: Number(center.lat), lng: Number(center.lng) }
            };
        }

        if (
            Number.isFinite(Number(bounds.south)) &&
            Number.isFinite(Number(bounds.west)) &&
            Number.isFinite(Number(bounds.north)) &&
            Number.isFinite(Number(bounds.east))
        ) {
            const center = bounds.center || {
                lat: (Number(bounds.south) + Number(bounds.north)) / 2,
                lng: (Number(bounds.west) + Number(bounds.east)) / 2
            };

            return {
                south: Number(bounds.south),
                west: Number(bounds.west),
                north: Number(bounds.north),
                east: Number(bounds.east),
                center: { lat: Number(center.lat), lng: Number(center.lng) }
            };
        }

        return null;
    }

    function getDistanceScore(item, center) {
        const latDiff = Number(item.__lat) - Number(center.lat);
        const lonDiff = Number(item.__lon) - Number(center.lng);
        return (latDiff * latDiff) + (lonDiff * lonDiff);
    }

    function pickViewportItems(items, bounds, limit = DEFAULT_LIMIT) {
        const boundsBox = resolveBoundsBox(bounds);
        if (!boundsBox) return { visibleCount: 0, items: [] };

        const visibleItems = (Array.isArray(items) ? items : []).filter((item) =>
            item.__lat >= boundsBox.south &&
            item.__lat <= boundsBox.north &&
            item.__lon >= boundsBox.west &&
            item.__lon <= boundsBox.east
        );

        visibleItems.sort((left, right) => {
            if (right.__score !== left.__score) return right.__score - left.__score;
            if (Boolean(right.__featuredRank) !== Boolean(left.__featuredRank)) {
                return Number(Boolean(right.__featuredRank)) - Number(Boolean(left.__featuredRank));
            }
            return getDistanceScore(left, boundsBox.center) - getDistanceScore(right, boundsBox.center);
        });

        return {
            visibleCount: visibleItems.length,
            items: visibleItems.slice(0, limit)
        };
    }

    function buildDistrictSummary(items) {
        const counts = new Map();
        (Array.isArray(items) ? items : []).forEach((item) => {
            const label = item.__areaLabel || 'Paris';
            counts.set(label, (counts.get(label) || 0) + 1);
        });

        return Array.from(counts.entries())
            .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'vi'))
            .slice(0, 5)
            .map(([label, count]) => ({ label, count }));
    }

    function findItemByReference(items, reference) {
        return (Array.isArray(items) ? items : []).find((item) => item.reference === reference) || null;
    }

    function buildMarkerHtml(item, index, active, mode) {
        const rank = mode === 'featured' && item.__featuredRank ? item.__featuredRank : index + 1;
        return `
            <div class="sv-paris-marker${active ? ' sv-paris-marker--active' : ''}" style="--marker-accent:${escapeHtml(item.__theme.color)};">
                <span class="sv-paris-marker__rank">${String(rank).padStart(2, '0')}</span>
                <span class="sv-paris-marker__icon"><i class="fa-solid ${escapeHtml(item.__theme.icon)}"></i></span>
            </div>
        `;
    }

    function buildPopupHtml(item) {
        return `
            <div class="sv-paris-popup">
                <div class="sv-paris-popup__eyebrow">${escapeHtml(item.__editorial ? item.__editorial.eyebrow : item.__theme.label)}</div>
                <div class="sv-paris-popup__title">${escapeHtml(item.name_vn || 'Điểm Paris')}</div>
                <div class="sv-paris-popup__meta">${escapeHtml(item.__areaLabel || item.address_vn || 'Paris')}</div>
                <div class="sv-paris-popup__desc">${escapeHtml(item.__teaser || 'Chưa có mô tả')}</div>
            </div>
        `;
    }

    function buildPoiCardHtml(item, index, active, mode) {
        const rank = mode === 'featured' && item.__featuredRank ? item.__featuredRank : index + 1;
        return `
            <button type="button" class="sv-paris-poi${active ? ' sv-paris-poi--active' : ''}" data-reference="${escapeHtml(item.reference)}" style="--poi-accent:${escapeHtml(item.__theme.color)};" aria-pressed="${active ? 'true' : 'false'}">
                <span class="sv-paris-poi__media">
                    <img class="sv-paris-poi__image" src="${escapeHtml(item.__imageSrc || item.__fallbackImage)}" alt="${escapeHtml(item.name_vn || 'Ảnh Paris')}" loading="lazy" decoding="async" data-fallback-src="${escapeHtml(item.__fallbackImage)}" />
                    <span class="sv-paris-poi__rank">${String(rank).padStart(2, '0')}</span>
                </span>
                <span class="sv-paris-poi__body">
                    <span class="sv-paris-poi__eyebrow">${escapeHtml(item.__editorial ? item.__editorial.eyebrow : item.__theme.label)}</span>
                    <span class="sv-paris-poi__title">${escapeHtml(item.name_vn || 'Điểm Paris')}</span>
                    <span class="sv-paris-poi__meta"><i class="fa-solid fa-location-dot"></i>${escapeHtml(item.__areaLabel || item.address_vn || 'Paris')}</span>
                    <span class="sv-paris-poi__desc">${escapeHtml(item.__teaser || 'Chưa có mô tả')}</span>
                    <span class="sv-paris-poi__footer">
                        <span class="sv-paris-chip"><i class="fa-solid ${escapeHtml(item.__theme.icon)}"></i>${escapeHtml(item.__theme.label)}</span>
                        <span class="sv-paris-rating"><i class="fa-solid fa-star"></i>${escapeHtml(formatRating(item.score))}</span>
                    </span>
                </span>
            </button>
        `;
    }

    function createParisMapApp(options = {}) {
        const documentRef = options.document || (typeof document !== 'undefined' ? document : null);
        const windowRef = options.window || (typeof window !== 'undefined' ? window : null);
        const leaflet = options.L || (windowRef ? windowRef.L : null);
        const fetchFn = options.fetch || (windowRef && windowRef.fetch ? windowRef.fetch.bind(windowRef) : null);

        if (!documentRef || !windowRef || !leaflet || !fetchFn) {
            throw new Error('Paris map app requires window, document, Leaflet, and fetch.');
        }

        const mapElement = documentRef.getElementById(options.mapElementId || 'parisMap');
        const poiListElement = documentRef.getElementById(options.poiListElementId || 'parisPoiList');
        const modeEyebrowElement = documentRef.getElementById(options.modeEyebrowElementId || 'parisModeEyebrow');
        const modeTitleElement = documentRef.getElementById(options.modeTitleElementId || 'parisModeTitle');
        const modeSubtitleElement = documentRef.getElementById(options.modeSubtitleElementId || 'parisModeSubtitle');
        const summaryElement = documentRef.getElementById(options.summaryElementId || 'parisViewportSummary');
        const districtElement = documentRef.getElementById(options.districtElementId || 'parisDistrictChips');
        const mapMetaElement = documentRef.getElementById(options.mapMetaElementId || 'parisMapMeta');
        const resetButtons = Array.from(documentRef.querySelectorAll('[data-reset-featured]'));

        if (!mapElement || !poiListElement || !mapMetaElement) {
            throw new Error('Paris map app cannot find required DOM elements.');
        }

        const state = {
            map: null,
            markersByReference: new Map(),
            allItems: prepareMonuments(options.bootstrapItems || FEATURED_BOOTSTRAP_ITEMS),
            viewItems: [],
            activeReference: '',
            mode: 'featured',
            visibleCount: 0,
            datasetPhase: 'bootstrap',
            pendingProgrammaticMoves: 0
        };

        function getDatasetNote() {
            if (state.datasetPhase === 'bootstrap') return 'Đang nạp toàn bộ dữ liệu Paris trong nền.';
            if (state.datasetPhase === 'error') return 'Không tải được dữ liệu mở rộng, hiện chỉ giữ Top 10 mở màn.';
            return `Nguồn nền đã sẵn sàng với ${state.allItems.length} POI Paris.`;
        }

        function renderDistrictChips() {
            if (!districtElement) return;
            const districts = buildDistrictSummary(state.viewItems);
            districtElement.innerHTML = districts.length
                ? districts.map((item) => `<span class="sv-paris-district"><strong>${item.count}</strong>${escapeHtml(item.label)}</span>`).join('')
                : '<span class="sv-paris-district__empty">Kéo map để lấy danh sách mới theo khu vực.</span>';
        }

        function renderSummary() {
            if (state.mode === 'featured') {
                if (modeEyebrowElement) modeEyebrowElement.textContent = 'Mở màn tự động';
                if (modeTitleElement) modeTitleElement.textContent = '10 điểm đẹp nhất Paris';
                if (modeSubtitleElement) modeSubtitleElement.textContent = 'Bản đồ bên phải đang zoom đúng 10 biểu tượng mở màn. Nhấn marker để nhảy tới thẻ bên trái, hoặc nhấn thẻ để camera chạy tới điểm đó.';
                if (summaryElement) summaryElement.innerHTML = `<strong>${state.viewItems.length}</strong> điểm đang được spotlight. ${escapeHtml(getDatasetNote())}`;
                mapMetaElement.textContent = 'Spotlight hiện tại: Top 10 biểu tượng';
                return;
            }

            if (!state.viewItems.length) {
                if (modeEyebrowElement) modeEyebrowElement.textContent = 'Theo khung nhìn';
                if (modeTitleElement) modeTitleElement.textContent = 'Khung nhìn này chưa có POI nổi bật';
                if (modeSubtitleElement) modeSubtitleElement.textContent = 'Kéo lại về trung tâm Paris hoặc bấm Top 10 để trở lại bộ mở màn.';
                if (summaryElement) summaryElement.innerHTML = escapeHtml(getDatasetNote());
                mapMetaElement.textContent = 'Không có POI trong viewport';
                return;
            }

            if (modeEyebrowElement) modeEyebrowElement.textContent = 'Theo khung nhìn';
            if (modeTitleElement) modeTitleElement.textContent = `${state.viewItems.length} điểm nổi bật trong vùng bạn đang xem`;
            if (modeSubtitleElement) modeSubtitleElement.textContent = 'Danh sách bên trái tự làm mới sau mỗi lần bạn pan hoặc zoom map. Hệ thống giữ 10 điểm nổi bật nhất trong viewport hiện tại.';
            if (summaryElement) summaryElement.innerHTML = `<strong>${state.viewItems.length}</strong> / <strong>${state.visibleCount}</strong> POI trong khung nhìn đang được đưa lên danh sách. ${escapeHtml(getDatasetNote())}`;
            mapMetaElement.textContent = `${state.visibleCount} POI trong viewport`;
        }

        function installImageFallbacks() {
            poiListElement.querySelectorAll('img[data-fallback-src]').forEach((image) => {
                image.addEventListener('error', () => {
                    const fallbackSource = image.getAttribute('data-fallback-src');
                    if (fallbackSource && image.getAttribute('src') !== fallbackSource) {
                        image.setAttribute('src', fallbackSource);
                    }
                }, { once: true });
            });
        }

        function scrollCardIntoView(reference) {
            const target = Array.from(poiListElement.querySelectorAll('[data-reference]'))
                .find((element) => element.getAttribute('data-reference') === reference);
            if (target && typeof target.scrollIntoView === 'function') {
                target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        function clearMarkers() {
            state.markersByReference.forEach((marker) => {
                if (state.map && typeof state.map.removeLayer === 'function') {
                    state.map.removeLayer(marker);
                }
            });
            state.markersByReference.clear();
        }

        function createMarker(item, index) {
            const marker = leaflet.marker([item.__lat, item.__lon], {
                icon: leaflet.divIcon({
                    className: 'sv-paris-marker-shell',
                    html: buildMarkerHtml(item, index, state.activeReference === item.reference, state.mode),
                    iconSize: [64, 64],
                    iconAnchor: [32, 60],
                    popupAnchor: [0, -42]
                }),
                title: item.name_vn || 'Paris'
            });

            if (typeof marker.bindPopup === 'function') marker.bindPopup(buildPopupHtml(item));
            if (typeof marker.on === 'function') {
                marker.on('click', () => {
                    setActiveReference(item.reference, {
                        centerMap: false,
                        scrollToCard: true,
                        openPopup: true
                    });
                });
            }
            return marker;
        }

        function renderMarkers(openPopupReference) {
            clearMarkers();
            state.viewItems.forEach((item, index) => {
                const marker = createMarker(item, index);
                state.markersByReference.set(item.reference, marker);
                if (typeof marker.addTo === 'function') marker.addTo(state.map);
            });

            const popupTarget = openPopupReference && state.markersByReference.get(openPopupReference);
            if (popupTarget && typeof popupTarget.openPopup === 'function') popupTarget.openPopup();
        }

        function renderPoiList(scrollReference) {
            if (!state.viewItems.length) {
                poiListElement.innerHTML = `
                    <div class="sv-paris-empty">
                        <div class="sv-paris-empty__icon"><i class="fa-solid fa-compass-drafting"></i></div>
                        <h3>Chưa có điểm nổi bật trong vùng đang xem</h3>
                        <p>Hãy kéo bản đồ về khu trung tâm hoặc bấm nút Top 10 để quay lại hành trình mở màn.</p>
                    </div>
                `;
                return;
            }

            poiListElement.innerHTML = state.viewItems
                .map((item, index) => buildPoiCardHtml(item, index, item.reference === state.activeReference, state.mode))
                .join('');

            installImageFallbacks();
            if (scrollReference) scrollCardIntoView(scrollReference);
        }

        function fitMapToItems(items) {
            if (!state.map || !items.length || typeof state.map.fitBounds !== 'function') return;
            state.pendingProgrammaticMoves += 1;
            state.map.fitBounds(items.map((item) => [item.__lat, item.__lon]), {
                padding: [52, 52],
                maxZoom: 13
            });
        }

        function applyView(mode, items, options = {}) {
            state.mode = mode;
            state.viewItems = Array.isArray(items) ? items.slice() : [];
            state.visibleCount = Number.isFinite(Number(options.visibleCount)) ? Number(options.visibleCount) : state.viewItems.length;

            const preserveActive = options.preserveActive && findItemByReference(state.viewItems, state.activeReference);
            state.activeReference = preserveActive
                ? state.activeReference
                : (state.viewItems[0] ? state.viewItems[0].reference : '');

            renderSummary();
            renderDistrictChips();
            renderPoiList(options.scrollToCard ? state.activeReference : '');
            renderMarkers(options.openPopupReference || '');

            if (options.fitBounds) fitMapToItems(state.viewItems);
        }

        function setActiveReference(reference, options = {}) {
            const item = findItemByReference(state.viewItems, reference);
            if (!item) return;

            state.activeReference = reference;
            renderPoiList(options.scrollToCard ? reference : '');
            renderMarkers(options.openPopup ? reference : '');

            if (options.centerMap && state.map) {
                const targetZoom = Math.max(Number(state.map.getZoom && state.map.getZoom()) || 13, 14);
                state.pendingProgrammaticMoves += 1;
                if (typeof state.map.flyTo === 'function') {
                    state.map.flyTo([item.__lat, item.__lon], targetZoom, {
                        animate: true,
                        duration: 0.85
                    });
                } else if (typeof state.map.setView === 'function') {
                    state.map.setView([item.__lat, item.__lon], targetZoom);
                }
            }
        }

        function goToFeatured() {
            applyView('featured', getFeaturedItems(state.allItems), {
                preserveActive: true,
                fitBounds: true
            });
        }

        function refreshFromViewport() {
            if (!state.map || typeof state.map.getBounds !== 'function') return;
            const result = pickViewportItems(state.allItems, state.map.getBounds(), DEFAULT_LIMIT);
            applyView('viewport', result.items, {
                visibleCount: result.visibleCount,
                preserveActive: true
            });
        }

        async function loadFullDataset() {
            try {
                const response = await fetchFn('assets/paris/monuments.json', { cache: 'force-cache' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const prepared = prepareMonuments(await response.json());
                if (!prepared.length) throw new Error('No valid Paris POI found.');

                state.allItems = prepared;
                state.datasetPhase = 'ready';

                if (state.mode === 'featured') {
                    applyView('featured', getFeaturedItems(state.allItems), {
                        preserveActive: true
                    });
                    return;
                }

                refreshFromViewport();
            } catch (error) {
                state.datasetPhase = 'error';
                renderSummary();
            }
        }

        function bindEvents() {
            resetButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    goToFeatured();
                });
            });

            poiListElement.addEventListener('click', (event) => {
                const trigger = event.target.closest('[data-reference]');
                if (!trigger) return;
                const reference = trigger.getAttribute('data-reference');
                if (!reference) return;
                setActiveReference(reference, {
                    centerMap: true,
                    openPopup: true
                });
            });

            poiListElement.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                const trigger = event.target.closest('[data-reference]');
                if (!trigger) return;
                event.preventDefault();
                const reference = trigger.getAttribute('data-reference');
                if (!reference) return;
                setActiveReference(reference, {
                    centerMap: true,
                    openPopup: true
                });
            });

            state.map.on('moveend', () => {
                if (state.pendingProgrammaticMoves > 0) {
                    state.pendingProgrammaticMoves -= 1;
                    return;
                }
                refreshFromViewport();
            });
        }

        function initMap() {
            state.map = leaflet.map(mapElement, {
                zoomControl: true,
                minZoom: 11,
                maxZoom: 18,
                scrollWheelZoom: true
            });

            if (typeof state.map.setView === 'function') {
                state.map.setView(DEFAULT_CENTER, 12);
            }

            const tileLayer = leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                subdomains: 'abcd',
                maxZoom: 20,
                attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
            });
            if (tileLayer && typeof tileLayer.addTo === 'function') tileLayer.addTo(state.map);
        }

        async function init() {
            initMap();
            bindEvents();
            goToFeatured();
            await loadFullDataset();
            return state;
        }

        return {
            init,
            goToFeatured,
            refreshFromViewport,
            setActiveReference,
            state
        };
    }

    return {
        FEATURED_BOOTSTRAP_ITEMS,
        FEATURED_EDITORIAL,
        FEATURED_REFERENCE_ORDER,
        buildDistrictSummary,
        createParisMapApp,
        getFeaturedItems,
        pickViewportItems,
        prepareMonuments
    };
});
