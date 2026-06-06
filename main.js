// --- Confetti engine (canvas) --------------------------------------------------
window.MALGOA_CONFETTI = (function () {
  var canvas, ctx, particles = [], rafId = null, running = false, falling = false;
  var GRAVITY = 0.16;
  var MAX_FALLING = 170;
  var COLORS = ['#B8962E', '#D4B043', '#E8C84B', '#F2D777', '#1565C0', '#ffffff'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function ensure() {
    if (canvas) return true;
    canvas = document.getElementById('lo-confetti');
    if (!canvas) return false;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    return true;
  }

  function makeParticle(o) {
    o = o || {};
    return {
      x:   o.x  != null ? o.x  : rand(0, canvas.width),
      y:   o.y  != null ? o.y  : rand(-canvas.height * 0.25, -10),
      vx:  o.vx != null ? o.vx : rand(-1.2, 1.2),
      vy:  o.vy != null ? o.vy : rand(1.5, 3.5),
      size: rand(6, 13),
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: rand(0, Math.PI * 2),
      vrot: rand(-0.22, 0.22),
      shape: Math.random() < 0.55 ? 'rect' : 'circle',
      sway: rand(0.4, 1.4),
      swayPhase: rand(0, Math.PI * 2),
      age: 0
    };
  }

  function spawnFalling(n) {
    for (var i = 0; i < n; i++) particles.push(makeParticle());
  }

  function burst(n) {
    // Launch celebration is user-initiated (clicking "Launch"), so it plays
    // regardless of prefers-reduced-motion. Reduced-motion is honored for
    // ambient/scroll animations elsewhere, not this one-time opt-in moment.
    if (!ensure()) return;
    var cx = canvas.width / 2, cy = canvas.height * 0.42;
    for (var i = 0; i < n; i++) {
      var angle = rand(0, Math.PI * 2);
      var speed = rand(4, 14);
      particles.push(makeParticle({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3
      }));
    }
    if (!running) { running = true; loop(); }
  }

  function draw(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function loop() {
    if (!canvas) { running = false; return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (falling && particles.length < MAX_FALLING && Math.random() < 0.6) {
      spawnFalling(2);
    }

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.age++;
      p.vy += GRAVITY;
      p.vx *= 0.99;
      p.x += p.vx + Math.sin(p.age * 0.03 + p.swayPhase) * p.sway;
      p.y += p.vy;
      p.rot += p.vrot;
      draw(p);
      if (p.y > canvas.height + 30 || p.x < -40 || p.x > canvas.width + 40) {
        particles.splice(i, 1);
      }
    }

    if (running && (falling || particles.length > 0)) {
      rafId = requestAnimationFrame(loop);
    } else {
      running = false;
    }
  }

  function start() {
    // User-initiated launch confetti — plays regardless of reduced-motion.
    if (!ensure()) return;
    falling = true;
    spawnFalling(40);
    if (!running) { running = true; loop(); }
  }

  function stop() {
    // Stop spawning; let in-flight pieces fall out naturally.
    falling = false;
  }

  function clear() {
    falling = false;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    particles = [];
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return { start: start, burst: burst, stop: stop, clear: clear };
}());

// --- Launch overlay ------------------------------------------------------------
window.MALGOA_LAUNCH = (function () {
  // SET enabled = true to activate the overlay; false to disable permanently.
  var enabled = true;

  var STORAGE_KEY = 'malgoa_launch_shown';
  var DURATION    = 10; // countdown seconds

  function setPhase(name) {
    ['lo-phase-btn', 'lo-phase-count', 'lo-phase-logo'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('lo-active');
    });
    var target = document.getElementById(name);
    if (target) target.classList.add('lo-active');
  }

  function dismiss() {
    var el = document.getElementById('launch-overlay');
    if (el) el.classList.add('hidden');
    if (window.MALGOA_CONFETTI) window.MALGOA_CONFETTI.clear();
    // Persistence disabled while previewing so the overlay returns on reload.
    // Re-enable to remember dismissal per visitor:
    // try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
  }

  function showLogo() {
    setPhase('lo-phase-logo');
    var img = document.getElementById('lo-logo-img');
    if (img) {
      img.classList.remove('lo-logo-pre');
      img.classList.add('lo-logo-animate');
    }
    // Confetti is countdown-only: stop spawning so in-flight pieces taper off
    // as the logo cleanly shrinks into place.
    if (window.MALGOA_CONFETTI) window.MALGOA_CONFETTI.stop();
    // Logo shrink/settle (~1.2s) + brand text fade-in completes, then reveal home.
    setTimeout(dismiss, 3400);
  }

  function beginCountdown() {
    var countEl = document.getElementById('launch-count');
    var circle  = document.getElementById('launch-ring-circle');
    if (!countEl || !circle) { dismiss(); return; }

    var r = 88;
    var circumference = 2 * Math.PI * r;
    circle.style.strokeDasharray  = circumference;
    circle.style.strokeDashoffset = 0;
    countEl.textContent = DURATION;

    setPhase('lo-phase-count');

    // Gentle confetti rains down throughout the countdown.
    if (window.MALGOA_CONFETTI) window.MALGOA_CONFETTI.start();

    var remaining = DURATION;
    function tick() {
      remaining--;
      countEl.textContent = remaining;
      circle.style.strokeDashoffset = circumference * (1 - remaining / DURATION);
      if (remaining <= 0) { showLogo(); return; }
      setTimeout(tick, 1000);
    }
    setTimeout(tick, 1000);
  }

  function start() {
    if (!enabled) return;
    // NOTE: one-time localStorage guard intentionally disabled so the overlay
    // shows on every load while previewing. Re-enable the line below to make it
    // appear only once per visitor.
    // try { if (localStorage.getItem(STORAGE_KEY)) return; } catch (_) {}
    var overlay = document.getElementById('launch-overlay');
    if (!overlay) return;
    setPhase('lo-phase-btn');
    overlay.classList.remove('hidden');
  }

  // Reset (call from console: MALGOA_LAUNCH.reset()) to re-show the overlay.
  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', start);

  return { dismiss: dismiss, reset: reset, beginCountdown: beginCountdown };
}());

// --- Gallery data --------------------------------------------------------------

const uttandhraImages = Array.from({ length: 40 }, (_, i) => ({
  src: `images/uttandhra-meet-${i + 1}.jpg`,
  alt: `Uttarandhra Meet 2025 - photo ${i + 1}`,
}));

const formationImages = Array.from({ length: 4 }, (_, i) => ({
  src: `images/gallery-${i + 1}.jpg`,
  alt: `MALGOA Formation Event - photo ${i + 1}`,
}));

const galleries = { uttandhra: uttandhraImages, formation: formationImages };

// --- Lightbox state ------------------------------------------------------------

let lightboxImages = [];
let lightboxIndex  = 0;

// --- Router --------------------------------------------------------------------

function router(pageId) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageId);
  });

  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Replay reveal animations for the newly shown section.
  // (Sections are display:none when inactive, so IntersectionObserver can miss
  //  them on toggle - we replay reveals here to guarantee content becomes visible.)
  if (target) {
    target.querySelectorAll('.reveal').forEach(el => el.classList.remove('in-view'));
    target.querySelectorAll('.reveal-up, .reveal-stagger, .fraunces-reveal').forEach(el => el.classList.remove('visible'));
    requestAnimationFrame(() => {
      target.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
      target.querySelectorAll('.reveal-up, .reveal-stagger, .fraunces-reveal').forEach(el => el.classList.add('visible'));
    });
  }

  if (window.lucide) lucide.createIcons();
}

// --- Mobile menu ---------------------------------------------------------------

function closeMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const menu   = document.getElementById('mobile-menu');
  if (!menu || !toggle) return;
  menu.classList.remove('open');
  menu.hidden = true;
  menu.setAttribute('aria-hidden', 'true');
  toggle.setAttribute('aria-expanded', 'false');
}

document.getElementById('menu-toggle')?.addEventListener('click', function () {
  const menu   = document.getElementById('mobile-menu');
  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    closeMobileMenu();
  } else {
    menu.classList.add('open');
    menu.hidden = false;
    menu.setAttribute('aria-hidden', 'false');
    this.setAttribute('aria-expanded', 'true');
  }
});

// --- Navigation click delegation -----------------------------------------------

document.addEventListener('click', function (e) {
  const link = e.target.closest('[data-page]');
  if (link) {
    e.preventDefault();
    router(link.dataset.page);
  }
});

// --- Reveal-on-scroll (Theory of Change, Mandate) --------------------------------

const revealObserver = ('IntersectionObserver' in window)
  ? new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('in-view');
      });
    }, { threshold: 0.15 })
  : null;

function initReveal() {
  if (!revealObserver) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
    return;
  }
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

// --- Gallery rendering ---------------------------------------------------------

function renderGallery(containerId, images, galleryKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = images.map((img, i) => `
    <div class="gallery-thumb"
         role="button" tabindex="0"
         aria-label="${img.alt}"
         onclick="openLightbox('${galleryKey}', ${i})"
         onkeydown="if(event.key==='Enter'||event.key===' '){openLightbox('${galleryKey}',${i});}">
      <img src="${img.src}" alt="${img.alt}" loading="lazy" width="300" height="300" />
    </div>
  `).join('');
}

// --- Tab switcher --------------------------------------------------------------

function switchTab(tabName) {
  const tabs = ['uttandhra', 'formation'];
  tabs.forEach(t => {
    const panel = document.getElementById(`${t}-gallery`);
    const btn   = document.getElementById(`tab-${t}`);
    const isActive = t === tabName;

    btn?.classList.toggle('active', isActive);
    btn?.setAttribute('aria-selected', String(isActive));

    if (panel) {
      panel.hidden = !isActive;
      panel.classList.toggle('tab-active', isActive);
    }
  });
}

// --- Lightbox ------------------------------------------------------------------

function openLightbox(galleryKey, index) {
  lightboxImages = galleries[galleryKey] || [];
  lightboxIndex  = index;
  document.body.style.overflow = 'hidden';
  document.getElementById('lightbox').classList.add('open');
  showLightboxImage();
  document.getElementById('lightbox-close')?.focus();
}

function showLightboxImage() {
  const img     = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');
  const current = lightboxImages[lightboxIndex];
  if (!current || !img) return;
  img.src = current.src;
  img.alt = current.alt;
  if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function prevImage() {
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  showLightboxImage();
}

function nextImage() {
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  showLightboxImage();
}

// Keyboard navigation
document.addEventListener('keydown', function (e) {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox?.classList.contains('open')) return;
  if (e.key === 'Escape')      closeLightbox();
  if (e.key === 'ArrowLeft')   prevImage();
  if (e.key === 'ArrowRight')  nextImage();
});

// Backdrop click closes
document.getElementById('lightbox')?.addEventListener('click', function (e) {
  if (e.target === this) closeLightbox();
});

// --- Modal controller (Join Us / Member Login) -----------------------------------

let activeModal      = null;
let lastFocusedEl    = null;
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  closeMobileMenu();
  lastFocusedEl = document.activeElement;
  activeModal = modal;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const first = modal.querySelector(FOCUSABLE);
  if (first) setTimeout(() => first.focus(), 30);
  if (window.lucide) lucide.createIcons();
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  activeModal = null;
  if (lastFocusedEl) { lastFocusedEl.focus(); lastFocusedEl = null; }
}

function openJoin()  { openModal('join-modal'); }
function closeJoin() { closeModal('join-modal'); }
function openLogin()  { openModal('login-modal'); }
function closeLogin() { closeModal('login-modal'); }

// Backdrop click + ESC + focus trap for whichever modal is open
['join-modal', 'login-modal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', function (e) {
    if (e.target === this) closeModal(id);
  });
});

document.addEventListener('keydown', function (e) {
  if (!activeModal) return;
  if (e.key === 'Escape') { closeModal(activeModal.id); return; }
  if (e.key === 'Tab') {
    const items = Array.from(activeModal.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// --- Field validation helpers ----------------------------------------------------

function toggleErr(input, errEl, hasError) {
  input.classList.toggle('field-error', hasError);
  errEl?.classList.toggle('show', hasError);
}

// --- Join Us form ----------------------------------------------------------------

(function initJoinForm() {
  const form = document.getElementById('join-form');
  if (!form) return;
  const success = document.getElementById('join-success');
  const submit  = document.getElementById('jf-submit');

  const fields = {
    name:     { el: document.getElementById('jf-name'),     err: document.getElementById('jerr-name'),     validate: v => v.trim().length >= 2 },
    email:    { el: document.getElementById('jf-email'),    err: document.getElementById('jerr-email'),    validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
    mobile:   { el: document.getElementById('jf-mobile'),   err: document.getElementById('jerr-mobile'),   validate: v => /^[6-9]\d{9}$/.test(v.trim()) },
    district: { el: document.getElementById('jf-district'), err: document.getElementById('jerr-district'), validate: v => v.trim() !== '' },
    category: { el: document.getElementById('jf-category'), err: document.getElementById('jerr-category'), validate: v => v.trim() !== '' },
  };

  // restrict mobile to digits
  fields.mobile.el.addEventListener('input', () => {
    fields.mobile.el.value = fields.mobile.el.value.replace(/\D/g, '').slice(0, 10);
  });

  for (const [, f] of Object.entries(fields)) {
    f.el.addEventListener('input', () => { if (f.validate(f.el.value)) toggleErr(f.el, f.err, false); });
    f.el.addEventListener('change', () => { if (f.validate(f.el.value)) toggleErr(f.el, f.err, false); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true, firstBad = null;
    for (const [, f] of Object.entries(fields)) {
      const ok = f.validate(f.el.value);
      toggleErr(f.el, f.err, !ok);
      if (!ok && !firstBad) firstBad = f.el;
      if (!ok) valid = false;
    }
    if (!valid) { firstBad?.focus(); return; }

    const payload = {
      name:     fields.name.el.value.trim(),
      email:    fields.email.el.value.trim(),
      mobile:   fields.mobile.el.value.trim(),
      district: fields.district.el.value,
      category: fields.category.el.value,
      purpose:  document.getElementById('jf-purpose').value.trim(),
    };
    // TODO: wire to backend API (member registration endpoint)
    console.log('MALGOA membership application:', payload);

    form.style.display = 'none';
    success.classList.add('show');
    success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();

// --- Member Login form -----------------------------------------------------------

(function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const email = { el: document.getElementById('lf-email'),    err: document.getElementById('lerr-email'),    validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) };
  const pass  = { el: document.getElementById('lf-password'), err: document.getElementById('lerr-password'), validate: v => v.trim().length >= 1 };

  [email, pass].forEach(f => f.el.addEventListener('input', () => { if (f.validate(f.el.value)) toggleErr(f.el, f.err, false); }));

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true, firstBad = null;
    [email, pass].forEach(f => {
      const ok = f.validate(f.el.value);
      toggleErr(f.el, f.err, !ok);
      if (!ok && !firstBad) firstBad = f.el;
      if (!ok) valid = false;
    });
    if (!valid) { firstBad?.focus(); return; }

    // TODO: wire to auth endpoint
    console.log('MALGOA member login attempt:', { email: email.el.value.trim(), password: '******' });
  });
})();

// --- Contact form --------------------------------------------------------------

(function initContactForm() {
  const form    = document.getElementById('contact-form');
  const result  = document.getElementById('form-result');
  const submit  = document.getElementById('cf-submit');
  if (!form) return;

  const fields = {
    name:    { el: document.getElementById('cf-name'),    err: document.getElementById('err-name'),    validate: v => v.trim().length >= 2 },
    email:   { el: document.getElementById('cf-email'),   err: document.getElementById('err-email'),   validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
    subject: { el: document.getElementById('cf-subject'), err: document.getElementById('err-subject'), validate: v => v.trim().length >= 2 },
    message: { el: document.getElementById('cf-message'), err: document.getElementById('err-message'), validate: v => v.trim().length >= 10 },
  };

  function setFieldError(key, hasError) {
    const f = fields[key];
    f.el.classList.toggle('field-error', hasError);
    f.err.classList.toggle('show', hasError);
  }

  function validateAll() {
    let valid = true;
    for (const [key, f] of Object.entries(fields)) {
      const ok = f.validate(f.el.value);
      setFieldError(key, !ok);
      if (!ok && valid) { f.el.focus(); valid = false; }
    }
    return valid;
  }

  // Live clear on input
  for (const [key, f] of Object.entries(fields)) {
    f.el.addEventListener('input', () => {
      if (f.validate(f.el.value)) setFieldError(key, false);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    result.className = '';
    result.textContent = '';

    if (!validateAll()) return;

    submit.disabled = true;
    submit.textContent = 'Sending...';

    // TODO: Replace this simulation with a real submission (EmailJS, Formspree, or backend API)
    setTimeout(() => {
      result.className = 'success';
      result.textContent = 'Thank you! Your message has been received. We will get back to you shortly.';
      form.reset();
      submit.disabled = false;
      submit.textContent = 'Send Message';
    }, 1200);
  });
})();

// --- Scroll nav shadow ---------------------------------------------------------

window.addEventListener('scroll', function () {
  document.getElementById('main-nav')?.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });

// --- Splash --------------------------------------------------------------------

window.addEventListener('load', function () {
  setTimeout(() => {
    document.getElementById('splash')?.classList.add('fade-out');
  }, 1800);
});

// --- Init ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
  if (window.lucide) lucide.createIcons();

  renderGallery('uttandhra-gallery', uttandhraImages, 'uttandhra');
  renderGallery('formation-gallery',  formationImages,  'formation');

  switchTab('uttandhra');
  initReveal();

  // Deep-link support: open the section named in the URL hash, else Home
  const hash = location.hash.slice(1);
  router(hash && document.getElementById(hash)?.classList.contains('page-section') ? hash : 'home');
  if (hash === 'join')  openJoin();
  if (hash === 'login') openLogin();
});

// --- Hidden admin portal: triggered by URL hash -----------------------
// Admins access the login modal by visiting yoursite.com/#admin-portal
// or appending #admin-portal to any page URL.
function checkAdminHash() {
  if (window.location.hash === '#admin-portal' || window.location.hash === '#member-login') {
    if (typeof openLogin === 'function') {
      openLogin();
      // Clear the hash from URL so it's not bookmarkable as login-open state
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }
}

// Run on page load and whenever hash changes
window.addEventListener('DOMContentLoaded', checkAdminHash);
window.addEventListener('hashchange', checkAdminHash);

// --- Heading reveal animation (fade/slide settle-in) ----
const headingRevealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      headingRevealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('h1, h2').forEach(el => {
    el.classList.add('fraunces-reveal');
    headingRevealObserver.observe(el);
  });
});

// --- Animated stat counter -------------------------------------
function animateCounter(el, target, duration = 1800) {
  const start = 0;
  const startTime = performance.now();
  const isInt = Number.isInteger(target);
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = start + (target - start) * eased;
    el.textContent = isInt ? Math.floor(value).toLocaleString('en-IN') : value.toFixed(1);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = isInt ? target.toLocaleString('en-IN') : target.toFixed(1);
  }
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.animated) {
      const target = parseFloat(entry.target.dataset.target);
      entry.target.dataset.animated = '1';
      animateCounter(entry.target, target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.stat-counter').forEach(el => counterObserver.observe(el));
});

// --- Scroll-triggered section reveals (reveal-up / reveal-stagger) --
const revealUpObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealUpObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reveal-up, .reveal-stagger').forEach(el => revealUpObserver.observe(el));
});

// --- Theory of Change: interactive generation selector --
document.addEventListener('DOMContentLoaded', () => {
  const cards = Array.from(document.querySelectorAll('.toc-card'));
  const streams = Array.from(document.querySelectorAll('.toc-stream'));
  if (!cards.length) return;

  function clearSelection() {
    cards.forEach(c => { c.classList.remove('is-active'); c.setAttribute('aria-pressed', 'false'); });
    streams.forEach(s => s.classList.remove('pop', 'dim'));
  }

  function selectStream(stream) {
    cards.forEach(c => {
      const on = c.dataset.stream === stream;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    streams.forEach(s => {
      const on = s.dataset.stream === stream;
      s.classList.toggle('pop', on);
      s.classList.toggle('dim', !on);
    });
  }

  cards.forEach(card => {
    const activate = () => {
      if (card.classList.contains('is-active')) clearSelection();
      else selectStream(card.dataset.stream);
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });
});
