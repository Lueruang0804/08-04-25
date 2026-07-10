/* ============================================================
   ANNIVERSARY WEBSITE — SCRIPT
   All interactivity lives here, scoped in one IIFE.
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     CUSTOMIZE HERE
     - The real passcodes live ONLY as Vercel environment variables
       (VIEW_PASSCODE / ADMIN_PASSCODE), read by api/verify-passcode.js
       and api/letter.js. They are never written in this file or
       committed to source, so they stay secret even in a public repo.
     - offlineViewPasscode/offlineAdminPasscode below are deliberately
       NOT the real codes — they only let you preview the UI (shake/
       success animations, the editor screen) when opening index.html
       directly with no server running. Once deployed, the real codes
       from Vercel env vars are what actually get checked.
     ============================================================ */
  var CONFIG = {
    galleryCaptionFallback: 'A cherished moment',
    apiBase: '/api',
    offlineViewPasscode: '00-00-00',
    offlineAdminPasscode: '00000',
    offlineLetter:
      "[Write your personal letter here. Talk about how you met, what she means to you, " +
      "your favorite memory together, and what you're looking forward to. This is the heart " +
      "of the whole website — take your time with it.]"
  };

  // Remembered only in memory for this page session so Save can re-send
  // the admin passcode with each request. Never written to storage.
  var sessionAdminCode = null;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ============================================================
     1. NIGHT-GARDEN BACKGROUND: stars, fireflies, tulip fields, parallax
     ============================================================ */
  (function initBackground() {
    var canvas = document.getElementById('sky-canvas');
    var ctx = canvas.getContext('2d');
    var stars = [];
    var fireflies = [];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedParticles();
    }

    function seedParticles() {
      var w = window.innerWidth, h = window.innerHeight;
      var starCount = Math.min(120, Math.floor((w * h) / 9000));
      stars = [];
      for (var i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.65,
          r: Math.random() * 1.4 + 0.3,
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.8
        });
      }
      var fireflyCount = prefersReducedMotion ? 0 : Math.min(18, Math.floor(w / 90));
      fireflies = [];
      for (var j = 0; j < fireflyCount; j++) {
        fireflies.push({
          x: Math.random() * w,
          y: h * 0.45 + Math.random() * h * 0.5,
          baseY: 0,
          angle: Math.random() * Math.PI * 2,
          radius: 20 + Math.random() * 40,
          speed: 0.002 + Math.random() * 0.003,
          phase: Math.random() * Math.PI * 2
        });
        fireflies[j].baseY = fireflies[j].y;
      }
    }

    var t = 0;
    function draw() {
      var w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Stars: twinkle via alpha oscillation
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var alpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.001 * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(248, 248, 248, ' + alpha.toFixed(2) + ')';
        ctx.fill();
      }

      // Fireflies: warm glow dots wandering slowly
      for (var j = 0; j < fireflies.length; j++) {
        var f = fireflies[j];
        f.angle += f.speed;
        var x = f.x + Math.cos(f.angle) * f.radius;
        var y = f.baseY + Math.sin(f.angle * 1.3) * (f.radius * 0.6);
        var glowAlpha = 0.5 + 0.5 * Math.sin(t * 0.002 + f.phase);
        var grad = ctx.createRadialGradient(x, y, 0, x, y, 8);
        grad.addColorStop(0, 'rgba(255, 209, 102, ' + (0.9 * glowAlpha).toFixed(2) + ')');
        grad.addColorStop(1, 'rgba(255, 209, 102, 0)');
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      t += 16;
      if (!prefersReducedMotion) {
        requestAnimationFrame(draw);
      }
    }

    window.addEventListener('resize', resize);
    resize();
    draw();
  })();

  /* ---------- Tulip field SVG generation ---------- */
  function buildTulipRow(count, colors, height) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var color = colors[i % colors.length];
      var wrapper = document.createElementNS(svgNS, 'svg');
      wrapper.setAttribute('class', 'tulip');
      wrapper.setAttribute('width', height * 0.5);
      wrapper.setAttribute('height', height);
      wrapper.setAttribute('viewBox', '0 0 40 80');
      wrapper.style.animationDelay = (Math.random() * -5).toFixed(2) + 's';
      wrapper.innerHTML =
        '<rect x="18" y="30" width="4" height="50" fill="#2D6A4F" />' +
        '<path d="M20 0 C8 6 6 20 20 32 C34 20 32 6 20 0 Z" fill="' + color + '" />' +
        '<path d="M20 4 C13 10 12 20 20 28" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />';
      frag.appendChild(wrapper);
    }
    return frag;
  }

  (function initTulipFields() {
    var palette = ['#F7B6C2', '#E63946', '#FFD166'];
    var back = document.querySelector('.tulip-field--back');
    var mid = document.querySelector('.tulip-field--mid');
    var front = document.querySelector('.tulip-field--front');
    var w = window.innerWidth;
    var backCount = Math.max(6, Math.floor(w / 140));
    var midCount = Math.max(6, Math.floor(w / 110));
    var frontCount = Math.max(5, Math.floor(w / 160));

    back.appendChild(buildTulipRow(backCount, palette, 70));
    mid.appendChild(buildTulipRow(midCount, palette, 90));
    front.appendChild(buildTulipRow(frontCount, palette, 120));
  })();

  /* ---------- Mouse parallax on background layers ---------- */
  (function initParallax() {
    if (isTouchDevice || prefersReducedMotion) return;

    var layers = [
      { el: document.querySelector('.moon'), depth: 14 },
      { el: document.querySelector('.tulip-field--back'), depth: 6 },
      { el: document.querySelector('.tulip-field--mid'), depth: 12 },
      { el: document.querySelector('.tulip-field--front'), depth: 20 }
    ];
    var targetX = 0, targetY = 0, ticking = false;

    window.addEventListener('mousemove', function (e) {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!ticking) {
        requestAnimationFrame(applyParallax);
        ticking = true;
      }
    });

    function applyParallax() {
      layers.forEach(function (layer) {
        if (!layer.el) return;
        var x = targetX * layer.depth;
        var y = targetY * layer.depth * 0.4;
        layer.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      ticking = false;
    }
  })();

  /* ============================================================
     2. SCREEN FLOW: landing -> passcode -> main
     ============================================================ */
  var landingEl = document.getElementById('landing');
  var passcodeEl = document.getElementById('passcode');
  var editorEl = document.getElementById('editor');
  var mainEl = document.getElementById('main');
  var musicPlayerEl = document.getElementById('music-player');

  function switchScreen(fromEl, toEl, onSwitch) {
    fromEl.classList.add('screen-fade-out');
    window.setTimeout(function () {
      fromEl.hidden = true;
      fromEl.classList.remove('screen-fade-out');
      toEl.hidden = false;
      toEl.classList.add('screen-fade-in');
      window.setTimeout(function () { toEl.classList.remove('screen-fade-in'); }, 1300);
      if (onSwitch) onSwitch();
    }, prefersReducedMotion ? 0 : 550);
  }

  document.getElementById('begin-btn').addEventListener('click', function () {
    switchScreen(landingEl, passcodeEl, function () {
      document.getElementById('passcode-input').focus();
    });
  });

  /* ---------- Passcode logic ---------- */
  var passcodeForm = document.getElementById('passcode-form');
  var passcodeInput = document.getElementById('passcode-input');
  var passcodeMessage = document.getElementById('passcode-message');
  var passcodeSubmitBtn = document.getElementById('passcode-submit');

  function normalize(value) {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  // Asks the server which passcode (if either) was entered. The real
  // codes never live in this file — only in Vercel env vars read by
  // api/verify-passcode.js. If the API can't be reached at all (e.g.
  // testing index.html directly as a file, with no server running),
  // fall back to the local offline constants so the demo still works.
  function verifyPasscode(entered) {
    return fetch(CONFIG.apiBase + '/verify-passcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: entered })
    }).then(function (resp) {
      if (resp.status === 401) return { ok: false };
      if (!resp.ok) throw new Error('verify_failed');
      return resp.json().then(function (data) { return { ok: true, role: data.role }; });
    }).catch(function () {
      // Network-level failure (no server) — use the offline fallback.
      var expectedView = normalize(CONFIG.offlineViewPasscode);
      var expectedAdmin = normalize(CONFIG.offlineAdminPasscode);
      if (entered === expectedAdmin) return { ok: true, role: 'admin', offline: true };
      if (entered === expectedView) return { ok: true, role: 'viewer', offline: true };
      return { ok: false };
    });
  }

  passcodeForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var entered = normalize(passcodeInput.value);

    passcodeInput.classList.remove('is-error', 'is-success');
    // force reflow so the shake animation can replay on repeated wrong tries
    void passcodeInput.offsetWidth;

    if (entered.length === 0) {
      passcodeInput.classList.add('is-error');
      passcodeMessage.textContent = "Oops... That's not our anniversary ❤️";
      passcodeMessage.classList.remove('is-success');
      return;
    }

    passcodeSubmitBtn.disabled = true;
    verifyPasscode(entered).then(function (result) {
      passcodeSubmitBtn.disabled = false;

      if (!result.ok) {
        passcodeInput.classList.add('is-error');
        passcodeMessage.textContent = "Oops... That's not our anniversary ❤️";
        passcodeMessage.classList.remove('is-success');
        return;
      }

      if (result.role === 'admin') {
        passcodeInput.classList.add('is-success');
        passcodeMessage.textContent = 'Welcome back.';
        passcodeMessage.classList.add('is-success');
        sessionAdminCode = entered;
        window.setTimeout(function () {
          switchScreen(passcodeEl, editorEl, function () { openEditor(); });
        }, prefersReducedMotion ? 0 : 400);
        return;
      }

      // Viewer passcode: the full romantic reveal.
      passcodeInput.classList.add('is-success');
      passcodeMessage.textContent = "Yes... it's our day. ❤️";
      passcodeMessage.classList.add('is-success');
      spawnHeartBurst();
      window.setTimeout(function () {
        passcodeEl.classList.add('is-unlocking');
        window.setTimeout(function () {
          passcodeEl.hidden = true;
          passcodeEl.classList.remove('is-unlocking');
          mainEl.hidden = false;
          mainEl.classList.add('screen-fade-in');
          musicPlayerEl.hidden = false;
          window.setTimeout(function () { mainEl.classList.remove('screen-fade-in'); }, 1300);
          initScrollReveal();
          loadLetterIntoPage();
        }, prefersReducedMotion ? 0 : 900);
      }, prefersReducedMotion ? 0 : 700);
    });
  });

  passcodeInput.addEventListener('input', function () {
    passcodeInput.classList.remove('is-error', 'is-success');
  });

  /* ============================================================
     2b. LOVE LETTER: fetch for public view, editor for admin
     ============================================================ */
  function renderLetterParagraphs(container, text) {
    container.innerHTML = '';
    var paragraphs = String(text || '').split(/\n\s*\n/).filter(function (p) { return p.trim().length > 0; });
    if (paragraphs.length === 0) paragraphs = [CONFIG.offlineLetter];
    paragraphs.forEach(function (paragraph) {
      var p = document.createElement('p');
      p.className = 'letter__paragraph';
      p.textContent = paragraph.trim();
      container.appendChild(p);
    });
  }

  function fetchLetter() {
    return fetch(CONFIG.apiBase + '/letter')
      .then(function (resp) {
        if (!resp.ok) throw new Error('fetch_failed');
        return resp.json();
      })
      .then(function (data) { return data.content || CONFIG.offlineLetter; })
      .catch(function () { return CONFIG.offlineLetter; });
  }

  function loadLetterIntoPage() {
    var container = document.getElementById('letter-content');
    fetchLetter().then(function (content) {
      renderLetterParagraphs(container, content);
    });
  }

  /* ---------- Hidden admin editor ---------- */
  var editorTextarea = document.getElementById('editor-textarea');
  var editorMessage = document.getElementById('editor-message');
  var editorSaveBtn = document.getElementById('editor-save');
  var editorCancelBtn = document.getElementById('editor-cancel');
  var editorPreviewBtn = document.getElementById('editor-preview');
  var editorPreviewModal = document.getElementById('editor-preview-modal');
  var editorPreviewContent = document.getElementById('editor-preview-content');
  var editorPreviewCloseBtn = document.getElementById('editor-preview-close');

  function openEditor() {
    editorMessage.textContent = 'Loading the current letter...';
    editorMessage.classList.remove('is-success');
    editorTextarea.value = '';
    editorTextarea.disabled = true;
    fetchLetter().then(function (content) {
      editorTextarea.value = content;
      editorTextarea.disabled = false;
      editorMessage.textContent = '';
      editorTextarea.focus();
    });
  }

  editorSaveBtn.addEventListener('click', function () {
    var content = editorTextarea.value.trim();
    if (content.length === 0) {
      editorMessage.textContent = 'Write something before saving.';
      editorMessage.classList.remove('is-success');
      return;
    }
    editorSaveBtn.disabled = true;
    editorMessage.textContent = 'Saving...';
    editorMessage.classList.remove('is-success');

    fetch(CONFIG.apiBase + '/letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: sessionAdminCode, content: content })
    }).then(function (resp) {
      editorSaveBtn.disabled = false;
      if (!resp.ok) throw new Error('save_failed');
      editorMessage.textContent = 'Saved. She’ll see this the next time she unlocks the site.';
      editorMessage.classList.add('is-success');
    }).catch(function () {
      editorSaveBtn.disabled = false;
      editorMessage.textContent = "Couldn't save just now (no server connected in this preview). Try again once deployed.";
      editorMessage.classList.remove('is-success');
    });
  });

  editorCancelBtn.addEventListener('click', function () {
    sessionAdminCode = null;
    editorEl.hidden = true;
    passcodeEl.hidden = false;
    passcodeInput.value = '';
    passcodeInput.classList.remove('is-error', 'is-success');
    passcodeMessage.textContent = '';
  });

  editorPreviewBtn.addEventListener('click', function () {
    renderLetterParagraphs(editorPreviewContent, editorTextarea.value);
    editorPreviewModal.hidden = false;
  });
  editorPreviewCloseBtn.addEventListener('click', function () {
    editorPreviewModal.hidden = true;
  });
  editorPreviewModal.addEventListener('click', function (e) {
    if (e.target === editorPreviewModal) editorPreviewModal.hidden = true;
  });

  /* ============================================================
     3. FLOATING FX: hearts, petals, sparkles
     ============================================================ */
  var fxLayer = document.getElementById('fx-layer');

  function spawnFx(className, contentBuilder, opts) {
    if (prefersReducedMotion) return;
    var el = document.createElement('div');
    el.className = 'fx-item ' + className;
    if (contentBuilder) contentBuilder(el);
    el.style.left = opts.left + 'vw';
    el.style.animationDuration = opts.duration + 's';
    if (opts.top !== undefined) el.style.top = opts.top + 'vh';
    fxLayer.appendChild(el);
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, opts.duration * 1000 + 200);
  }

  function spawnHeart() {
    spawnFx('fx-item--heart', function (el) { el.textContent = '❤'; }, {
      left: Math.random() * 100,
      duration: 6 + Math.random() * 4
    });
  }
  function spawnPetal() {
    spawnFx('fx-item--petal', function (el) {
      el.textContent = Math.random() > 0.5 ? '🌸' : '🌷';
      el.style.fontSize = (0.9 + Math.random() * 0.6) + 'rem';
    }, {
      left: Math.random() * 100,
      duration: 8 + Math.random() * 5
    });
  }
  function spawnSparkle() {
    spawnFx('fx-item--sparkle', null, {
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 2 + Math.random() * 1.5
    });
  }
  function spawnHeartBurst() {
    if (prefersReducedMotion) return;
    for (var i = 0; i < 14; i++) {
      window.setTimeout(spawnHeart, i * 90);
    }
  }

  if (!prefersReducedMotion) {
    window.setInterval(spawnPetal, 2600);
    window.setInterval(spawnSparkle, 1400);
    window.setInterval(function () {
      if (Math.random() > 0.5) spawnHeart();
    }, 3200);
  }

  /* ============================================================
     4. SCROLL REVEAL (timeline, reasons, letter, gallery)
     ============================================================ */
  var scrollRevealInitialized = false;
  function initScrollReveal() {
    if (scrollRevealInitialized) return;
    scrollRevealInitialized = true;

    var targets = document.querySelectorAll('.reveal-on-scroll');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ============================================================
     5. PHOTO GALLERY + LIGHTBOX
     ============================================================ */
  (function initGallery() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.gallery__item'));
    var lightbox = document.getElementById('lightbox');
    var lightboxImg = document.getElementById('lightbox-img');
    var lightboxCaption = document.getElementById('lightbox-caption');
    var closeBtn = document.getElementById('lightbox-close');
    var prevBtn = document.getElementById('lightbox-prev');
    var nextBtn = document.getElementById('lightbox-next');
    var currentIndex = 0;

    function openLightbox(index) {
      var item = items[index];
      if (item.classList.contains('gallery__item--placeholder')) return;
      currentIndex = index;
      var img = item.querySelector('img');
      var caption = item.querySelector('figcaption');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxCaption.textContent = caption ? caption.textContent : CONFIG.galleryCaptionFallback;
      lightbox.hidden = false;
      closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.hidden = true;
      lightboxImg.src = '';
    }

    function showRelative(offset) {
      var next = (currentIndex + offset + items.length) % items.length;
      var attempts = 0;
      while (items[next].classList.contains('gallery__item--placeholder') && attempts < items.length) {
        next = (next + offset + items.length) % items.length;
        attempts++;
      }
      openLightbox(next);
    }

    items.forEach(function (item, index) {
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', 'Open photo ' + (index + 1));
      item.addEventListener('click', function () { openLightbox(index); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(index);
        }
      });
    });

    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', function () { showRelative(-1); });
    nextBtn.addEventListener('click', function () { showRelative(1); });

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showRelative(-1);
      if (e.key === 'ArrowRight') showRelative(1);
    });
  })();

  /* ============================================================
     6. MUSIC PLAYER
     ============================================================ */
  (function initMusicPlayer() {
    var toggleBtn = document.getElementById('music-toggle');
    var panel = document.getElementById('music-panel');
    var playBtn = document.getElementById('music-play');
    var playIcon = document.getElementById('music-play-icon');
    var volumeSlider = document.getElementById('music-volume');
    var audio = document.getElementById('music-audio');
    var isPlaying = false;

    audio.volume = parseFloat(volumeSlider.value);

    toggleBtn.addEventListener('click', function () {
      var isOpen = !panel.hidden;
      panel.hidden = isOpen;
      toggleBtn.setAttribute('aria-expanded', String(!isOpen));
    });

    playBtn.addEventListener('click', function () {
      if (isPlaying) {
        audio.pause();
        playIcon.textContent = '▶';
        isPlaying = false;
      } else {
        audio.play().then(function () {
          playIcon.textContent = '❚❚';
          isPlaying = true;
        }).catch(function () {
          // Music file not present yet — fail silently, no console spam.
        });
      }
    });

    volumeSlider.addEventListener('input', function () {
      audio.volume = parseFloat(volumeSlider.value);
    });

    audio.addEventListener('error', function () {
      playBtn.disabled = true;
      playBtn.setAttribute('aria-label', 'Music file not found');
    }, true);
  })();

  /* ============================================================
     7. FOOTER YEAR
     ============================================================ */
  document.getElementById('footer-year').textContent = new Date().getFullYear();

})();
