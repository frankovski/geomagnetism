/* ============================================================
   Geomagnetism — scripts.js
   All UI enhancements injected here so HTML files stay clean.
   Features: Google Font, Dark Mode, Hamburger Nav, TOC,
             Lightbox, Back to Top
   ============================================================ */

(function () {
  'use strict';

  /* ── 1. Load Inter font from Google Fonts ── */
  var fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(fontLink);

  /* ── 2. Inject global UI elements into <body> ── */
  document.body.insertAdjacentHTML('beforeend', [
    /* Dark-mode toggle */
    '<button class="dark-mode-toggle" id="darkModeToggle" aria-label="Toggle dark mode" title="Toggle dark mode">🌙</button>',

    /* Hamburger button (inserted via JS into nav below) */

    /* Lightbox overlay */
    '<div class="lightbox-overlay" id="lightbox" role="dialog" aria-modal="true">',
      '<button class="lightbox-close" id="lightboxClose" aria-label="Close">&times;</button>',
      '<img class="lightbox-img" id="lightboxImg" src="" alt="" />',
      '<div class="lightbox-caption" id="lightboxCaption"></div>',
    '</div>',

    /* Back to top */
    '<button class="back-to-top" id="backToTop" aria-label="Back to top">↑</button>',
  ].join(''));

  /* Move dark-mode toggle into header .inner */
  var headerInner = document.querySelector('.site-header .inner');
  var dmToggle = document.getElementById('darkModeToggle');
  if (headerInner && dmToggle) {
    /* Wrap top of header in a flex row */
    var headerText = document.createElement('div');
    headerText.className = 'header-text';

    /* Move existing children (title, contract info, project title) into headerText */
    var children = Array.prototype.slice.call(headerInner.children);
    children.forEach(function (child) {
      if (!child.classList.contains('main-nav')) {
        headerText.appendChild(child);
      }
    });

    var controls = document.createElement('div');
    controls.className = 'header-controls';
    controls.appendChild(dmToggle);

    var headerTop = document.createElement('div');
    headerTop.className = 'header-top';
    headerTop.appendChild(headerText);
    headerTop.appendChild(controls);

    headerInner.insertBefore(headerTop, headerInner.firstChild);
  }

  /* Inject hamburger button into nav */
  var mainNav = document.querySelector('.main-nav');
  if (mainNav) {
    var hamburger = document.createElement('button');
    hamburger.className = 'nav-hamburger';
    hamburger.setAttribute('aria-label', 'Toggle menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = '&#9776;';
    mainNav.appendChild(hamburger);
  }

  /* ── 3. Dark Mode ── */
  (function initDarkMode() {
    /* Safe localStorage wrappers (file:// protocol can throw SecurityError) */
    function lsGet(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function lsSet(key, val) {
      try { localStorage.setItem(key, val); } catch (e) {}
    }

    function updateBtn(on) {
      var btn = document.getElementById('darkModeToggle');
      if (btn) {
        btn.textContent = on ? '☀️' : '🌙';
        btn.title = on ? 'Switch to light mode' : 'Switch to dark mode';
      }
    }

    function applyDark(on) {
      document.documentElement.classList.toggle('dark', on);
      updateBtn(on);
    }

    /* Read theme: URL param wins (local file navigation), then localStorage, then OS */
    var initDark = false;
    try {
      var urlTheme = new URLSearchParams(window.location.search).get('theme');
      if (urlTheme === 'dark' || urlTheme === 'light') {
        /* URL param is authoritative — sync it to localStorage too */
        lsSet('geomagDark', urlTheme === 'dark' ? 'true' : 'false');
        initDark = (urlTheme === 'dark');
      } else {
        var saved = lsGet('geomagDark');
        if (saved === 'true') initDark = true;
        else if (saved !== 'false' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) initDark = true;
      }
    } catch (e) {
      var saved2 = lsGet('geomagDark');
      if (saved2 === 'true') initDark = true;
    }
    applyDark(initDark);

    /* Toggle handler (event delegation — immune to button being moved in DOM) */
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest('#darkModeToggle')) return;
      var isDark = document.documentElement.classList.toggle('dark');
      lsSet('geomagDark', isDark ? 'true' : 'false');
      updateBtn(isDark);
    });

    /* Carry theme in URL when navigating between pages (fixes file:// localStorage isolation) */
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest('#darkModeToggle')) return; /* skip toggle clicks */
      var link = e.target && e.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto')) return;
      if (href.indexOf('.html') === -1) return;
      e.preventDefault();
      var isDark = document.documentElement.classList.contains('dark');
      var sep = href.indexOf('?') >= 0 ? '&' : '?';
      window.location.href = href + sep + 'theme=' + (isDark ? 'dark' : 'light');
    });
  })();

  /* ── 4. Hamburger Nav ── */
  (function initHamburger() {
    var btn = document.querySelector('.nav-hamburger');
    var navUl = document.querySelector('.main-nav ul');
    if (!btn || !navUl) return;

    btn.addEventListener('click', function () {
      var open = navUl.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', open);
      btn.innerHTML = open ? '&times;' : '&#9776;';
    });

    /* Close on outside click */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.main-nav')) {
        navUl.classList.remove('nav-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '&#9776;';
      }
    });
  })();

  /* ── 5. Table of Contents (year pages only) ── */
  (function initTOC() {
    var content = document.querySelector('.page-content');
    if (!content) return;

    var headings = Array.prototype.slice.call(content.querySelectorAll('h2, h3'));
    if (headings.length < 3) return;

    /* Assign IDs */
    headings.forEach(function (h, i) {
      if (!h.id) {
        h.id = 'sec-' + i + '-' + h.textContent.trim().toLowerCase()
          .replace(/[^a-z0-9À-ɏ]+/gi, '-').substring(0, 40);
      }
    });

    /* Build TOC element */
    var toc = document.createElement('aside');
    toc.className = 'toc';

    var title = document.createElement('div');
    title.className = 'toc-title';
    title.textContent = 'Cuprins';
    toc.appendChild(title);

    var ul = document.createElement('ul');
    headings.forEach(function (h) {
      var li = document.createElement('li');
      li.className = h.tagName === 'H3' ? 'toc-sub' : 'toc-main';
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      ul.appendChild(li);
    });
    toc.appendChild(ul);

    /* Apply grid layout and insert TOC */
    var container = content.closest('.container');
    if (container) {
      container.classList.add('has-toc');
      container.insertBefore(toc, content);
    }

    /* Highlight active section on scroll */
    var tocLinks = Array.prototype.slice.call(ul.querySelectorAll('a'));
    var lastActive = null;

    window.addEventListener('scroll', function () {
      var current = null;
      headings.forEach(function (h) {
        if (window.scrollY >= h.getBoundingClientRect().top + window.scrollY - 120) {
          current = h.id;
        }
      });
      if (current !== lastActive) {
        tocLinks.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + current);
        });
        lastActive = current;
      }
    }, { passive: true });

    /* Smooth scroll for TOC links */
    tocLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.getElementById(a.getAttribute('href').slice(1));
        if (target) {
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
        }
      });
    });
  })();

  /* ── 6. Lightbox ── */
  (function initLightbox() {
    var overlay = document.getElementById('lightbox');
    var imgEl = document.getElementById('lightboxImg');
    var caption = document.getElementById('lightboxCaption');
    var closeBtn = document.getElementById('lightboxClose');
    if (!overlay) return;

    function openLightbox(src, capText) {
      /* Attempt to get a larger version from Wix CDN */
      var hires = src.replace(/\/v1\/fill\/[^/]+\//, '/v1/fill/w_1400,h_1000,al_c,q_90,enc_avif,quality_auto/');
      imgEl.src = hires;
      caption.textContent = capText || '';
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      overlay.focus();
    }

    function closeLightbox() {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      imgEl.src = '';
    }

    /* Make all figure images and post hero clickable */
    function attachLightbox(el) {
      el.style.cursor = 'zoom-in';
      el.addEventListener('click', function () {
        var capText = '';
        var fig = el.closest('figure') || el.closest('.fig-block');
        if (fig) {
          var fc = fig.querySelector('figcaption');
          if (fc) capText = fc.textContent;
        }
        openLightbox(el.src, capText);
      });
    }

    document.querySelectorAll('.fig-block img').forEach(attachLightbox);
    var hero = document.querySelector('.post-hero');
    if (hero) attachLightbox(hero);

    closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
  })();

  /* ── 7. Back to Top ── */
  (function initBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      btn.classList.toggle('visible', window.scrollY > 450);
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();

})();
