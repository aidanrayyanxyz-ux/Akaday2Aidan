const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Only hide "reveal" elements once this script is actually running,
// so the page stays readable if script.js fails to load.
root.classList.add('js');

/* ---------- Mobile menu ---------- */
const menuIcon = document.querySelector('#menu-icon');
const navbar = document.querySelector('.navbar');
const navLinks = document.querySelectorAll('.navbar a');

function closeMenu() {
  menuIcon.classList.remove('bx-x');
  navbar.classList.remove('active');
}

menuIcon.addEventListener('click', () => {
  menuIcon.classList.toggle('bx-x');
  navbar.classList.toggle('active');
});

navLinks.forEach((link) => link.addEventListener('click', closeMenu));

/* ---------- Profile photo fallback (shows until profile.jpg exists) ---------- */
const profileImg = document.querySelector('.home-img img');
if (profileImg) {
  profileImg.addEventListener(
    'error',
    () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
        '<rect width="400" height="400" fill="#1f2740"/>' +
        '<circle cx="200" cy="155" r="70" fill="#00eeff" opacity="0.85"/>' +
        '<path d="M60 400c0-86 62-140 140-140s140 54 140 140z" fill="#00eeff" opacity="0.85"/>' +
        '<text x="200" y="385" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#0b1020">add profile.jpg</text>' +
        '</svg>';
      profileImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    },
    { once: true }
  );
}

/* ---------- Cached layout measurements (avoid reading layout on every scroll) ---------- */
const sections = [...document.querySelectorAll('section[id]')];
const header = document.querySelector('.header');
const progressBar = document.querySelector('.scroll-progress');
const gradient = document.querySelector('.bg-gradient');

let maxScroll = 0;
let sectionTops = [];

function measure() {
  maxScroll = Math.max(root.scrollHeight - window.innerHeight, 0);
  sectionTops = sections.map((s) => s.offsetTop);
}

measure();
window.addEventListener('load', measure);
if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
window.addEventListener('resize', measure);

/* ---------- Scroll state ---------- */
const state = {
  scrollTarget: 0, scroll: 0,       // pixels
  bgTarget: 0, bg: 0,               // 0..1 page progress
  mouseX: 0, mouseY: 0,             // -1..1 target
  mx: 0, my: 0,                     // smoothed
  glowTX: window.innerWidth / 2, glowTY: window.innerHeight / 2,
  glowX: window.innerWidth / 2, glowY: window.innerHeight / 2,
};

function setGradient(progress) {
  // The gradient layer is 400vh tall; sliding it with transform runs on the GPU
  gradient.style.transform = `translate3d(0, ${(-progress * 3 * window.innerHeight).toFixed(1)}px, 0)`;
}

function onScroll() {
  const y = window.scrollY;
  const progress = maxScroll > 0 ? Math.min(Math.max(y / maxScroll, 0), 1) : 0;

  state.scrollTarget = y;
  state.bgTarget = progress;

  header.classList.toggle('sticky', y > 60);
  progressBar.style.transform = `scaleX(${progress})`;

  let current = sections[0].id;
  for (let i = 0; i < sections.length; i++) {
    if (y >= sectionTops[i] - 200) current = sections[i].id;
  }
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });

  if (navbar.classList.contains('active')) closeMenu();

  if (reduceMotion) setGradient(progress);
}

window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- Cursor tracking ---------- */
window.addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType !== 'mouse') return;
    state.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    state.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    state.glowTX = e.clientX;
    state.glowTY = e.clientY;
  },
  { passive: true }
);

/* ---------- Smooth animation loop (only touches the DOM while something is moving) ---------- */
const shapes = [...document.querySelectorAll('.shape')];
const homeImg = document.querySelector('.home-img');
const glow = document.querySelector('.cursor-glow');
let settled = false;

function render() {
  setGradient(state.bg);

  // Glows drift while scrolling and lean toward the cursor
  shapes.forEach((s) => {
    const d = parseFloat(s.dataset.depth) || 1;
    const p = parseFloat(s.dataset.phase) || 0;
    const x = Math.cos(state.scroll / 900 + p) * d * 160 + state.mx * d * 60;
    const y = Math.sin(state.scroll / 700 + p) * d * 140 + state.my * d * 60;
    s.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  });

  // Photo slides gently left/right with the cursor
  if (homeImg) {
    homeImg.style.transform = `translate3d(${(state.mx * 28).toFixed(1)}px, ${(state.my * 18).toFixed(1)}px, 0)`;
  }

  if (glow) {
    glow.style.transform = `translate3d(${state.glowX.toFixed(1)}px, ${state.glowY.toFixed(1)}px, 0)`;
  }
}

function frame() {
  state.scroll += (state.scrollTarget - state.scroll) * 0.08;
  state.bg += (state.bgTarget - state.bg) * 0.08;
  state.mx += (state.mouseX - state.mx) * 0.06;
  state.my += (state.mouseY - state.my) * 0.06;
  state.glowX += (state.glowTX - state.glowX) * 0.14;
  state.glowY += (state.glowTY - state.glowY) * 0.14;

  const moving =
    Math.abs(state.scrollTarget - state.scroll) > 0.1 ||
    Math.abs(state.bgTarget - state.bg) > 0.0001 ||
    Math.abs(state.mouseX - state.mx) > 0.001 ||
    Math.abs(state.mouseY - state.my) > 0.001 ||
    Math.abs(state.glowTX - state.glowX) > 0.1 ||
    Math.abs(state.glowTY - state.glowY) > 0.1;

  if (moving || !settled) {
    render();
    settled = !moving;
  }

  requestAnimationFrame(frame);
}

if (!reduceMotion) requestAnimationFrame(frame);

/* ---------- Reveal on scroll (staggered) ---------- */
document.querySelectorAll('.stagger').forEach((group) => {
  [...group.children].forEach((child, i) => child.style.setProperty('--d', `${i * 0.1}s`));
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('visible');
      el.querySelectorAll('.bar-fill').forEach((bar) => {
        bar.style.width = `${bar.dataset.level}%`;
      });
      // Once the entrance is done, hand the element back to its normal hover transitions
      setTimeout(() => el.classList.add('revealed'), 1600);
      revealObserver.unobserve(el);
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
);

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

/* ---------- 3D tilt on hobby cards ---------- */
document.querySelectorAll('.hobby-inner').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduceMotion) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    card.style.transform = `rotateY(${((x - 0.5) * 14).toFixed(2)}deg) rotateX(${((0.5 - y) * 14).toFixed(2)}deg) translateY(-0.8rem)`;
    card.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    card.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.transform = '';
  });
});

/* ---------- Hobby ticker: clone the group so the loop is seamless ---------- */
const marqueeTrack = document.querySelector('.marquee-track');
if (marqueeTrack) {
  const group = marqueeTrack.querySelector('.marquee-group');
  for (let i = 0; i < 3; i++) {
    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    marqueeTrack.appendChild(clone);
  }
}

/* ---------- Typing text rotation ---------- */
const rolesByLang = {
  en: ['Student', 'Researcher', 'Gamer', 'Home Cook', 'Traveler'],
  id: ['Pelajar', 'Peneliti', 'Gamer', 'Juru Masak', 'Traveler'],
};
let roles = rolesByLang.en;
let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typingElement = document.querySelector('.multiple-text');

function typeEffect() {
  if (!typingElement) return;

  const currentRole = roles[roleIndex];
  if (isDeleting) {
    charIndex--;
  } else {
    charIndex++;
  }
  typingElement.textContent = currentRole.substring(0, charIndex);

  let speed = isDeleting ? 60 : 120;

  if (!isDeleting && charIndex === currentRole.length) {
    speed = 1500;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    roleIndex = (roleIndex + 1) % roles.length;
    speed = 400;
  }

  setTimeout(typeEffect, speed);
}

document.addEventListener('DOMContentLoaded', typeEffect);

/* ---------- Contact form feedback ---------- */
const contactForm = document.getElementById('contact-form');
const formStatus = document.querySelector('.form-status');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    formStatus.textContent = t('form_ok');
    contactForm.reset();
    setTimeout(() => {
      formStatus.textContent = '';
    }, 5000);
  });
}

/* ---------- Tiny localStorage helper (never throws) ---------- */
const store = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  },
};

/* ---------- Language switch (English / Indonesia) ---------- */
const translations = {
  en: {
    page_title: 'Aidan Rayyan | Profile',
    nav_about: 'About me', nav_skills: 'Skills', nav_hobby: 'Hobby', nav_contact: 'Contact',
    lang_aria: 'Switch language to Indonesian',
    music_play: 'Play music', music_pause: 'Pause music',
    music_file_missing: "musicgue.mp3 was not found or can't be played, so the built-in ambient music is used instead.",
    music_blocked: 'Your browser blocked the sound. Click the speaker button to play.',
    hero_hello: "Hello, It's Me",
    hero_and: "And I'm a",
    hero_p: 'A student who loves learning new things, working carefully with data, and exploring the world — one game, one recipe and one trip at a time.',
    btn_contact: 'Contact Me', btn_skills: 'My Skills',
    skills_heading: 'My <span>Skills</span>',
    soft_title: 'Soft Skills', hard_title: 'Hard Skills',
    soft_adapt: 'Adaptability', soft_resp: 'Responsibility', soft_team: 'Teamwork',
    soft_flex: 'Flexibility', soft_open: 'Open-Mindedness', soft_patience: 'Patience', soft_humility: 'Humility',
    hard_data: 'Data entry',
    hobby_heading: 'My <span>Hobbies</span>',
    hobby1_title: 'Gaming', hobby1_sub: 'Bermain Game',
    hobby1_desc: 'Relaxing, sharpening strategy, and having fun with friends.',
    hobby1_t1: 'Strategy', hobby1_t2: 'Co-op', hobby1_t3: 'Chill',
    hobby2_title: 'Research', hobby2_sub: 'Riset & Penelitian',
    hobby2_desc: 'Digging into topics, comparing sources, and finding out how things really work.',
    hobby2_t1: 'Curious', hobby2_t2: 'Analytical', hobby2_t3: 'Detail',
    hobby3_title: 'Cooking', hobby3_sub: 'Memasak',
    hobby3_desc: 'Trying new recipes, experimenting with flavours, and sharing good food.',
    hobby3_t1: 'Recipes', hobby3_t2: 'Flavour', hobby3_t3: 'Creative',
    hobby4_title: 'Traveling', hobby4_sub: 'Jalan-Jalan',
    hobby4_desc: 'Discovering new places, cultures and stories beyond the daily routine.',
    hobby4_t1: 'Adventure', hobby4_t2: 'Culture', hobby4_t3: 'Views',
    contact_heading: 'Contact <span>Me!</span>',
    contact_sub: 'Find me on',
    ph_name: 'Full Name', ph_email: 'Email Address', ph_phone: 'Mobile Number',
    ph_subject: 'Email Subject', ph_message: 'Your Message',
    btn_send: 'Send Message',
    form_ok: 'Thank you! Your message has been sent.',
    footer_text: 'Copyright © 2026 by Aidan Rayyan | All Rights Reserved.',
  },
  id: {
    page_title: 'Aidan Rayyan | Profil',
    nav_about: 'Tentang Saya', nav_skills: 'Keahlian', nav_hobby: 'Hobi', nav_contact: 'Kontak',
    lang_aria: 'Ganti bahasa ke Inggris',
    music_play: 'Putar musik', music_pause: 'Jeda musik',
    music_file_missing: 'File musicgue.mp3 tidak ditemukan atau tidak bisa diputar, jadi dipakai musik ambient bawaan.',
    music_blocked: 'Browser memblokir suara. Klik tombol speaker untuk memutar.',
    hero_hello: 'Halo, Saya',
    hero_and: 'Dan saya seorang',
    hero_p: 'Seorang pelajar yang suka belajar hal baru, teliti dalam mengolah data, dan menjelajahi dunia — satu game, satu resep, dan satu perjalanan sekaligus.',
    btn_contact: 'Hubungi Saya', btn_skills: 'Keahlian Saya',
    skills_heading: 'Keahlian <span>Saya</span>',
    soft_title: 'Soft Skills', hard_title: 'Hard Skills',
    soft_adapt: 'Adaptabilitas', soft_resp: 'Tanggung Jawab', soft_team: 'Kerja Sama Tim',
    soft_flex: 'Fleksibilitas', soft_open: 'Berpikiran Terbuka', soft_patience: 'Kesabaran', soft_humility: 'Kerendahan Hati',
    hard_data: 'Entri Data',
    hobby_heading: 'Hobi <span>Saya</span>',
    hobby1_title: 'Bermain Game', hobby1_sub: 'Gaming',
    hobby1_desc: 'Bersantai, mengasah strategi, dan bersenang-senang bersama teman.',
    hobby1_t1: 'Strategi', hobby1_t2: 'Kerja sama', hobby1_t3: 'Santai',
    hobby2_title: 'Riset & Penelitian', hobby2_sub: 'Research',
    hobby2_desc: 'Menggali berbagai topik, membandingkan sumber, dan mencari tahu cara kerja sesuatu yang sebenarnya.',
    hobby2_t1: 'Penasaran', hobby2_t2: 'Analitis', hobby2_t3: 'Teliti',
    hobby3_title: 'Memasak', hobby3_sub: 'Cooking',
    hobby3_desc: 'Mencoba resep baru, bereksperimen dengan rasa, dan berbagi makanan enak.',
    hobby3_t1: 'Resep', hobby3_t2: 'Cita rasa', hobby3_t3: 'Kreatif',
    hobby4_title: 'Traveling', hobby4_sub: 'Exploring',
    hobby4_desc: 'Menemukan tempat, budaya, dan cerita baru di luar rutinitas harian.',
    hobby4_t1: 'Petualangan', hobby4_t2: 'Budaya', hobby4_t3: 'Pemandangan',
    contact_heading: 'Hubungi <span>Saya!</span>',
    contact_sub: 'Temukan saya di',
    ph_name: 'Nama Lengkap', ph_email: 'Alamat Email', ph_phone: 'Nomor HP',
    ph_subject: 'Subjek Pesan', ph_message: 'Pesan Kamu',
    btn_send: 'Kirim Pesan',
    form_ok: 'Terima kasih! Pesan kamu sudah terkirim.',
    footer_text: 'Hak Cipta © 2026 oleh Aidan Rayyan | Seluruh Hak Dilindungi.',
  },
};

const langBtn = document.getElementById('lang-toggle');
const langLabel = langBtn.querySelector('.lang-label');
const musicBtn = document.getElementById('music-toggle');
const musicIcon = musicBtn.querySelector('i');

let lang = 'en';

function t(key) {
  const dict = translations[lang] || translations.en;
  return dict[key] ?? translations.en[key] ?? key;
}

function applyLanguage(next) {
  lang = next;
  root.lang = next;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  document.title = t('page_title');
  langLabel.textContent = next.toUpperCase();
  langBtn.setAttribute('aria-label', t('lang_aria'));
  langBtn.title = t('lang_aria');

  // Restart the typing effect in the new language
  roles = rolesByLang[next];
  roleIndex = 0;
  charIndex = 0;
  isDeleting = false;

  updateMusicUI();
  store.set('lang', next);
}

langBtn.addEventListener('click', () => applyLanguage(lang === 'en' ? 'id' : 'en'));

/* ---------- Small on-screen message (used by the music player) ---------- */
let toastTimer = null;

function showToast(key) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = t(key);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 8000);
}

/* ---------- Background music (your musicgue.mp3, or generated ambient music as a fallback) ---------- */
const music = (() => {
  const VOLUME = 0.6;
  const CHORD_TIME = 8; // seconds per chord
  const chords = [
    [130.81, 164.81, 196.0, 246.94], // Cmaj7
    [110.0, 130.81, 164.81, 196.0],  // Am7
    [87.31, 110.0, 130.81, 164.81],  // Fmaj7
    [98.0, 146.83, 196.0, 246.94],   // Gsus
  ];
  const sparkles = [523.25, 587.33, 659.25, 783.99, 880.0]; // C major pentatonic

  let ctx = null;
  let master = null;
  let bus = null;
  let chordTimer = null;
  let sparkleTimer = null;
  let step = 0;
  let playing = false;
  let mode = null; // 'file' (your own musicgue.mp3) or 'synth' (generated music)
  let warnedMissing = false;

  // Your own song: put musicgue.mp3 next to index.html (same folder)
  const FILE_VOLUME = 1;   // 0 (silent) to 1 (loudest)
  const START_AT = 18;     // seconds to skip at the start of the song
  const fileAudio = new Audio();
  let fileState = 'unknown';
  let fadeTimer = null;
  fileAudio.loop = false; // looping is handled below so every round also skips the intro
  fileAudio.preload = 'metadata';
  fileAudio.volume = 0;
  fileAudio.addEventListener('loadedmetadata', () => { fileState = 'ok'; });
  fileAudio.addEventListener('error', () => { fileState = 'missing'; });
  // Start (and restart on every loop) at START_AT seconds, skipping the intro.
  // If the song is shorter than that, it simply starts from the beginning.
  function getStartAt() {
    const d = fileAudio.duration;
    return Number.isFinite(d) && d <= START_AT + 1 ? 0 : START_AT;
  }

  fileAudio.addEventListener('ended', () => {
    if (!playing || mode !== 'file') return;
    fileAudio.currentTime = getStartAt();
    fileAudio.play().catch(() => {});
  });

  fileAudio.src = 'musicgue.mp3';

  function fadeFile(target, ms, onDone) {
    clearInterval(fadeTimer);
    const from = fileAudio.volume;
    const start = performance.now();
    fadeTimer = setInterval(() => {
      const p = Math.min((performance.now() - start) / ms, 1);
      fileAudio.volume = from + (target - from) * p;
      if (p >= 1) {
        clearInterval(fadeTimer);
        if (onDone) onDone();
      }
    }, 50);
  }

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;

    bus = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2200;

    // Soft echo for a spacious feel
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.6;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.4;
    const wet = ctx.createGain();
    wet.gain.value = 0.45;

    bus.connect(lowpass);
    bus.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(lowpass);
    lowpass.connect(master);
    master.connect(ctx.destination);
    return true;
  }

  function playChord(time, freqs) {
    freqs.forEach((freq) => {
      [-6, 6].forEach((detune) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.05, time + 2.5);
        gain.gain.setValueAtTime(0.05, time + CHORD_TIME - 0.5);
        gain.gain.linearRampToValueAtTime(0.0001, time + CHORD_TIME + 3);
        osc.connect(gain);
        gain.connect(bus);
        osc.start(time);
        osc.stop(time + CHORD_TIME + 3.2);
      });
    });

    // Warm bass note one octave below the root
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.value = freqs[0] / 2;
    bassGain.gain.setValueAtTime(0.0001, time);
    bassGain.gain.linearRampToValueAtTime(0.1, time + 2.5);
    bassGain.gain.setValueAtTime(0.1, time + CHORD_TIME - 0.5);
    bassGain.gain.linearRampToValueAtTime(0.0001, time + CHORD_TIME + 3);
    bass.connect(bassGain);
    bassGain.connect(bus);
    bass.start(time);
    bass.stop(time + CHORD_TIME + 3.2);
  }

  function playSparkle(time) {
    const freq = sparkles[Math.floor(Math.random() * sparkles.length)];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.14, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 2.2);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(time);
    osc.stop(time + 2.4);
  }

  function scheduleChord() {
    playChord(ctx.currentTime + 0.05, chords[step % chords.length]);
    step++;
  }

  function sparkleLoop() {
    playSparkle(ctx.currentTime + 0.02);
    sparkleTimer = setTimeout(sparkleLoop, 1800 + Math.random() * 2600);
  }

  function startTimers() {
    stopTimers();
    scheduleChord();
    chordTimer = setInterval(scheduleChord, CHORD_TIME * 1000);
    sparkleLoop();
  }

  function stopTimers() {
    clearInterval(chordTimer);
    clearTimeout(sparkleTimer);
  }

  async function play() {
    if (playing) return;
    playing = true;

    if (fileState !== 'missing') {
      // Try your own song first (musicgue.mp3)
      mode = 'file';
      try {
        if (fileAudio.currentTime < getStartAt()) fileAudio.currentTime = getStartAt();
        await fileAudio.play();
        fileState = 'ok';
        fadeFile(FILE_VOLUME, 1500);
        return;
      } catch (err) {
        if (err && err.name === 'NotAllowedError') {
          // The browser wants a click first
          playing = false;
          mode = null;
          showToast('music_blocked');
          return;
        }
        fileState = 'missing';
        console.warn('musicgue.mp3 could not be played:', err, fileAudio.error);
      }
    }

    // No usable musicgue.mp3: fall back to the generated ambient music
    if (!warnedMissing) {
      warnedMissing = true;
      showToast('music_file_missing');
    }
    mode = 'synth';
    if (!init()) {
      playing = false;
      return;
    }
    try {
      await ctx.resume(); // must be called from a click / key press
    } catch {
      playing = false;
      return;
    }
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(VOLUME, now + 2);
    startTimers();
  }

  function pause() {
    if (!playing) return;
    playing = false;
    if (mode === 'file') {
      fadeFile(0, 600, () => {
        if (!playing) fileAudio.pause();
      });
      return;
    }
    if (!ctx) return;
    stopTimers();
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.8);
    setTimeout(() => {
      if (!playing) ctx.suspend();
    }, 900);
  }

  // Silence the music while the tab is in the background
  document.addEventListener('visibilitychange', () => {
    if (!playing) return;
    if (mode === 'file') {
      if (document.hidden) fileAudio.pause();
      else fileAudio.play().catch(() => {});
      return;
    }
    if (!ctx) return;
    if (document.hidden) {
      stopTimers();
      ctx.suspend();
    } else {
      ctx.resume().then(startTimers);
    }
  });

  return { play, pause, isPlaying: () => playing };
})();

let musicEverStarted = false;

function updateMusicUI() {
  const on = music.isPlaying();
  if (on) musicEverStarted = true;
  musicBtn.classList.toggle('playing', on);
  musicBtn.classList.toggle('hint', !on && !musicEverStarted);
  musicBtn.setAttribute('aria-pressed', String(on));
  musicBtn.setAttribute('aria-label', t(on ? 'music_pause' : 'music_play'));
  musicBtn.title = t(on ? 'music_pause' : 'music_play');
  musicIcon.className = on ? 'bx bx-volume-full' : 'bx bx-volume-mute';
}

musicBtn.addEventListener('click', async () => {
  if (music.isPlaying()) {
    music.pause();
    store.set('music', 'off');
    updateMusicUI();
  } else {
    store.set('music', 'on');
    const started = music.play();
    updateMusicUI();
    await started;
    updateMusicUI();
  }
});

// Browsers block sound until the visitor interacts, so the music starts
// on the first click / key press / tap (unless they muted it before).
const firstInteractionEvents = ['click', 'keydown', 'touchend'];

function autoStartMusic(e) {
  firstInteractionEvents.forEach((ev) => document.removeEventListener(ev, autoStartMusic, true));
  if (store.get('music') === 'off') return;
  if (e.target && e.target.closest && e.target.closest('#music-toggle')) return;
  const started = music.play();
  updateMusicUI();
  started.then(updateMusicUI);
}

firstInteractionEvents.forEach((ev) => document.addEventListener(ev, autoStartMusic, true));

/* ---------- Start: pick saved language (or the browser's) ---------- */
const savedLang = store.get('lang');
const browserLang = (navigator.language || '').toLowerCase().startsWith('id') ? 'id' : 'en';
applyLanguage(translations[savedLang] ? savedLang : browserLang);

onScroll();