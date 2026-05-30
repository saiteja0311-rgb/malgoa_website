// ─── Gallery data ──────────────────────────────────────────────────────────────

const uttandhraImages = Array.from({ length: 40 }, (_, i) => ({
  src: `images/uttandhra-meet-${i + 1}.jpg`,
  alt: `Uttarandhra Meet 2025 — photo ${i + 1}`,
}));

const formationImages = Array.from({ length: 4 }, (_, i) => ({
  src: `images/gallery-${i + 1}.jpg`,
  alt: `MALGOA Formation Event — photo ${i + 1}`,
}));

const galleries = { uttandhra: uttandhraImages, formation: formationImages };

// ─── Lightbox state ────────────────────────────────────────────────────────────

let lightboxImages = [];
let lightboxIndex  = 0;

// ─── Router ────────────────────────────────────────────────────────────────────

function router(pageId) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageId);
  });

  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Replay reveal animations for the newly shown section
  if (target) {
    target.querySelectorAll('.reveal').forEach(el => el.classList.remove('in-view'));
    requestAnimationFrame(() => {
      target.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
    });
  }

  if (window.lucide) lucide.createIcons();
}

// ─── Mobile menu ───────────────────────────────────────────────────────────────

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

// ─── Navigation click delegation ───────────────────────────────────────────────

document.addEventListener('click', function (e) {
  const link = e.target.closest('[data-page]');
  if (link) {
    e.preventDefault();
    router(link.dataset.page);
  }
});

// ─── Reveal-on-scroll (Theory of Change, Mandate) ────────────────────────────────

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

// ─── Gallery rendering ─────────────────────────────────────────────────────────

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

// ─── Tab switcher ──────────────────────────────────────────────────────────────

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

// ─── Lightbox ──────────────────────────────────────────────────────────────────

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

// ─── Modal controller (Join Us / Member Login) ───────────────────────────────────

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

// ─── Field validation helpers ────────────────────────────────────────────────────

function toggleErr(input, errEl, hasError) {
  input.classList.toggle('field-error', hasError);
  errEl?.classList.toggle('show', hasError);
}

// ─── Join Us form ────────────────────────────────────────────────────────────────

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

// ─── Member Login form ───────────────────────────────────────────────────────────

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
    console.log('MALGOA member login attempt:', { email: email.el.value.trim(), password: '••••••' });
  });
})();

// ─── Contact form ──────────────────────────────────────────────────────────────

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
    submit.textContent = 'Sending…';

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

// ─── Scroll nav shadow ─────────────────────────────────────────────────────────

window.addEventListener('scroll', function () {
  document.getElementById('main-nav')?.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });

// ─── Splash ────────────────────────────────────────────────────────────────────

window.addEventListener('load', function () {
  setTimeout(() => {
    document.getElementById('splash')?.classList.add('fade-out');
  }, 1800);
});

// ─── Init ──────────────────────────────────────────────────────────────────────

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
