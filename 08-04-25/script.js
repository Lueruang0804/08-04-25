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
    // "Our Song" — swap this for a different YouTube video ID any time.
    youtubeVideoId: 'hkLVI3DoeAE',
    offlineViewPasscode: '00-00-00',
    offlineAdminPasscode: '00000',
    offlineLetter:
      "[Write your personal letter here. Talk about how you met, what she means to you, " +
      "your favorite memory together, and what you're looking forward to. This is the heart " +
      "of the whole website — take your time with it.]",
    offlineTimelineEntries: [
      { icon: '❤️', title: 'The Day We Met', text: '[Describe the day your story began.]' },
      { icon: '🌷', title: 'Our First Date', text: '[Describe your first date together.]' },
      { icon: '📸', title: 'Our Favorite Memory', text: '[Describe a memory that means the world to you.]' },
      { icon: '🎂', title: 'Birthdays Together', text: '[Describe celebrating birthdays as a couple.]' },
      { icon: '💕', title: 'Today — Our Anniversary', text: 'And here we are, still writing our story together.' }
    ]
  };

  // Remembered only in memory for this page session so Save can re-send
  // the admin passcode with each request. Never written to storage.
  var sessionAdminCode = null;

  // Assigned inside the music player IIFE (section 6, below); called from
  // the passcode-success branch once she unlocks the site, so the two
  // need a shared reference declared up here.
  var startMusicExperience = null;

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
          loadTimelineIntoPage();
          if (startMusicExperience) startMusicExperience();
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

  /* ---------- Our Story So Far (timeline) ---------- */
  function renderTimelineTrack(container, entries) {
    container.innerHTML = '';
    var list = Array.isArray(entries) && entries.length > 0 ? entries : CONFIG.offlineTimelineEntries;
    list.forEach(function (entry, index) {
      var article = document.createElement('article');
      article.className = 'timeline__card reveal-on-scroll';
      if (index === list.length - 1) article.classList.add('timeline__card--today');

      var icon = document.createElement('span');
      icon.className = 'timeline__icon';
      icon.textContent = entry.icon || '';

      var h3 = document.createElement('h3');
      h3.textContent = entry.title || '';

      var p = document.createElement('p');
      p.textContent = entry.text || '';

      article.appendChild(icon);
      article.appendChild(h3);
      article.appendChild(p);
      container.appendChild(article);
      registerRevealTarget(article);
    });
  }

  function fetchTimeline() {
    return fetch(CONFIG.apiBase + '/timeline')
      .then(function (resp) {
        if (!resp.ok) throw new Error('fetch_failed');
        return resp.json();
      })
      .then(function (data) { return Array.isArray(data.entries) ? data.entries : CONFIG.offlineTimelineEntries; })
      .catch(function () { return CONFIG.offlineTimelineEntries; });
  }

  function loadTimelineIntoPage() {
    var container = document.getElementById('timeline-track');
    fetchTimeline().then(function (entries) {
      renderTimelineTrack(container, entries);
    });
  }

  /* ---------- Gallery photo URLs (served from Supabase Storage) ---------- */
  var photoBaseUrlPromise = null;
  function getPhotoBaseUrl() {
    if (!photoBaseUrlPromise) {
      photoBaseUrlPromise = fetch(CONFIG.apiBase + '/config')
        .then(function (resp) {
          if (!resp.ok) throw new Error('config_failed');
          return resp.json();
        })
        .then(function (data) { return data.supabaseUrl || null; })
        .catch(function () { return null; });
    }
    return photoBaseUrlPromise;
  }

  function photoUrlForSlot(baseUrl, slot) {
    if (!baseUrl) return null;
    return baseUrl + '/storage/v1/object/public/photos/photo' + slot;
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

    storyMessage.textContent = 'Loading your story...';
    storyMessage.classList.remove('is-success');
    fetchTimeline().then(function (entries) {
      renderStoryEditorRows(entries);
      storyMessage.textContent = '';
    });

    getPhotoBaseUrl().then(function (baseUrl) {
      document.querySelectorAll('.photo-editor-preview').forEach(function (img) {
        var slot = img.getAttribute('data-photo-slot');
        var url = photoUrlForSlot(baseUrl, slot);
        if (url) {
          img.onerror = function () { img.removeAttribute('src'); };
          img.src = url;
        }
      });
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

  /* ---------- Hidden admin editor: Our Story So Far ---------- */
  var storyEditorList = document.getElementById('story-editor-list');
  var storySaveBtn = document.getElementById('story-save');
  var storyMessage = document.getElementById('story-message');

  function renderStoryEditorRows(entries) {
    storyEditorList.innerHTML = '';
    var list = Array.isArray(entries) && entries.length > 0 ? entries : CONFIG.offlineTimelineEntries;
    list.forEach(function (entry, index) {
      var row = document.createElement('div');
      row.className = 'story-editor-row';

      var iconInput = document.createElement('input');
      iconInput.type = 'text';
      iconInput.className = 'story-editor-icon';
      iconInput.maxLength = 4;
      iconInput.setAttribute('aria-label', 'Icon for entry ' + (index + 1));
      iconInput.value = entry.icon || '';

      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'story-editor-title';
      titleInput.setAttribute('aria-label', 'Title for entry ' + (index + 1));
      titleInput.value = entry.title || '';

      var textArea = document.createElement('textarea');
      textArea.className = 'story-editor-text';
      textArea.rows = 2;
      textArea.setAttribute('aria-label', 'Description for entry ' + (index + 1));
      textArea.value = entry.text || '';

      row.appendChild(iconInput);
      row.appendChild(titleInput);
      row.appendChild(textArea);
      storyEditorList.appendChild(row);
    });
  }

  function collectStoryEntries() {
    var rows = storyEditorList.querySelectorAll('.story-editor-row');
    var entries = [];
    rows.forEach(function (row) {
      var icon = row.querySelector('.story-editor-icon').value.trim();
      var title = row.querySelector('.story-editor-title').value.trim();
      var text = row.querySelector('.story-editor-text').value.trim();
      if (title.length > 0 && text.length > 0) {
        entries.push({ icon: icon, title: title, text: text });
      }
    });
    return entries;
  }

  storySaveBtn.addEventListener('click', function () {
    var entries = collectStoryEntries();
    if (entries.length === 0) {
      storyMessage.textContent = 'Add a title and description to at least one entry.';
      storyMessage.classList.remove('is-success');
      return;
    }
    storySaveBtn.disabled = true;
    storyMessage.textContent = 'Saving...';
    storyMessage.classList.remove('is-success');

    fetch(CONFIG.apiBase + '/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: sessionAdminCode, entries: entries })
    }).then(function (resp) {
      storySaveBtn.disabled = false;
      if (!resp.ok) throw new Error('save_failed');
      storyMessage.textContent = 'Saved. Updated on the site immediately.';
      storyMessage.classList.add('is-success');
    }).catch(function () {
      storySaveBtn.disabled = false;
      storyMessage.textContent = "Couldn't save just now (no server connected in this preview). Try again once deployed.";
      storyMessage.classList.remove('is-success');
    });
  });

  /* ---------- Hidden admin editor: Photos ---------- */
  document.querySelectorAll('.photo-editor-row').forEach(function (row) {
    var slot = row.getAttribute('data-slot');
    var input = row.querySelector('.photo-editor-input');
    var status = row.querySelector('.photo-editor-status');
    var preview = row.querySelector('.photo-editor-preview');

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;

      status.textContent = 'Uploading...';
      status.classList.remove('is-success');

      var reader = new FileReader();
      reader.onload = function () {
        fetch(CONFIG.apiBase + '/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: sessionAdminCode,
            slot: slot,
            imageBase64: reader.result,
            contentType: file.type
          })
        }).then(function (resp) {
          if (!resp.ok) throw new Error('upload_failed');
          status.textContent = 'Saved.';
          status.classList.add('is-success');
          preview.src = reader.result;
          input.value = '';
        }).catch(function () {
          status.textContent = "Couldn't upload (no server connected in this preview).";
          status.classList.remove('is-success');
        });
      };
      reader.onerror = function () {
        status.textContent = 'Could not read that file.';
        status.classList.remove('is-success');
      };
      reader.readAsDataURL(file);
    });
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
  var scrollRevealObserver = null;

  // Usable for elements created after the initial pass (e.g. the
  // timeline cards, rendered later once /api/timeline resolves).
  function registerRevealTarget(el) {
    if (scrollRevealObserver) {
      scrollRevealObserver.observe(el);
    } else {
      el.classList.add('is-visible'); // no IntersectionObserver support
    }
  }

  function initScrollReveal() {
    if (scrollRevealInitialized) return;
    scrollRevealInitialized = true;

    var targets = document.querySelectorAll('.reveal-on-scroll');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    scrollRevealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          scrollRevealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    targets.forEach(function (el) { scrollRevealObserver.observe(el); });
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

    // Photos live in Supabase Storage, uploaded through the admin
    // editor. A slot with nothing uploaded yet 404s, which onerror
    // turns into the existing tulip placeholder styling.
    getPhotoBaseUrl().then(function (baseUrl) {
      items.forEach(function (item) {
        var img = item.querySelector('img[data-photo-slot]');
        if (!img) return;
        var slot = img.getAttribute('data-photo-slot');
        var url = photoUrlForSlot(baseUrl, slot);
        if (!url) {
          item.classList.add('gallery__item--placeholder');
          return;
        }
        img.addEventListener('error', function () {
          item.classList.add('gallery__item--placeholder');
        });
        img.src = url;
      });
    });

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
     6. MUSIC PLAYER — "Our Song" plays via a visually-hidden YouTube
        embed (see CONFIG.youtubeVideoId), driven by the YouTube
        IFrame API. It starts itself automatically the moment she
        unlocks the site (see startMusicExperience, called from the
        passcode-success branch above) — no Play button needed.

        Autoplay strategy (browsers block unmuted autoplay unless a
        recent user gesture is attached, and there's no reliable way
        to detect that in advance):
          1. Try a real, unmuted play at volume 0.
          2. ~600ms later, check whether it's actually playing.
             If yes: fade the volume up — done.
             If no (blocked): switch to a muted autoplay (browsers
             always allow this), and arm a one-time listener for the
             visitor's first click/tap/keypress anywhere on the page,
             which unmutes and fades in at that moment.
        Either path ends the same way: audio ramps in from silence,
        never a hard jump to full volume.

        The floating play/pause button and volume slider still work
        for manual control afterward; they're just no longer required
        to hear anything in the first place.
     ============================================================ */
  (function initMusicPlayer() {
    var toggleBtn = document.getElementById('music-toggle');
    var panel = document.getElementById('music-panel');
    var playBtn = document.getElementById('music-play');
    var playIcon = document.getElementById('music-play-icon');
    var volumeSlider = document.getElementById('music-volume');

    var VOLUME_STORAGE_KEY = 'anniversary-music-volume';
    var DEFAULT_VOLUME = 0.35;

    var ytPlayer = null;
    var playerReady = false;
    var isPlaying = false;
    var autoStartRequested = false;
    var autoStartAttempted = false;
    var fadeTimer = null;

    function loadStoredVolume() {
      var stored = parseFloat(window.localStorage.getItem(VOLUME_STORAGE_KEY));
      return (!isNaN(stored) && stored >= 0 && stored <= 1) ? stored : DEFAULT_VOLUME;
    }

    var targetVolume = loadStoredVolume();
    volumeSlider.value = String(targetVolume);

    function setPlayingUI(playing) {
      isPlaying = playing;
      playIcon.textContent = playing ? '❚❚' : '▶';
    }

    function stopFade() {
      if (fadeTimer) {
        window.clearInterval(fadeTimer);
        fadeTimer = null;
      }
    }

    function fadeVolumeTo(target, durationMs) {
      stopFade();
      if (prefersReducedMotion) {
        ytPlayer.setVolume(Math.round(target * 100));
        return;
      }
      var steps = 24;
      var stepTime = durationMs / steps;
      var i = 0;
      fadeTimer = window.setInterval(function () {
        i++;
        ytPlayer.setVolume(Math.round(target * 100 * (i / steps)));
        if (i >= steps) stopFade();
      }, stepTime);
    }

    function armFirstInteractionFallback() {
      var events = ['click', 'touchstart', 'keydown'];
      function onFirstInteraction() {
        events.forEach(function (evt) { document.removeEventListener(evt, onFirstInteraction); });
        ytPlayer.unMute();
        ytPlayer.playVideo();
        fadeVolumeTo(targetVolume, 2000);
      }
      events.forEach(function (evt) {
        document.addEventListener(evt, onFirstInteraction, { once: true, passive: true });
      });
    }

    function beginAutoplayAttempt() {
      if (autoStartAttempted) return;
      autoStartAttempted = true;

      ytPlayer.setVolume(0);
      ytPlayer.playVideo();

      window.setTimeout(function () {
        var state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
          fadeVolumeTo(targetVolume, 2500);
        } else {
          // Blocked — fall back to a muted autoplay (always allowed),
          // then unmute + fade in on her first interaction.
          ytPlayer.mute();
          ytPlayer.playVideo();
          armFirstInteractionFallback();
        }
      }, 600);
    }

    startMusicExperience = function () {
      if (!playerReady) {
        autoStartRequested = true;
        return;
      }
      beginAutoplayAttempt();
    };

    window.onYouTubeIframeAPIReady = function () {
      ytPlayer = new YT.Player('youtube-player', {
        videoId: CONFIG.youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          // Looping a single video via the IFrame API requires repeating
          // it as its own "playlist".
          loop: 1,
          playlist: CONFIG.youtubeVideoId
        },
        events: {
          onReady: function () {
            playerReady = true;
            ytPlayer.setVolume(0);
            if (autoStartRequested) beginAutoplayAttempt();
          },
          onStateChange: function (event) {
            if (event.data === YT.PlayerState.PLAYING) setPlayingUI(true);
            else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) setPlayingUI(false);
          },
          onError: function () {
            playBtn.disabled = true;
            playBtn.setAttribute('aria-label', "Couldn't load the song");
          }
        }
      });
    };

    toggleBtn.addEventListener('click', function () {
      var isOpen = !panel.hidden;
      panel.hidden = isOpen;
      toggleBtn.setAttribute('aria-expanded', String(!isOpen));
    });

    playBtn.addEventListener('click', function () {
      if (!playerReady) {
        autoStartRequested = true;
        return;
      }
      stopFade();
      if (isPlaying) {
        ytPlayer.pauseVideo();
      } else {
        ytPlayer.unMute();
        ytPlayer.setVolume(Math.round(targetVolume * 100));
        ytPlayer.playVideo();
      }
    });

    volumeSlider.addEventListener('input', function () {
      targetVolume = parseFloat(volumeSlider.value);
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(targetVolume));
      if (playerReady) {
        stopFade();
        ytPlayer.setVolume(Math.round(targetVolume * 100));
      }
    });
  })();

  /* ============================================================
     7. "DO YOU LOVE ME?" CELEBRATION — checking the box launches an
        ambient fireworks display with "I love you" floating in the
        background, nonstop, while she keeps scrolling/reading the
        rest of the site. Non-blocking: no overlay, no dimming.
     ============================================================ */
  (function initLoveQuestion() {
    var checkbox = document.getElementById('love-checkbox');
    var overlay = document.getElementById('fireworks-overlay');
    var canvas = document.getElementById('fireworks-canvas');
    var textLayer = document.getElementById('fireworks-text-layer');
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    var palette = ['#F7B6C2', '#E63946', '#FFD166', '#B8A8E3', '#2D6A4F', '#F8F8F8'];
    var fireworks = [];
    var rafId = null;
    var fireworkTimer = null;
    var textTimer = null;

    function resizeCanvas() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnFirework() {
      var w = window.innerWidth, h = window.innerHeight;
      var x = w * (0.15 + Math.random() * 0.7);
      var y = h * (0.15 + Math.random() * 0.4);
      var color = palette[Math.floor(Math.random() * palette.length)];
      var count = 28 + Math.floor(Math.random() * 16);
      var particles = [];
      for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        var speed = 1.5 + Math.random() * 2.5;
        particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1 });
      }
      fireworks.push({ particles: particles, color: color });
    }

    function step() {
      var w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (var i = fireworks.length - 1; i >= 0; i--) {
        var fw = fireworks[i];
        var alive = false;
        for (var j = 0; j < fw.particles.length; j++) {
          var p = fw.particles[j];
          if (p.life <= 0) continue;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.045; // gravity
          p.life -= 0.014;
          if (p.life > 0) {
            alive = true;
            ctx.beginPath();
            ctx.globalAlpha = Math.max(p.life, 0);
            ctx.fillStyle = fw.color;
            ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (!alive) fireworks.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(step);
    }

    function spawnLoveText() {
      var el = document.createElement('span');
      el.textContent = 'I love you ❤';
      el.style.left = (5 + Math.random() * 80) + 'vw';
      el.style.top = (40 + Math.random() * 20) + 'vh';
      el.style.fontSize = (1.1 + Math.random() * 1.4) + 'rem';
      el.style.animationDuration = (5 + Math.random() * 3) + 's';
      textLayer.appendChild(el);
      window.setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 9000);
    }

    function start() {
      overlay.hidden = false;
      resizeCanvas();
      spawnFirework();
      spawnLoveText();
      if (prefersReducedMotion) return; // one calm burst + text, no loop
      rafId = requestAnimationFrame(step);
      fireworkTimer = window.setInterval(spawnFirework, 700);
      textTimer = window.setInterval(spawnLoveText, 900);
      window.addEventListener('resize', resizeCanvas);
    }

    function stop() {
      overlay.hidden = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (fireworkTimer) window.clearInterval(fireworkTimer);
      if (textTimer) window.clearInterval(textTimer);
      rafId = null;
      fireworkTimer = null;
      textTimer = null;
      fireworks = [];
      textLayer.innerHTML = '';
      window.removeEventListener('resize', resizeCanvas);
    }

    checkbox.addEventListener('change', function () {
      if (checkbox.checked) start(); else stop();
    });
  })();

  /* ============================================================
     8. FOOTER YEAR
     ============================================================ */
  document.getElementById('footer-year').textContent = new Date().getFullYear();

})();
