/**
 * Mobile Navigation - collapsed "..." menu for narrow screens.
 *
 * Injects a compact trigger into .sv-topbar and builds an off-canvas drawer
 * that mirrors the main nav links, search bar and auth controls.
 */
(function () {
    'use strict';

    const MQ = window.matchMedia('(max-width: 991.98px)');
    let injected = false;
    let triggerBtn;
    let overlay;
    let drawer;
    let drawerCloseBtn;
    let drawerTitle;
    let drawerNav;
    let drawerSearch;
    let drawerAuth;
    let lastFocusedElement = null;

    function getTopbarContainer() {
        return document.querySelector('.sv-topbar .container');
    }

    function getNavLinks() {
        return Array.from(document.querySelectorAll('.sv-nav .nav-link'));
    }

    function getHomeNavLink() {
        const navLinks = getNavLinks();
        return navLinks.find(function (link) {
            const href = String(link.getAttribute('href') || '').trim().toLowerCase();
            return href === 'index.html' || href === './index.html' || href === '/';
        }) || navLinks[0] || null;
    }

    function getActiveNavLink() {
        return document.querySelector('.sv-nav .nav-link.active')
            || getHomeNavLink();
    }

    function getCurrentLabel() {
        const activeLink = getActiveNavLink();
        const label = activeLink ? activeLink.textContent : '';
        return String(label || '').trim() || 'Menu';
    }

    function syncCurrentLabel() {
        const label = getCurrentLabel();
        if (drawerTitle) {
            drawerTitle.textContent = label;
        }
    }

    function inject() {
        if (injected) {
            return;
        }

        const topbarContainer = getTopbarContainer();
        if (!topbarContainer || !document.body) {
            return;
        }
        injected = true;

        triggerBtn = document.createElement('button');
        triggerBtn.className = 'sv-hamburger';
        triggerBtn.setAttribute('aria-label', 'Mo menu');
        triggerBtn.setAttribute('aria-controls', 'sv-mobile-drawer');
        triggerBtn.setAttribute('aria-expanded', 'false');
        triggerBtn.setAttribute('type', 'button');
        triggerBtn.innerHTML = '<span aria-hidden="true">...</span>';
        topbarContainer.appendChild(triggerBtn);

        overlay = document.createElement('div');
        overlay.className = 'sv-mobile-overlay';
        document.body.appendChild(overlay);

        drawer = document.createElement('aside');
        drawer.className = 'sv-mobile-drawer';
        drawer.id = 'sv-mobile-drawer';
        drawer.setAttribute('aria-hidden', 'true');
        drawer.setAttribute('aria-modal', 'true');
        drawer.setAttribute('role', 'dialog');

        const header = document.createElement('div');
        header.className = 'sv-mobile-drawer__header';

        drawerTitle = document.createElement('h2');
        drawerTitle.className = 'sv-mobile-drawer__title';
        header.appendChild(drawerTitle);

        drawerCloseBtn = document.createElement('button');
        drawerCloseBtn.className = 'sv-mobile-drawer__close';
        drawerCloseBtn.setAttribute('aria-label', 'Dong menu');
        drawerCloseBtn.setAttribute('type', 'button');
        drawerCloseBtn.innerHTML = '<i class="fa fa-xmark"></i>';
        header.appendChild(drawerCloseBtn);

        drawer.appendChild(header);

        drawerAuth = document.createElement('div');
        drawerAuth.className = 'sv-mobile-drawer__auth';
        drawer.appendChild(drawerAuth);

        drawerNav = document.createElement('nav');
        drawerNav.className = 'sv-mobile-drawer__nav';
        drawer.appendChild(drawerNav);

        drawerSearch = document.createElement('div');
        drawerSearch.className = 'sv-mobile-drawer__search';
        drawer.appendChild(drawerSearch);

        document.body.appendChild(drawer);

        syncContent();

        triggerBtn.addEventListener('click', function () {
            if (drawer && drawer.classList.contains('open')) {
                closeDrawer();
                return;
            }
            openDrawer();
        });
        drawerCloseBtn.addEventListener('click', closeDrawer);
        overlay.addEventListener('click', closeDrawer);
        document.addEventListener('keydown', handleKeyDown);

        const authBox = document.querySelector('.sv-auth');
        if (authBox && typeof MutationObserver === 'function') {
            new MutationObserver(syncAuth).observe(authBox, { childList: true, subtree: true });
        }
    }

    function wireCloseOnInteraction(root) {
        if (!root) {
            return;
        }
        root.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeDrawer);
        });
    }

    function syncContent() {
        syncCurrentLabel();

        const navEl = document.querySelector('.sv-nav .nav');
        if (navEl && drawerNav) {
            const ul = document.createElement('ul');
            navEl.querySelectorAll('.nav-item').forEach(function (item) {
                const anchor = item.querySelector('a');
                if (!anchor) {
                    return;
                }
                const cloneItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = anchor.href;
                link.textContent = anchor.textContent.trim();
                if (anchor.classList.contains('active')) {
                    link.classList.add('active');
                }
                cloneItem.appendChild(link);
                ul.appendChild(cloneItem);
            });
            drawerNav.innerHTML = '';
            drawerNav.appendChild(ul);
            wireCloseOnInteraction(drawerNav);
        }

        const searchEl = document.querySelector('.sv-nav .sv-search');
        if (drawerSearch) {
            drawerSearch.innerHTML = '';
            if (searchEl) {
                const clone = searchEl.cloneNode(true);
                clone.style.width = '100%';
                drawerSearch.appendChild(clone);
            }
        }

        syncAuth();
    }

    function syncAuth() {
        const authBox = document.querySelector('.sv-auth');
        if (!drawerAuth) {
            return;
        }

        drawerAuth.innerHTML = '';
        if (!authBox) {
            return;
        }

        const clone = authBox.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.remove('d-none', 'd-md-flex');
        clone.style.display = 'flex';
        drawerAuth.appendChild(clone);
        wireCloseOnInteraction(drawerAuth);

        const logoutBtn = drawerAuth.querySelector('#sv-auth-logout, .sv-auth-logout');
        if (logoutBtn) {
            logoutBtn.removeAttribute('id');
            logoutBtn.addEventListener('click', function (event) {
                event.preventDefault();
                closeDrawer();
                const original = document.querySelector('#sv-auth-logout');
                if (original) {
                    original.click();
                }
            });
        }
    }

    function openDrawer() {
        if (!drawer || !overlay || !triggerBtn || !document.body) {
            return;
        }
        syncContent();
        lastFocusedElement = document.activeElement;
        drawer.classList.add('open');
        overlay.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        triggerBtn.setAttribute('aria-expanded', 'true');
        document.body.classList.add('sv-mobile-nav-open');
        document.body.style.overflow = 'hidden';
        if (drawerCloseBtn && typeof drawerCloseBtn.focus === 'function') {
            drawerCloseBtn.focus();
        }
    }

    function closeDrawer() {
        if (!document.body) {
            return;
        }
        if (drawer) {
            drawer.classList.remove('open');
            drawer.setAttribute('aria-hidden', 'true');
        }
        if (overlay) {
            overlay.classList.remove('open');
        }
        if (triggerBtn) {
            triggerBtn.setAttribute('aria-expanded', 'false');
        }
        document.body.classList.remove('sv-mobile-nav-open');
        document.body.style.overflow = '';
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
        }
        lastFocusedElement = null;
    }

    function setCompactMode(enabled) {
        if (!document.body) {
            return;
        }
        if (!enabled) {
            document.body.classList.remove('sv-mobile-nav-active');
            closeDrawer();
            return;
        }

        inject();
        if (!injected) {
            return;
        }
        document.body.classList.add('sv-mobile-nav-active');
        syncContent();
    }

    function handleKeyDown(event) {
        if (event.key === 'Escape' && drawer && drawer.classList.contains('open')) {
            closeDrawer();
        }
    }

    function handleMQ(eventOrList) {
        setCompactMode(Boolean(eventOrList && eventOrList.matches));
    }

    function init() {
        handleMQ(MQ);
        if (typeof MQ.addEventListener === 'function') {
            MQ.addEventListener('change', handleMQ);
            return;
        }
        if (typeof MQ.addListener === 'function') {
            MQ.addListener(handleMQ);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
