/**
 * ARMORY AI — Main Application Logic
 * 
 * Features:
 * 1. Matrix-Driven Pricing with Performance-Isolated Currency Switcher
 * 2. Bento-to-Accordion with State Persistence
 * 3. Hero canvas animation
 * 4. Scroll-driven reveals
 * 5. Counter animations
 * 6. Tab navigation
 */

// ============================
// FEATURE 1: PRICING MATRIX
// Multi-dimensional configuration object
// No hardcoded UI values — all computed dynamically
// ============================

const PRICING_MATRIX = {
  // Base rates in USD (monthly)
  tiers: {
    starter: {
      base: 29,
      name: 'Starter',
    },
    professional: {
      base: 79,
      name: 'Professional',
    },
    enterprise: {
      base: 199,
      name: 'Enterprise',
    },
  },

  // Billing cycle multipliers
  billing: {
    monthly: 1,
    annual: 0.8, // 20% discount
  },

  // Regional tariff variables (conversion + regional pricing adjustment)
  currencies: {
    USD: {
      symbol: '$',
      rate: 1,
      tariff: 1.0, // No adjustment
    },
    INR: {
      symbol: '₹',
      rate: 83.5,
      tariff: 0.7, // Regional pricing adjustment (PPP)
    },
    EUR: {
      symbol: '€',
      rate: 0.92,
      tariff: 1.05, // Slight EU tariff
    },
  },

  /**
   * Compute final price for a given tier, billing cycle, and currency
   * Formula: base * billingMultiplier * currencyRate * regionalTariff
   */
  computePrice(tier, billing, currency) {
    const tierData = this.tiers[tier];
    const billingMultiplier = this.billing[billing];
    const currencyData = this.currencies[currency];

    if (!tierData || !billingMultiplier || !currencyData) return { value: 0, symbol: '$' };

    const rawPrice = tierData.base * billingMultiplier * currencyData.rate * currencyData.tariff;
    const roundedPrice = Math.round(rawPrice);

    return {
      value: roundedPrice,
      symbol: currencyData.symbol,
      period: billing === 'monthly' ? '/mo' : '/yr',
    };
  },
};

// State for pricing — isolated from global
let pricingState = {
  billing: 'monthly',
  currency: 'USD',
};

/**
 * Update ONLY the price text nodes — no parent re-renders.
 * Uses direct DOM text node manipulation for performance isolation.
 */
function updatePriceNodes() {
  const cards = document.querySelectorAll('.pricing-card');
  cards.forEach((card) => {
    const tier = card.dataset.tier;
    const computed = PRICING_MATRIX.computePrice(tier, pricingState.billing, pricingState.currency);

    // Direct text node updates — no innerHTML, no parent reflow
    const symbolNode = card.querySelector('[data-price-symbol]');
    const valueNode = card.querySelector('[data-price-value]');
    const periodNode = card.querySelector('[data-price-period]');

    if (symbolNode) symbolNode.textContent = computed.symbol;
    if (valueNode) valueNode.textContent = computed.value;
    if (periodNode) periodNode.textContent = computed.period;
  });
}

function initPricing() {
  const billingToggle = document.getElementById('billing-toggle');
  const currencyDropdown = document.getElementById('currency-dropdown');

  if (!billingToggle || !currencyDropdown) return;

  // Billing toggle — isolated event handling
  const billingBtns = billingToggle.querySelectorAll('.billing-btn');
  billingBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newBilling = btn.dataset.billing;
      if (newBilling === pricingState.billing) return;

      pricingState.billing = newBilling;

      // Update toggle UI only
      billingBtns.forEach((b) => {
        b.classList.toggle('active', b.dataset.billing === newBilling);
        b.setAttribute('aria-checked', b.dataset.billing === newBilling);
      });
      billingToggle.dataset.billing = newBilling;

      // Update only price text nodes
      updatePriceNodes();
    });
  });

  // Currency dropdown — isolated event handling
  currencyDropdown.addEventListener('change', (e) => {
    e.stopPropagation();
    pricingState.currency = e.target.value;
    // Update only price text nodes
    updatePriceNodes();
  });

  // Initial render
  updatePriceNodes();
}

// ============================
// FEATURE 2: BENTO-TO-ACCORDION WITH STATE PERSISTENCE
// ============================

let bentoState = {
  activeIndex: -1,
  isMobile: false,
};

const MOBILE_BREAKPOINT = 768;

function buildAccordion() {
  const accordion = document.getElementById('bento-accordion');
  if (!accordion || accordion.children.length > 0) return;

  const bentoItems = document.querySelectorAll('#bento-grid .bento-item');
  bentoItems.forEach((item, index) => {
    const title = item.querySelector('.bento-title')?.textContent || '';
    const desc = item.querySelector('.bento-desc')?.textContent || '';
    const iconHTML = item.querySelector('.bento-icon')?.innerHTML || '';

    const accItem = document.createElement('div');
    accItem.className = 'accordion-item';
    accItem.dataset.bentoIndex = index;

    accItem.innerHTML = `
      <button class="accordion-trigger" role="tab" aria-expanded="false" aria-controls="acc-panel-${index}" id="acc-tab-${index}">
        <span class="acc-trigger-content">${iconHTML ? `<span class="acc-trigger-icon">${iconHTML}</span>` : ''} ${title}</span>
        <span class="acc-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </span>
      </button>
      <div class="accordion-panel" id="acc-panel-${index}" role="tabpanel" aria-labelledby="acc-tab-${index}">
        <div class="accordion-panel-inner">
          <p>${desc}</p>
        </div>
      </div>
    `;

    // Accordion click handler
    const trigger = accItem.querySelector('.accordion-trigger');
    trigger.addEventListener('click', () => {
      const isOpen = accItem.classList.contains('open');
      // Close all
      accordion.querySelectorAll('.accordion-item').forEach((ai) => {
        ai.classList.remove('open');
        ai.querySelector('.accordion-trigger')?.setAttribute('aria-expanded', 'false');
      });
      // Toggle current
      if (!isOpen) {
        accItem.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        bentoState.activeIndex = index;
      } else {
        bentoState.activeIndex = -1;
      }
    });

    accordion.appendChild(accItem);
  });
}

function syncBentoToAccordion() {
  const accordion = document.getElementById('bento-accordion');
  if (!accordion) return;

  // Close all accordion items
  accordion.querySelectorAll('.accordion-item').forEach((item) => {
    item.classList.remove('open');
    item.querySelector('.accordion-trigger')?.setAttribute('aria-expanded', 'false');
  });

  // If there's an active bento index, open corresponding accordion
  if (bentoState.activeIndex >= 0) {
    const targetItem = accordion.querySelector(`[data-bento-index="${bentoState.activeIndex}"]`);
    if (targetItem) {
      targetItem.classList.add('open');
      targetItem.querySelector('.accordion-trigger')?.setAttribute('aria-expanded', 'true');
    }
  }
}

function initBentoAccordion() {
  const bentoGrid = document.getElementById('bento-grid');
  const bentoItems = document.querySelectorAll('#bento-grid .bento-item');

  // Track hover/active state on desktop bento items
  bentoItems.forEach((item) => {
    const index = parseInt(item.dataset.bentoIndex);

    item.addEventListener('mouseenter', () => {
      bentoState.activeIndex = index;
      bentoItems.forEach((bi) => bi.classList.remove('active'));
      item.classList.add('active');
    });

    item.addEventListener('mouseleave', () => {
      // Keep active state for resize transfer
      item.classList.remove('active');
    });

    item.addEventListener('click', () => {
      bentoState.activeIndex = index;
      bentoItems.forEach((bi) => bi.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Build accordion for mobile
  buildAccordion();

  // Handle resize — THE CONTEXT LOCK CONSTRAINT
  let previousIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;

  const resizeObserver = new ResizeObserver((entries) => {
    const currentIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;

    if (currentIsMobile !== previousIsMobile) {
      if (currentIsMobile) {
        // Desktop → Mobile: transfer active bento index to accordion
        syncBentoToAccordion();
      } else {
        // Mobile → Desktop: transfer accordion state to bento
        const openItem = document.querySelector('.accordion-item.open');
        if (openItem) {
          bentoState.activeIndex = parseInt(openItem.dataset.bentoIndex);
          const targetBento = document.querySelector(`.bento-item[data-bento-index="${bentoState.activeIndex}"]`);
          if (targetBento) {
            bentoItems.forEach((bi) => bi.classList.remove('active'));
            targetBento.classList.add('active');
          }
        }
      }
      previousIsMobile = currentIsMobile;
    }
  });

  resizeObserver.observe(document.body);
}

// ============================
// HERO CANVAS ANIMATION
// ============================

function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animFrame;

  function resize() {
    canvas.width = canvas.offsetWidth * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = [];
  const count = 80;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.15, // slower movement
      vy: (Math.random() - 0.5) * 0.15, // slower movement
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.2 + 0.1,
    });
  }

  function draw() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    // Dark gradient background
    const grad = ctx.createRadialGradient(w * 0.6, h * 0.4, 0, w * 0.6, h * 0.4, w * 0.7);
    grad.addColorStop(0, 'rgba(17, 76, 90, 0.15)');
    grad.addColorStop(0.5, 'rgba(23, 43, 54, 0.08)');
    grad.addColorStop(1, 'rgba(10, 10, 10, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(241, 246, 244, ${p.opacity})`;
      ctx.fill();
    });

    // Connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(241, 246, 244, ${0.08 * (1 - dist / 150)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    animFrame = requestAnimationFrame(draw);
  }

  draw();
}

// ============================
// VIDEO SECTION CANVAS
// ============================

function initVideoCanvas() {
  const canvas = document.getElementById('video-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.offsetWidth * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
  resize();
  window.addEventListener('resize', resize);

  let time = 0;

  function draw() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);
    time += 0.005;

    // Animated nebula-like background
    for (let i = 0; i < 3; i++) {
      const x = w * (0.3 + 0.2 * Math.sin(time + i * 2));
      const y = h * (0.4 + 0.15 * Math.cos(time * 0.7 + i));
      const r = w * 0.25 + 50 * Math.sin(time + i);

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(241, 246, 244, ${0.06 + 0.02 * Math.sin(time + i)})`);
      grad.addColorStop(0.5, 'rgba(17, 76, 90, 0.03)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Hex grid pattern
    const hexSize = 12;
    const cols = Math.ceil(w / (hexSize * 1.8));
    const rows = Math.ceil(h / (hexSize * 1.6));

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * hexSize * 1.8 + (row % 2 ? hexSize * 0.9 : 0);
        const y = row * hexSize * 1.6;
        const dist = Math.sqrt((x - w / 2) ** 2 + (y - h / 2) ** 2);
        const maxDist = Math.sqrt(w * w + h * h) / 2;
        const alpha = Math.max(0, 0.08 * (1 - dist / maxDist) * (0.5 + 0.5 * Math.sin(time * 2 + dist * 0.01)));

        if (alpha > 0.01) {
          ctx.fillStyle = `rgba(241, 246, 244, ${alpha})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// ============================
// COUNTER ANIMATION
// ============================

function animateCounters() {
  const statValues = document.querySelectorAll('.stat-value[data-target]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target);
          const duration = 1000;
          const start = performance.now();

          function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
            el.textContent = Math.round(target * eased);
            if (progress < 1) requestAnimationFrame(update);
          }
          requestAnimationFrame(update);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  statValues.forEach((el) => observer.observe(el));
}

// ============================
// TAB NAVIGATION
// ============================

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      tabBtns.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      tabPanels.forEach((panel) => {
        panel.classList.remove('active');
      });
      const targetPanel = document.getElementById(`panel-${tab}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// ============================
// SCROLL REVEAL
// ============================

function initScrollReveal() {
  const elements = document.querySelectorAll(
    '.section-badge, .section-heading, .section-subtext, .feature-card, .stat-card, .case-item, .bento-item, .prodstat-card, .testimonial-card, .pricing-card, .faq-item'
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Use WAAPI for hardware-accelerated spring animation
          entry.target.animate(
            [
              { opacity: 0, transform: 'translateY(30px) scale(0.95)' },
              { opacity: 1, transform: 'translateY(0) scale(1)' },
            ],
            {
              duration: 700,
              easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.1)', // Spring-like feel
              fill: 'forwards',
              delay: (entry.target.dataset.staggerIndex || 0) * 80,
            }
          );
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el, i) => {
    el.style.opacity = '0';
    el.dataset.staggerIndex = i % 6;
    observer.observe(el);
  });
}

// ============================
// HEADER SCROLL
// ============================

function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        header.classList.toggle('scrolled', window.scrollY > 50);
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ============================
// MOBILE MENU
// ============================

function initMobileMenu() {
  const hamburger = document.getElementById('hamburger-btn');
  const navLinks = document.getElementById('nav-links');

  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close on link click
  navLinks.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

// ============================
// NEWSLETTER FORM
// ============================

function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletter-email');
    if (email && email.value) {
      const btn = form.querySelector('.newsletter-btn');
      btn.textContent = 'Subscribed ✓';
      btn.style.background = '#FFC801';
      email.value = '';
      setTimeout(() => {
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Subscribe
        `;
        btn.style.background = '';
      }, 2000);
    }
  });
}

// ============================
// NEWSLETTER CANVAS
// ============================

function initNewsletterCanvas() {
  const canvas = document.getElementById('newsletter-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.offsetWidth * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
  resize();
  window.addEventListener('resize', resize);

  let time = 0;

  function draw() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);
    time += 0.003;

    // Grid dots
    const spacing = 20;
    const cols = Math.ceil(w / spacing);
    const rows = Math.ceil(h / spacing);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * spacing;
        const y = r * spacing;
        const wave = Math.sin(time + x * 0.02 + y * 0.01) * 0.5 + 0.5;

        ctx.fillStyle = `rgba(241, 246, 244, ${0.03 + wave * 0.05})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// ============================
// INIT
// ============================

document.addEventListener('DOMContentLoaded', () => {
  initPricing();
  initBentoAccordion();
  initHeroCanvas();
  initVideoCanvas();
  animateCounters();
  initTabs();
  initScrollReveal();
  initHeaderScroll();
  initMobileMenu();
  initNewsletter();
  initNewsletterCanvas();
});
