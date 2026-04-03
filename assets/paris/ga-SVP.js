// ga-SVP.js
(function () {
  // 👉 ĐỔI ID NÀY THÀNH GA4 CỦA BẠN
  const GA_ID = 'G-T79PMFJPN5';

  if (!GA_ID) {
    console.warn('GA_SVP: GA_ID is empty');
    return;
  }

  // public cho các script khác
  window.SVP_GA_ID = GA_ID;

  // nạp script gtag.js
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  // init gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());

  const GA_SVP = {
    initPage({ title, path, mode }) {
      if (!window.gtag) return;
      gtag('config', GA_ID, {
        page_title: title || document.title,
        page_path: path || window.location.pathname
      });
      if (mode) {
        gtag('event', 'view_mode', { mode });
      }
    },

    track(eventName, params) {
      if (!window.gtag) return;
      gtag('event', eventName, params || {});
    },

    trackPoiClick(mode, poi) {
      if (!window.gtag || !poi) return;
      gtag('event', 'click_poi', {
        mode,
        poi_reference: poi.reference,
        poi_name: poi.name || '',
        score: typeof poi.score === 'number' ? poi.score : null
      });
    },

    trackRadiusChange(mode, radiusKm) {
      if (!window.gtag) return;
      gtag('event', 'change_radius', {
        mode,
        radius_m: Math.round(radiusKm * 1000)
      });
    },

    trackPriorityChange(mode, priority) {
      if (!window.gtag) return;
      gtag('event', 'change_priority', {
        mode,
        priority
      });
    }
  };

  window.GA_SVP = GA_SVP;
})();
