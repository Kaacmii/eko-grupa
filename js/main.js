/* ============================================================
   EKO GRUPA DDD PANČEVO — Glavni JavaScript
   Verzija: 1.0
   ============================================================ */

'use strict';

// ─── DOM helper ───────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ============================================================
   0. LATINICA / ĆIRILICA — transliteracija + toggle
   ============================================================ */

// Globalno stanje pisma — koriste ga i drugi moduli
const SCRIPT = { mode: localStorage.getItem('ekogr_script') || 'lat' };

// Vraća string u trenutnom pismu (koristi se za JS-generisane tekstove)
function t(str) {
  return SCRIPT.mode === 'cyr' ? latinToCyrillic(str) : str;
}

function latinToCyrillic(text) {
  // Digrams first, then singles
  const map = [
    ['lj','љ'],['nj','њ'],['dž','џ'],
    ['Lj','Љ'],['Nj','Њ'],['Dž','Џ'],
    ['LJ','Љ'],['NJ','Њ'],['DŽ','Џ'],
    ['č','ч'],['ć','ћ'],['đ','ђ'],['š','ш'],['ž','ж'],
    ['Č','Ч'],['Ć','Ћ'],['Đ','Ђ'],['Š','Ш'],['Ž','Ж'],
    ['a','а'],['b','б'],['c','ц'],['d','д'],['e','е'],
    ['f','ф'],['g','г'],['h','х'],['i','и'],['j','ј'],
    ['k','к'],['l','л'],['m','м'],['n','н'],['o','о'],
    ['p','п'],['r','р'],['s','с'],['t','т'],['u','у'],
    ['v','в'],['z','з'],
    ['A','А'],['B','Б'],['C','Ц'],['D','Д'],['E','Е'],
    ['F','Ф'],['G','Г'],['H','Х'],['I','И'],['J','Ј'],
    ['K','К'],['L','Л'],['M','М'],['N','Н'],['O','О'],
    ['P','П'],['R','Р'],['S','С'],['T','Т'],['U','У'],
    ['V','В'],['Z','З'],
  ];
  let r = text;
  for (const [l, c] of map) r = r.split(l).join(c);
  return r;
}

// Transliteriše sve tekstualne čvorove unutar zadatog elementa
function transliterateSubtree(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement?.tagName;
      if (['SCRIPT','STYLE','NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
      if (node.textContent.trim() === '') return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(n => { n.textContent = latinToCyrillic(n.textContent); });
}

const ScriptToggle = (function() {
  const textCache = []; // { node, lat, cyr }
  const attrCache = []; // { el, attr, lat, cyr }

  function collectStatic() {
    const skipAttrs = ['href','src','action','class','id','name','type','value'];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        const tag = parent?.tagName;
        if (['SCRIPT','STYLE','NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
        // Preskočiti email i tel linkove
        if (tag === 'A') {
          const href = (parent.getAttribute('href') || '');
          if (href.startsWith('mailto:') || href.startsWith('tel:')) return NodeFilter.FILTER_REJECT;
        }
        // Preskočiti dinamički sadržaj pest panela
        if (parent?.closest('#pest-panel-inner')) return NodeFilter.FILTER_REJECT;
        // Preskočiti sam toggle dugme
        if (parent?.id === 'script-toggle') return NodeFilter.FILTER_REJECT;
        if (node.textContent.trim() === '') return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      const lat = n.textContent;
      textCache.push({ node: n, lat, cyr: latinToCyrillic(lat) });
    }

    // Atributi — placeholder, aria-label, title
    $$('[placeholder],[aria-label],[title]').forEach(el => {
      if (el.id === 'script-toggle') return;
      ['placeholder','aria-label','title'].forEach(attr => {
        if (!el.hasAttribute(attr)) return;
        const lat = el.getAttribute(attr);
        attrCache.push({ el, attr, lat, cyr: latinToCyrillic(lat) });
      });
    });
  }

  function apply(toCyr) {
    SCRIPT.mode = toCyr ? 'cyr' : 'lat';
    textCache.forEach(({ node, lat, cyr }) => { node.textContent = toCyr ? cyr : lat; });
    attrCache.forEach(({ el, attr, lat, cyr }) => { el.setAttribute(attr, toCyr ? cyr : lat); });
    document.documentElement.lang = toCyr ? 'sr-Cyrl' : 'sr-Latn';
    localStorage.setItem('ekogr_script', SCRIPT.mode);

    const btn = $('#script-toggle');
    if (btn) {
      btn.textContent = toCyr ? 'Lat' : 'Ћир';
      btn.setAttribute('aria-label', toCyr ? 'Промени писмо на латиницу' : 'Промени писмо на ћирилицу');
    }
  }

  function init() {
    collectStatic();
    if (SCRIPT.mode === 'cyr') apply(true);

    const btn = $('#script-toggle');
    btn?.addEventListener('click', () => apply(SCRIPT.mode !== 'cyr'));
  }

  return { init };
})();

/* ============================================================
   1. NAVIGACIJA — sticky shrink + hamburger + scroll spy
   ============================================================ */
(function initNav() {
  const header    = $('#header');
  const hamburger = $('#hamburger');
  const navLinks  = $('.nav-links');
  const allNavLinks = $$('.nav-link');
  const sections  = $$('section[id], div[id]');

  // --- Sticky shrink pri scroll-u ---
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 50);

    // Back-to-top dugme
    const btt = $('#back-to-top');
    if (window.scrollY > 300) {
      btt.hidden = false;
    } else {
      btt.hidden = true;
    }

    // Scroll spy
    updateActiveNav();
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // --- Hamburger meni ---
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!isOpen));
      navLinks.classList.toggle('is-open', !isOpen);
      document.body.style.overflow = isOpen ? '' : '';
    });

    // Zatvori meni klikom na link
    navLinks.addEventListener('click', (e) => {
      if (e.target.classList.contains('nav-link')) {
        hamburger.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('is-open');
      }
    });

    // Zatvori klik van menija
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target)) {
        hamburger.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('is-open');
      }
    });
  }

  // --- Scroll Spy ---
  function updateActiveNav() {
    let current = '';
    sections.forEach(sec => {
      const top = sec.getBoundingClientRect().top;
      if (top <= 100) current = sec.id;
    });

    allNavLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  }

  // --- Smooth scroll za sve anchor linkove ---
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

/* ============================================================
   2. SCROLL ANIMACIJE — Intersection Observer
   ============================================================ */
(function initScrollAnimations() {
  const elements = $$('.animate-on-scroll');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });

  elements.forEach(el => observer.observe(el));
})();

/* ============================================================
   3. COUNT-UP ANIMACIJA za statistike
   ============================================================ */
(function initCountUp() {
  const counters = $$('.stat-number[data-target]');
  if (!counters.length) return;

  let hasRun = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasRun) {
        hasRun = true;
        counters.forEach(el => animateCount(el));
        observer.disconnect();
      }
    });
  }, { threshold: 0.5 });

  const statsSection = $('.stats-grid');
  if (statsSection) observer.observe(statsSection);

  function animateCount(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || (target >= 10 && target < 100 && !el.dataset.suffix ? '+' : '');
    const duration = 1600;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = current + (progress === 1 ? (el.dataset.suffix || '+') : '');
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }
})();

/* ============================================================
   4. TAB SISTEM — Usluge
   ============================================================ */
(function initTabs() {
  const tabBtns    = $$('.tab-btn');
  const tabPanels  = $$('.tab-content');
  if (!tabBtns.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('aria-controls');

      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });

      tabPanels.forEach(p => {
        p.classList.remove('active');
        p.hidden = true;
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const panel = document.getElementById(target);
      if (panel) {
        panel.classList.add('active');
        panel.hidden = false;

        // Aktiviraj animate-on-scroll elemente u novom tabu
        $$('.animate-on-scroll', panel).forEach(el => {
          if (!el.classList.contains('is-visible')) {
            setTimeout(() => el.classList.add('is-visible'), 80);
          }
        });
      }
    });
  });
})();

/* ============================================================
   5. ACCORDION — Usluge + ČPP
   ============================================================ */
(function initAccordions() {
  function setupAccordion(triggerSel) {
    const triggers = $$(triggerSel);
    triggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        const content = trigger.nextElementSibling;

        // Zatvori sve ostale u grupi
        const parent = trigger.closest('.accordion, .faq-list');
        if (parent) {
          $$('[aria-expanded="true"]', parent).forEach(t => {
            if (t !== trigger) {
              t.setAttribute('aria-expanded', 'false');
              t.nextElementSibling?.classList.remove('is-open');
            }
          });
        }

        trigger.setAttribute('aria-expanded', String(!isOpen));
        content?.classList.toggle('is-open', !isOpen);
      });
    });
  }

  setupAccordion('.accordion-trigger');
  setupAccordion('.faq-trigger');
})();

/* ============================================================
   6. GALERIJA — filter + lightbox
   ============================================================ */
(function initGallery() {
  const filterBtns = $$('.filter-btn');
  const galleryItems = $$('.gallery-item');
  const lightbox = $('#lightbox');
  const lightboxContent = $('#lightbox-content');
  const closeBtn = lightbox?.querySelector('.lightbox-close');
  const prevBtn  = lightbox?.querySelector('.lightbox-prev');
  const nextBtn  = lightbox?.querySelector('.lightbox-next');

  let currentIndex = 0;
  let visibleItems = [...galleryItems];

  // --- Filter ---
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      visibleItems = [];

      galleryItems.forEach(item => {
        const match = filter === 'all' || item.dataset.category === filter;
        item.classList.toggle('is-hidden', !match);
        if (match) visibleItems.push(item);
      });
    });
  });

  // --- Lightbox otvori ---
  galleryItems.forEach((item, i) => {
    const btn = item.querySelector('.gallery-item-btn');
    btn?.addEventListener('click', () => openLightbox(i));
  });

  function openLightbox(index) {
    currentIndex = index;
    showLightboxItem(index);
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lightbox.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  function showLightboxItem(index) {
    const item = galleryItems[index];
    if (!item || !lightboxContent) return;

    const placeholder = item.querySelector('.gallery-placeholder');
    if (placeholder) {
      lightboxContent.innerHTML = placeholder.innerHTML;
    }

    // Napravi SVG pun prikaz
    const svg = lightboxContent.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', 'auto');
    }
  }

  function navigate(dir) {
    currentIndex = (currentIndex + dir + galleryItems.length) % galleryItems.length;
    showLightboxItem(currentIndex);
  }

  closeBtn?.addEventListener('click', closeLightbox);
  prevBtn?.addEventListener('click', () => navigate(-1));
  nextBtn?.addEventListener('click', () => navigate(1));

  // Zatvori klikom na pozadinu
  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Tastatura
  document.addEventListener('keydown', (e) => {
    if (lightbox?.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
})();

/* ============================================================
   7. TESTIMONIJALI SLIDER — autoplay + touch/swipe
   ============================================================ */
(function initSlider() {
  const track  = $('#testimonials-track');
  const dotsContainer = $('#slider-dots');
  const prevBtn = $('#slider-prev');
  const nextBtn = $('#slider-next');

  if (!track) return;

  const cards = $$('.testimonial-card', track);
  if (!cards.length) return;

  let current = 0;
  let autoplayTimer;
  let touchStartX = 0;
  let touchEndX = 0;

  // Kreiraj tačkice
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Idi na utisak ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsContainer?.appendChild(dot);
  });

  function goTo(index) {
    current = (index + cards.length) % cards.length;
    track.style.transform = `translateX(-${current * 100}%)`;

    // Ažuriraj tačkice
    $$('.slider-dot', dotsContainer).forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });

    resetAutoplay();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);

  // Autoplay
  function startAutoplay() {
    autoplayTimer = setInterval(next, 5500);
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }

  startAutoplay();

  // Pauziraj pri hover-u
  const slider = $('.testimonials-slider');
  slider?.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
  slider?.addEventListener('mouseleave', startAutoplay);

  // Touch/swipe
  track.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
  }, { passive: true });
})();

/* ============================================================
   8. KONTAKT FORMA — validacija + success poruka
   ============================================================ */
(function initContactForm() {
  const FORMSPREE = 'https://formspree.io/f/xbdpdrnq';

  const form    = $('#contact-form');
  const success = $('#form-success');
  if (!form) return;

  // Sanitizacija — uklanja HTML tagove i višak razmaka
  function sanitize(str) {
    return str.trim().replace(/[<>]/g, '');
  }

  // Validacija jednog polja
  function validateField(input) {
    const errorEl = document.getElementById('error-' + input.id.replace('field-', ''));
    const val = sanitize(input.value);
    let msg = '';

    if (input.required && !val) {
      msg = t('Ovo polje je obavezno.');
    } else if (input.tagName === 'SELECT' && input.required && !val) {
      msg = t('Izaberite vrstu usluge.');
    } else if (input.type === 'tel' && val) {
      if (!/^[\d\s\+\-\/\(\)]{6,20}$/.test(val)) msg = t('Unesite ispravan broj telefona (npr. 063 123 4567).');
    } else if (input.type === 'email' && val) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) msg = t('Unesite ispravnu email adresu.');
    } else if (input.type === 'text' && input.required && val.length < 2) {
      msg = t('Unesite najmanje 2 karaktera.');
    }

    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.hidden = !msg;
    }
    input.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', !!msg);
    return !msg;
  }

  // Inline validacija pri blur-u i ispravljanju greške
  $$('input, select, textarea', form).forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('is-invalid')) validateField(input);
    });
  });

  // Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validiraj sva polja i sanitizuj vrednosti pre slanja
    let valid = true;
    $$('input:not([type="hidden"]), select, textarea', form).forEach(f => {
      f.value = sanitize(f.value);
      if ((f.required || f.type === 'email' || f.type === 'tel') && !validateField(f)) {
        valid = false;
      }
    });

    if (!valid) {
      const first = form.querySelector('.is-invalid');
      first?.focus();
      return;
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⌛ Slanje...';

    fetch(FORMSPREE, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    })
    .then(res => {
      if (res.ok) {
        form.hidden = true;
        success.hidden = false;
        success.focus();
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = t('Zakaži besplatni uvid →');
        alert(t('Greška pri slanju. Pozovite nas direktno: 013 333 033'));
      }
    })
    .catch(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = t('Zakaži besplatni uvid →');
      alert(t('Nema internet veze. Pozovite nas direktno: 013 333 033'));
    });
  });
})();

/* ============================================================
   9. PEST INFO PANELI — klik → animirani drawer
   ============================================================ */
(function initPestPanels() {
  const pestBtns   = $$('.pest-item[data-pest]');
  const panel      = $('#pest-info-panel');
  const panelInner = $('#pest-panel-inner');
  const closeBtn   = $('#pest-panel-close');

  if (!pestBtns.length || !panel) return;

  const PEST_DATA = {
    cockroach: {
      naziv: 'Bubašvabe',
      ikona: 'assets/svg/cockroach.svg',
      opis: 'Bubašvabe su jedni od najčešćih i najizdržljivijih domaćih insekata. Aktivne su noću, a danju se skrivaju u pukotinama, iza frižidera, ispod sudopere i u kanalima. Jedna ženka može za godinu dana dati stotine potomaka, što znači da se problem širi izuzetno brzo ako se ne reaguje na vreme.',
      opasnosti: [
        'Prenose salmonelu, E. coli i druge bakterije',
        'Kontaminiraju hranu i površine izmetom i pljuvačkom',
        'Izazivaju alergije i pogoršavaju astmu, posebno kod dece',
        'Oštećuju papir, tkanine i ambalažu'
      ],
      znaci: [
        'Neprijatan, masni miris u kuhinji ili ostavi',
        'Sitni tamni izmet sličan kafenim talozima',
        'Jajašca (ooteke) u uglovima i pukotinama',
        'Živi ili uginuli primerci, posebno noću'
      ],
      tretman: 'Primenjujemo kombinaciju gel-mamaca i rezidualne insekticide. Gel-mamci su visoko efikasni i bezbedni — postavljaju se na nedostupna mesta. Tretman deluje 2–4 nedelje, uz kontrolnu posetu.'
    },
    rat: {
      naziv: 'Pacovi i miševi',
      ikona: 'assets/svg/rat.svg',
      opis: 'Pacovi i miševi su najrasprostranjeniji štetni glodari. Odlikuje ih izuzetna reproduktivna sposobnost — ženski pacov može imati 5–6 legla godišnje sa 6–12 mladunaca. Probijaju se kroz cevi, ventilacione otvore i pukotine, a aktivni su uglavnom noću. Pored direktne štete, prenose brojne bolesti opasne po zdravlje.',
      opasnosti: [
        'Prenose leptospirozu, salmonelu i hantavirus',
        'Glođući ožičenje, izazivaju kratke spojeve i požare',
        'Kontaminiraju hranu urinom, izmetom i dlakom',
        'Prave gnezda u izolaciji, zidovima i podrumima'
      ],
      znaci: [
        'Izmet (ovalni, tamni) duž zidova i u uglovima',
        'Oglodotine na ambalaži, drvetu, kablovima',
        'Tragovi kretanja (mastini otisci duž zidova)',
        'Noćni zvukovi: šuštanje, grebanje iz plafona ili zidova'
      ],
      tretman: 'Koristimo kombinaciju rodenticidnih mamaca u zaštićenim kutijama i mehaničkih zamki. Pre tretmana obavljamo inspekciju svih ulaznih tačaka i dajemo preporuke za zatvaranje. Garancija na tretman — dolazimo besplatno na kontrolu.'
    },
    ant: {
      naziv: 'Mravi',
      ikona: 'assets/svg/ant.svg',
      opis: 'Mravi su socijalni insekti koji žive u kolonijama sa hiljadama ili milionima primeraka. Traže hranu sistematično i mogu proći duže staze. U kući ih najčešće privlače šećer, masti i vlaga. Jednom kada pronađu hranu, ostavljaju hemijski trag (feromon) koji vodi ostatak kolonije, što rezultuje nizovima mrava do vaše kuhinje.',
      opasnosti: [
        'Kontaminiraju hranu i kuhinjske površine',
        'Neke vrste grizu i izazivaju alergijske reakcije',
        'Oštećuju drvo i izolacione materijale (mravi drvari)',
        'Teško ih je eliminisati bez stručnog tretmana'
      ],
      znaci: [
        'Vidljivi nizovi mrava, posebno u kuhinji',
        'Sitne gomilice zemlje ili piljevine uz zid',
        'Mravi u hrani ili oko kante za smeće',
        'Krila od letećih mrava (tokom rojenja)'
      ],
      tretman: 'Primenjujemo gel-mamce koji mravi odnose u gnezdo i uništavaju celu koloniju od iznutra. Za spoljne kolonije koristimo rezidualne insekticide oko temelja. Tretman je diskretan i siguran za decu i kućne ljubimce uz primenu uputstava.'
    },
    mosquito: {
      naziv: 'Komarci',
      ikona: 'assets/svg/mosquito.svg',
      opis: 'Komarci su ne samo izvor velikog neprijatnosti već i vektori ozbiljnih bolesti. Razmnožavaju se u stajačoj vodi — i manja lokva ili zapuštena tegla dovoljni su za razvoj stotina larvi. Sezona je od aprila do oktobra, a u urbanim sredinama blizu reka (kao što je Pančevo) problem može biti veoma izražen.',
      opasnosti: [
        'Prenose virus zapadnog Nila (dokazan u Srbiji)',
        'Ujedi izazivaju svrab, otok i sekundarne infekcije',
        'Remete san i svakodnevne aktivnosti na otvorenom',
        'Potencijalni vektori denga i malarije (klima promene)'
      ],
      znaci: [
        'Ubrzano pojavljivanje komaraca u stanu ili dvorištu',
        'Stajača voda u okolini (baštenska posuda, oluk, tegla)',
        'Karakteristično zujanje, posebno noću',
        'Ujedi i svrab tokom sna'
      ],
      tretman: 'Tretiramo stanišne površine larvicidima (stajača voda) i adulticide sprejom za odrasle komarce. Za dvorišta koristimo ULV tretman (sitna magla) koji efikasno smanjuje populaciju za 4–6 nedelja. Preporučujemo sezonski tretman od maja do septembra.'
    },
    bedbug: {
      naziv: 'Stenice',
      ikona: 'assets/svg/bedbug.svg',
      opis: 'Stenice (drvene vaši) su sitni insekti koji se hrane isključivo krvlju. Danju se skrivaju u šavovima madraca, okvirima kreveta, pukotinama poda i iza tapeta. Noću izlaze da se hrane. Lako se prenose putovanjem, kupovinom polovnog nameštaja ili kroz zajedničke zidove. Infekcija se širi izuzetno brzo.',
      opasnosti: [
        'Bolni ujedi koji izazivaju svrab i nesanicu',
        'Alergijske reakcije i psihološki stres kod stanara',
        'Veoma teško ih je eliminisati bez stručnog tretmana',
        'Brzo se šire na susedne stanove'
      ],
      znaci: [
        'Crveni, svrbljivi ujedi na koži (niz ili klaster)',
        'Sitne tamne mrlje (izmet) na madracu i posteljini',
        'Blagi zaslađeni miris u spavaćoj sobi',
        'Uočljive kožice (presvlačenje) i jajašca u šavovima'
      ],
      tretman: 'Tretman stenica zahteva 2–3 intervencije u razmaku od 10–14 dana. Koristimo rezidualne insekticide + kontaktne sprejeve, uz temeljnu inspekciju svih skrovišta. Dajemo precizna pismena uputstva za pripremu prostorije. Na tretman dajemo garanciju.'
    },
    wasp: {
      naziv: 'Ose',
      ikona: 'assets/svg/wasp.svg',
      opis: 'Ose grade gnezda u potkrovljima, između dasaka na fasadi, u tlu, šupljinama zidova i drveću. Jedna kolonija može imati i do 10.000 primeraka. Ose su agresivne kada osete pretnju i mogu žaliti više puta. Osinjak koji se ne ukloni u proljeće može do jeseni narasti do opasnih dimenzija.',
      opasnosti: [
        'Žalac izaziva intenzivan bol i edem',
        'Alergijska reakcija (anafilaksa) može biti opasna po život',
        'Agresivne su pri odbrani gnezda — napadaju u roju',
        'Gnezdo u zidu može oštetiti građevinski materijal'
      ],
      znaci: [
        'Povećan broj osa u određenom delu dvorišta ili tavanice',
        'Vidljivo gnezdo od sivkastog papirnatog materijala',
        'Neprestano kretanje osa ka istom ulaznom otvoru',
        'Zujanje unutar zida ili plafona'
      ],
      tretman: 'Intervencija se obavlja zaštitnom opremom, u kasnim večernjim satima kada su ose najmanje aktivne. Primenujemo insekticid direktno u gnezdo, nakon čega gnezdo fizički uklanjamo. U hitnim slučajevima dolazimo isti dan. Uklanjanje osinih gnezda je jedna od naših najefikasnijih intervencija.'
    }
  };

  let activePest = null;

  function buildPanel(key) {
    const d = PEST_DATA[key];
    if (!d) return;

    panelInner.innerHTML = `
      <div class="pest-panel-left">
        <div class="pest-panel-icon-wrap">
          <img src="${d.ikona}" alt="${d.naziv}" width="100" height="80" loading="lazy">
        </div>
        <p class="pest-panel-name">${d.naziv}</p>
        <p class="pest-panel-desc">${d.opis}</p>
      </div>
      <div class="pest-panel-right">
        <div class="pest-info-card card-danger">
          <h4>⚠️ Zašto su štetni</h4>
          <ul>${d.opasnosti.map(x => `<li>${x}</li>`).join('')}</ul>
        </div>
        <div class="pest-info-card card-signs">
          <h4>🔍 Znaci prisustva</h4>
          <ul>${d.znaci.map(x => `<li>${x}</li>`).join('')}</ul>
        </div>
        <div class="pest-info-card card-treat">
          <h4>✅ Naš tretman</h4>
          <ul><li>${d.tretman}</li></ul>
        </div>
      </div>
    `;

    // CTA dugme ispod
    const cta = document.createElement('div');
    cta.className = 'pest-panel-cta';
    cta.innerHTML = `<a href="#kontakt" class="btn btn-primary">Zakažite tretman za ${d.naziv.toLowerCase()}</a>`;
    panelInner.appendChild(cta);

    // Ako je ćirilica aktivna, transliteriši dinamički sadržaj
    if (SCRIPT.mode === 'cyr') transliterateSubtree(panelInner);
  }

  function openPanel(key) {
    buildPanel(key);
    panel.classList.add('is-open');
    activePest = key;

    // Scroll do panela
    setTimeout(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  function closePanel() {
    panel.classList.remove('is-open');
    activePest = null;
    pestBtns.forEach(b => b.setAttribute('aria-expanded', 'false'));
  }

  pestBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.pest;

      if (activePest === key) {
        // Zatvori isti
        closePanel();
        return;
      }

      // Deaktiviraj sve
      pestBtns.forEach(b => b.setAttribute('aria-expanded', 'false'));

      // Aktiviraj kliknuti
      btn.setAttribute('aria-expanded', 'true');
      openPanel(key);
    });
  });

  closeBtn?.addEventListener('click', closePanel);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activePest) closePanel();
  });
})();

/* ============================================================
   10. BACK-TO-TOP
   ============================================================ */
(function initBackToTop() {
  const btn = $('#back-to-top');
  if (!btn) return;

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ============================================================
   10. INICIJALIZACIJA — pokretanje kad je DOM spreman
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Odmah pokaži elemente koji su već u viewport-u
  $$('.animate-on-scroll').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) {
      el.classList.add('is-visible');
    }
  });

  // Inicijalno stanje taba — prikaži prvi panel
  const firstPanel = $('#tab-deratizacija');
  if (firstPanel) {
    firstPanel.hidden = false;
    firstPanel.classList.add('active');
  }

  // Pokretanje script toggle modula (mora biti poslednje, kad je DOM potpun)
  ScriptToggle.init();
});
