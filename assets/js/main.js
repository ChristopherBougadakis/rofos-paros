/* ROFOS-PAROS — vanilla JS replacing Slider Revolution, Swiper,
   Popup Maker, Advanced Popups and the theme's widget scripts. */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- sticky header ---------- */
  var sticky = $('.sticky-header');
  if (sticky) {
    var threshold = $('.hero') ? window.innerHeight * 0.8 : 280;
    var onScroll = function () {
      sticky.classList.toggle('shown', window.scrollY > threshold);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- mobile menu ---------- */
  var mobileMenu = $('.mobile-menu');
  $$('.burger').forEach(function (b) {
    b.addEventListener('click', function () { mobileMenu.classList.add('open'); });
  });
  if (mobileMenu) {
    $('.close-menu', mobileMenu).addEventListener('click', function () {
      mobileMenu.classList.remove('open');
    });
    $$('a', mobileMenu).forEach(function (a) {
      a.addEventListener('click', function () { mobileMenu.classList.remove('open'); });
    });
  }

  /* ---------- modals (booking / video) ---------- */
  function openModal(modal) {
    var frame = $('iframe[data-src]', modal);
    if (frame && !frame.src) frame.src = frame.getAttribute('data-src');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    var frame = $('iframe[data-src]', modal);
    if (frame && modal.classList.contains('modal-overlay--video')) frame.src = '';
  }
  /* Safari partitions third-party storage inside iframes, which can break
     the embedded Planyo form — navigate straight to the booking page there.
     A same-tab navigation can never be popup-blocked. */
  var isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
  $$('[data-popup]').forEach(function (t) {
    t.addEventListener('click', function (e) {
      var target = $(t.getAttribute('data-popup'));
      if (!target) return;
      e.preventDefault();
      if (isSafari && target.classList.contains('modal-overlay--booking')) {
        var frame = $('iframe[data-src]', target);
        window.location.assign(frame.getAttribute('data-src'));
        return;
      }
      openModal(target);
    });
  });
  $$('.modal-overlay').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === m) closeModal(m); });
    var x = $('.modal-close', m);
    if (x) x.addEventListener('click', function () { closeModal(m); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') $$('.modal-overlay.open').forEach(closeModal);
  });

  /* ---------- booking deep link (?fh_trip=<planyo resource id>) ----------
     Landing URLs from the Google Things To Do feed land here. Rewrite the
     booking iframe (and its fallback link) so Planyo preselects the trip,
     then open the booking modal — Safari navigates directly, same as its
     click path. Selector is the Planyo iframe itself, not a modal id, so
     this survives markup renames. No fh_trip → completely inert. */
  (function () {
    var m = /[?&]fh_trip=(\d+)/.exec(window.location.search);
    if (!m) return;
    var rid = m[1];
    var frame = $('iframe[data-src*="planyo.com/booking"]');
    if (!frame) return;
    var addRid = function (u) {
      if (!u) return u;
      if (u.indexOf('resource_id=') !== -1) return u.replace(/([?&]resource_id=)\d+/, '$1' + rid);
      return u + (u.indexOf('?') === -1 ? '?' : '&') + 'resource_id=' + rid;
    };
    frame.setAttribute('data-src', addRid(frame.getAttribute('data-src')));
    var modal = frame.closest('.modal-overlay');
    if (modal) {
      $$('a[href*="booking.php"]', modal).forEach(function (a) {
        a.setAttribute('href', addRid(a.getAttribute('href')));
      });
    }
    if (isSafari) { window.location.assign(frame.getAttribute('data-src')); return; }
    if (modal) openModal(modal);
  })();

  /* ---------- hero slider ---------- */
  var hero = $('.hero');
  if (hero) {
    var slides = $$('.hero-slide', hero);
    var title = $('.hero-title', hero);
    var sub = $('.hero-sub', hero);
    var idx = 0, timer;
    /* only the first photo is in the page; the others are fetched when their turn is near */
    function load(s) {
      if (!s || !s.getAttribute('data-bg')) return;
      s.style.setProperty('--bg', "url('" + s.getAttribute('data-bg') + "')");
      if (s.getAttribute('data-bg-m')) s.style.setProperty('--bg-m', "url('" + s.getAttribute('data-bg-m') + "')");
      s.removeAttribute('data-bg');
    }
    function show(i) {
      idx = (i + slides.length) % slides.length;
      load(slides[idx]);
      slides.forEach(function (s, k) { s.classList.toggle('active', k === idx); });
      var s = slides[idx];
      /* rewrite the words only when they change, so the heading is not redrawn every few seconds */
      if (title.innerHTML !== s.getAttribute('data-title')) title.innerHTML = s.getAttribute('data-title');
      if (sub.textContent !== s.getAttribute('data-sub')) sub.textContent = s.getAttribute('data-sub');
    }
    function warm() { load(slides[(idx + 1) % slides.length]); }
    function next() { show(idx + 1); setTimeout(warm, 2500); }
    function restart() { clearInterval(timer); timer = setInterval(next, 7000); }
    if (document.readyState === 'complete') setTimeout(warm, 2500);
    else window.addEventListener('load', function () { setTimeout(warm, 2500); });
    $('.hero-arrow--next', hero).addEventListener('click', function () { next(); restart(); });
    $('.hero-arrow--prev', hero).addEventListener('click', function () { show(idx - 1); restart(); setTimeout(warm, 2500); });
    show(0);
    restart();
  }

  /* ---------- reviews row ---------- */
  var rv = $('.rv-track');
  if (rv) {
    var stepBy = function (dir) { rv.scrollBy({ left: dir * Math.max(300, rv.clientWidth * 0.8), behavior: 'smooth' }); };
    var rvPrev = $('.rv-nav .testi-arrow--prev'), rvNext = $('.rv-nav .testi-arrow--next');
    if (rvPrev) rvPrev.addEventListener('click', function () { stepBy(-1); });
    if (rvNext) rvNext.addEventListener('click', function () { stepBy(1); });
    /* long reviews are cut after a few lines; "Read more" appears only where something is cut */
    var fit = function () {
      $$('.rv-card', rv).forEach(function (card) {
        var text = $('blockquote', card), more = $('.rv-more', card);
        if (!card.classList.contains('open')) more.hidden = text.scrollHeight <= text.clientHeight + 2;
      });
    };
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    rv.addEventListener('click', function (e) {
      /* a translated review can be switched to the guest's own words and back */
      var orig = e.target.closest ? e.target.closest('.rv-orig') : null;
      if (orig) {
        var q = $('blockquote', orig.closest('.rv-card'));
        var toOriginal = q.getAttribute('data-showing') !== 'original';
        q.textContent = q.getAttribute(toOriginal ? 'data-original' : 'data-translation');
        if (toOriginal) q.setAttribute('lang', q.getAttribute('data-orig-lang')); else q.removeAttribute('lang');
        q.setAttribute('data-showing', toOriginal ? 'original' : 'translation');
        orig.textContent = toOriginal ? 'Show translation' : 'Show original';
        fit();
        return;
      }
      var more = e.target.closest ? e.target.closest('.rv-more') : null;
      if (!more) return;
      var open = more.closest('.rv-card').classList.toggle('open');
      more.textContent = open ? 'Show less' : 'Read more';
    });
  }

  /* ---------- FAQ accordion ---------- */
  $$('.faq-item').forEach(function (item) {
    $('.faq-q', item).addEventListener('click', function () {
      var a = $('.faq-a', item);
      var isOpen = item.classList.toggle('open');
      a.style.maxHeight = isOpen ? a.scrollHeight + 'px' : '0';
    });
  });

  /* ---------- odometer counter (about page) ---------- */
  var counter = $('.counter');
  if (counter && 'IntersectionObserver' in window) {
    var target = parseInt(counter.getAttribute('data-stop'), 10) || 0;
    var done = false;
    new IntersectionObserver(function (entries, obs) {
      if (!entries[0].isIntersecting || done) return;
      done = true;
      obs.disconnect();
      var t0 = null, dur = 1900;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        counter.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, { threshold: 0.4 }).observe(counter);
  }

  /* ---------- background slideshow (about page) ---------- */
  $$('.slideshow').forEach(function (box) {
    var frames = $$(':scope > div', box);
    if (frames.length < 2) { if (frames[0]) frames[0].classList.add('active'); return; }
    var si = 0;
    /* later frames carry their photo in data-bg and fetch it shortly before they show */
    var fetchFrame = function (f) {
      if (f && f.getAttribute('data-bg')) {
        f.style.backgroundImage = "url('" + f.getAttribute('data-bg') + "')";
        f.removeAttribute('data-bg');
      }
    };
    frames[0].classList.add('active');
    setTimeout(function () { fetchFrame(frames[1]); }, 2500);
    setInterval(function () {
      frames[si].classList.remove('active');
      si = (si + 1) % frames.length;
      fetchFrame(frames[si]);
      frames[si].classList.add('active');
      setTimeout(function () { fetchFrame(frames[(si + 1) % frames.length]); }, 2500);
    }, 5000);
  });

  /* ---------- section photos: fetched when the section comes near the screen ---------- */
  var lazy = $$('.lazy-bg');
  if (lazy.length) {
    if ('IntersectionObserver' in window) {
      var bgio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('bg-on'); bgio.unobserve(en.target); }
        });
      }, { rootMargin: '500px 0px' });
      lazy.forEach(function (el) { bgio.observe(el); });
    } else {
      lazy.forEach(function (el) { el.classList.add('bg-on'); });
    }
  }

  /* ---------- cookie banner ---------- */
  var cookie = $('.cookie-banner');
  if (cookie && !localStorage.getItem('rofos_cookies_accepted')) {
    setTimeout(function () { cookie.classList.add('shown'); }, 1000);
    $('.cookie-accept', cookie).addEventListener('click', function () {
      localStorage.setItem('rofos_cookies_accepted', '1');
      cookie.classList.remove('shown');
    });
  }
})();

/* lightbox for tour-page galleries */
(function () {
  'use strict';
  var items = document.querySelectorAll('.gallery-item');
  if (!items.length) return;
  var lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = '<img alt="">';
  document.body.appendChild(lb);
  var pic = lb.querySelector('img');
  items.forEach(function (it) {
    it.addEventListener('click', function (e) {
      e.preventDefault();
      pic.src = it.getAttribute('href') || it.querySelector('img').currentSrc;
      lb.classList.add('open');
    });
  });
  lb.addEventListener('click', function () { lb.classList.remove('open'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') lb.classList.remove('open');
  });
})();

/* immersive motion: staggered scroll reveals, hero parallax, 3D tilt */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var groups = [
    '.project-intro > div', '.feature-card', '.project-grid .gallery-item',
    '.project-full .gallery-item', '.post-nav--titled a',
    '.project-cta h3', '.project-cta .btn', '.stop-card', '.history-photos img'
  ];
  var targets = [];
  groups.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', Math.min(i * 0.12, 0.48) + 's');
      el.addEventListener('transitionend', function (e) {
        // transitionend bubbles from children — only finish on our own reveal
        if (e.target !== el || !el.classList.contains('in-view')) return;
        el.classList.remove('reveal');
        el.style.removeProperty('--reveal-delay');
      });
      targets.push(el);
    });
  });
  if (targets.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* hero parallax (tour pages) */
  var hero = document.querySelector('.page-portfolio .project-hero img');
  if (hero) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var r = hero.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var progress = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      hero.style.transform = 'translate3d(0,' + (progress * -60).toFixed(1) + 'px,0) scale(1.14)';
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* 3D pointer tilt on cards */
  if (window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.feature-card, .stop-card').forEach(function (card) {
      card.classList.add('tilt');
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateX(' + (-y * 6).toFixed(2) +
          'deg) rotateY(' + (x * 8).toFixed(2) + 'deg) translateY(-6px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }
})();

/* contact form: show success notice after FormSubmit redirects back (?sent=1) */
(function () {
  'use strict';
  var ok = document.querySelector('.form-success');
  if (ok && /[?&]sent=1/.test(location.search)) {
    ok.hidden = false;
    ok.scrollIntoView({ block: 'center' });
  }
})();
