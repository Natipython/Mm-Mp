/**
 * MenuMini Luxury Light - Motion & Animation Specification & Implementation
 * Path: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/web/design/motion_spec.js
 * 
 * Features:
 * 1. Custom Interactive LERP Cursor Follower (LERP 0.18, requestAnimationFrame)
 * 2. Magnetic Pull Physics for Interactive Buttons
 * 3. Card Hairline Radial Ambient Spotlight
 * 4. Contextual Button Click Animations:
 *    - Forward Spring Pulse + Directional Arrow Particles (Register / Start Free)
 *    - Keyhole Lock Shimmer + Tactile Haptic Push + Bronze Glow (Owner Login)
 *    - 3D Y-Axis Flip Card + Ge'ez Fidel Transition (Language Switcher)
 *    - Crown Bounce (👑) vs Tie Vibration (👔) Spring Physics (Role Selectors)
 *    - Haptic Screen Flash + Slide-under Indicator (Simulator Tabs)
 *    - Shimmering ETB Currency Burst + Smooth Counter Roll-up (Calculator)
 * 5. Cinematic Hero Intro Sequence & 3D Parallax Tilt Phone Simulator
 * 6. Scroll-Triggered Reveal with Buttery Cubic-Bezier (0.16, 1, 0.3, 1)
 * 7. Graceful Touch & Reduced-Motion Fallbacks
 */

(function (global) {
  'use strict';

  // Check user motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(hover: none) or (pointer: coarse)').matches;

  // ==========================================================================
  // 1. Custom Interactive LERP Cursor Follower
  // ==========================================================================
  class LuxCursorFollower {
    constructor() {
      if (isTouchDevice || prefersReducedMotion) return;

      this.targetX = window.innerWidth / 2;
      this.targetY = window.innerHeight / 2;
      this.currentX = this.targetX;
      this.currentY = this.targetY;
      this.lerpFactor = 0.18; // Precise smooth damping factor
      this.isHoveringBtn = false;
      this.isHoveringCard = false;
      this.isClicking = false;
      this.isVisible = false;
      this.rafId = null;

      this.initDOMElements();
      this.bindEvents();
      this.startLoop();
    }

    initDOMElements() {
      // Ensure cursor elements exist
      let ring = document.getElementById('luxCursorRing');
      let dot = document.getElementById('luxCursorDot');

      if (!ring) {
        ring = document.createElement('div');
        ring.id = 'luxCursorRing';
        ring.className = 'lux-cursor-ring';
        document.body.appendChild(ring);
      }

      if (!dot) {
        dot = document.createElement('div');
        dot.id = 'luxCursorDot';
        dot.className = 'lux-cursor-dot';
        document.body.appendChild(dot);
      }

      this.ringEl = ring;
      this.dotEl = dot;
    }

    bindEvents() {
      window.addEventListener('mousemove', (e) => {
        this.targetX = e.clientX;
        this.targetY = e.clientY;

        if (!this.isVisible) {
          this.isVisible = true;
          this.ringEl.style.opacity = '1';
          this.dotEl.style.opacity = '1';
        }

        // Dot follows immediately for pixel-precision focal tracking
        this.dotEl.style.transform = `translate3d(${this.targetX - 3}px, ${this.targetY - 3}px, 0)`;
      }, { passive: true });

      document.addEventListener('mouseleave', () => {
        this.isVisible = false;
        this.ringEl.style.opacity = '0';
        this.dotEl.style.opacity = '0';
      });

      document.addEventListener('mousedown', () => {
        this.isClicking = true;
        this.ringEl.classList.add('is-clicking');
      });

      document.addEventListener('mouseup', () => {
        this.isClicking = false;
        this.ringEl.classList.remove('is-clicking');
      });

      // Interactive element delegation
      this.setupHoverListeners();
    }

    setupHoverListeners() {
      const interactiveSelector = `
        a, button, .btn-cta, .btn-secondary, .btn-register, .btn-login,
        .magnetic-btn, .role-btn, .perspective-tab, .step-indicator,
        input[type="range"], input[type="text"], input[type="password"],
        input[type="email"], input[type="tel"], select
      `;

      document.addEventListener('mouseover', (e) => {
        const target = e.target;
        if (target.closest(interactiveSelector)) {
          this.ringEl.classList.add('is-hovering-btn');
          this.dotEl.classList.add('is-hovering-btn');
        } else if (target.closest('.card-spotlight, .calc-card, .telebirr-placard, .cbe-birr-placard, .perspective-menu, .reg-step-pane, .bento-card')) {
          this.ringEl.classList.add('is-hovering-card');
        }
      });

      document.addEventListener('mouseout', (e) => {
        const target = e.target;
        if (target.closest(interactiveSelector)) {
          this.ringEl.classList.remove('is-hovering-btn');
          this.dotEl.classList.remove('is-hovering-btn');
        }
        if (target.closest('.card-spotlight, .calc-card, .telebirr-placard, .cbe-birr-placard, .perspective-menu, .reg-step-pane, .bento-card')) {
          this.ringEl.classList.remove('is-hovering-card');
        }
      });
    }

    startLoop() {
      const render = () => {
        // LERP formula: current = current + (target - current) * factor
        this.currentX += (this.targetX - this.currentX) * this.lerpFactor;
        this.currentY += (this.targetY - this.currentY) * this.lerpFactor;

        // Half width of default ring (38 / 2 = 19)
        const halfRing = this.ringEl.offsetWidth / 2 || 19;
        const ringX = this.currentX - halfRing;
        const ringY = this.currentY - halfRing;

        this.ringEl.style.transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0)`;
        this.ringEl.style.setProperty('--curr-x', `${ringX.toFixed(2)}px`);
        this.ringEl.style.setProperty('--curr-y', `${ringY.toFixed(2)}px`);

        this.rafId = requestAnimationFrame(render);
      };

      this.rafId = requestAnimationFrame(render);
    }
  }

  // ==========================================================================
  // 2. Magnetic Pull Physics for Interactive Buttons
  // ==========================================================================
  function initMagneticButtons() {
    if (isTouchDevice || prefersReducedMotion) return;

    const magneticElements = document.querySelectorAll('.magnetic-btn, .btn-cta, .btn-secondary, #heroBtnRegister, #heroBtnLogin, #navCta');

    magneticElements.forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = (e.clientX - centerX) * 0.28;
        const deltaY = (e.clientY - centerY) * 0.28;

        btn.style.transform = `translate3d(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px, 0)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate3d(0, 0, 0)';
        btn.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(() => {
          btn.style.transition = '';
        }, 450);
      });
    });
  }

  // ==========================================================================
  // 3. Card Hairline Radial Ambient Spotlight
  // ==========================================================================
  function initCardSpotlights() {
    if (isTouchDevice || prefersReducedMotion) return;

    const cards = document.querySelectorAll(`
      .card-spotlight, .calc-card, .telebirr-placard, .cbe-birr-placard,
      .perspective-menu, .reg-step-pane, .bento-card, .tier-card, .feature-card
    `);

    cards.forEach((card) => {
      if (!card.classList.contains('card-spotlight')) {
        card.classList.add('card-spotlight');
      }

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty('--mouse-x', `${x.toFixed(1)}px`);
        card.style.setProperty('--mouse-y', `${y.toFixed(1)}px`);
      }, { passive: true });
    });
  }

  // ==========================================================================
  // 4. Contextual Button Click Animations
  // ==========================================================================

  // (A) "Register Your Business" / "Start Free" - Forward Spring Pulse & Arrow Launch
  function launchArrowParticles(x, y) {
    if (prefersReducedMotion) return;

    const particleCount = 7;
    const arrows = ['↗', '↑', '→', '▲', '✧', '✦'];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('span');
      particle.className = 'arrow-particle';
      particle.textContent = arrows[i % arrows.length];
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;

      const angle = (Math.random() * 45 - 65) * (Math.PI / 180); // Up and forward trajectory (-20deg to -65deg)
      const distance = 70 + Math.random() * 90;
      const targetX = Math.cos(angle) * distance + (Math.random() * 30);
      const targetY = Math.sin(angle) * distance;
      const rotation = Math.random() * 40 - 20;

      document.body.appendChild(particle);

      // Trigger frame transition
      requestAnimationFrame(() => {
        particle.style.transform = `translate3d(${targetX.toFixed(1)}px, ${targetY.toFixed(1)}px, 0) scale(${0.7 + Math.random() * 0.5}) rotate(${rotation}deg)`;
        particle.style.opacity = '0';
      });

      setTimeout(() => {
        particle.remove();
      }, 850);
    }
  }

  function handleRegisterClick(e) {
    const btn = e.currentTarget;
    btn.classList.remove('btn-register-pulse');
    void btn.offsetWidth; // Force reflow
    btn.classList.add('btn-register-pulse');

    const rect = btn.getBoundingClientRect();
    const originX = e.clientX || (rect.left + rect.width / 2);
    const originY = e.clientY || (rect.top + rect.height / 2);

    launchArrowParticles(originX, originY);

    if (navigator.vibrate) {
      try { navigator.vibrate([15, 40, 25]); } catch (_) {}
    }
  }

  // (B) "Owner Studio Login" - Keyhole Lock Shimmer & Bronze Haptic Push
  function handleLoginClick(e) {
    const btn = e.currentTarget;
    btn.classList.remove('btn-login-shimmer');
    void btn.offsetWidth; // Force reflow
    btn.classList.add('btn-login-shimmer');

    // Remove existing beam if any
    const existingBeam = btn.querySelector('.keyhole-beam');
    if (existingBeam) existingBeam.remove();

    const beam = document.createElement('span');
    beam.className = 'keyhole-beam';
    btn.appendChild(beam);

    setTimeout(() => {
      beam.remove();
    }, 700);

    if (navigator.vibrate) {
      try { navigator.vibrate([20, 25, 15]); } catch (_) {}
    }
  }

  // (C) "Language Switcher (EN / AM)" - 3D Y-Axis Flip Card
  function handleLanguageFlip(btn) {
    if (!btn) return;

    let flipCard = btn.querySelector('.fidel-flip-card');
    if (!flipCard) {
      // Build 3D flip card structure dynamically if plain button
      const currentText = btn.textContent.trim();
      const isAmharic = currentText.includes('አማርኛ') || currentText.includes('AM');
      const frontText = currentText;
      const backText = isAmharic ? 'English' : 'አማርኛ';

      btn.classList.add('btn-lang-flip');
      btn.innerHTML = `
        <div class="fidel-flip-card" id="langFlipCard">
          <div class="fidel-face fidel-face-front">${frontText}</div>
          <div class="fidel-face fidel-face-back">${backText}</div>
        </div>
      `;
      flipCard = btn.querySelector('.fidel-flip-card');
    }

    flipCard.classList.toggle('flipped');

    // If there is an existing language switch logic in window, dispatch after flip
    if (typeof global.toggleLanguage === 'function') {
      setTimeout(() => {
        global.toggleLanguage();
      }, 250);
    }
  }

  // (D) Role Selectors (Owner vs Manager) Spring Physics
  function handleRoleSelection(roleType, btnEl) {
    const isOwner = roleType === 'OWNER';
    const ownerBtn = document.getElementById('btnRoleOwner');
    const mgrBtn = document.getElementById('btnRoleManager');

    if (ownerBtn) {
      ownerBtn.classList.remove('crown-bounce-anim');
      const icon = ownerBtn.querySelector('.role-icon') || ownerBtn;
      icon.classList.remove('crown-bounce-anim');
    }
    if (mgrBtn) {
      mgrBtn.classList.remove('tie-vibrate-anim');
      const icon = mgrBtn.querySelector('.role-icon') || mgrBtn;
      icon.classList.remove('tie-vibrate-anim');
    }

    if (isOwner && ownerBtn) {
      const crown = ownerBtn.querySelector('.role-icon') || ownerBtn;
      void crown.offsetWidth; // Reflow
      crown.classList.add('crown-bounce-anim');

      // Sparkle burst around crown
      const rect = ownerBtn.getBoundingClientRect();
      for (let i = 0; i < 6; i++) {
        const sparkle = document.createElement('span');
        sparkle.className = 'sparkle-burst';
        sparkle.style.left = `${rect.left + rect.width / 2}px`;
        sparkle.style.top = `${rect.top + 16}px`;

        const sx = (Math.random() - 0.5) * 60;
        const sy = (Math.random() - 0.5) * 50 - 20;
        sparkle.style.setProperty('--sx', `${sx}px`);
        sparkle.style.setProperty('--sy', `${sy}px`);

        document.body.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 700);
      }
    } else if (!isOwner && mgrBtn) {
      const tie = mgrBtn.querySelector('.role-icon') || mgrBtn;
      void tie.offsetWidth; // Reflow
      tie.classList.add('tie-vibrate-anim');
    }
  }

  // (E) Simulator Perspective View Tabs & Screen Flash
  function initSimulatorMotion() {
    const perspectiveMenu = document.querySelector('.perspective-menu');
    if (!perspectiveMenu) return;

    let indicator = perspectiveMenu.querySelector('.sim-active-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'sim-active-indicator';
      perspectiveMenu.appendChild(indicator);
    }

    const updateIndicator = (activeTab) => {
      if (!activeTab || !indicator) return;
      const menuRect = perspectiveMenu.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      const leftOffset = tabRect.left - menuRect.left;
      indicator.style.left = `${leftOffset}px`;
      indicator.style.width = `${tabRect.width}px`;
    };

    const initialActive = perspectiveMenu.querySelector('.perspective-tab.active') || perspectiveMenu.querySelector('.perspective-tab');
    if (initialActive) {
      updateIndicator(initialActive);
    }

    const tabs = perspectiveMenu.querySelectorAll('.perspective-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        updateIndicator(tab);

        // Screen Haptic Flash on Phone Screen
        const phoneScreen = document.querySelector('.phone-screen, #phoneScreen, .screen-content, .phone-mockup');
        if (phoneScreen) {
          phoneScreen.classList.remove('phone-screen-flash');
          void phoneScreen.offsetWidth; // Reflow
          phoneScreen.classList.add('phone-screen-flash');
        }

        if (navigator.vibrate) {
          try { navigator.vibrate(18); } catch (_) {}
        }
      });
    });

    window.addEventListener('resize', () => {
      const curActive = perspectiveMenu.querySelector('.perspective-tab.active');
      if (curActive) updateIndicator(curActive);
    }, { passive: true });
  }

  // (F) Calculator Range Inputs & Shimmering ETB Currency Burst
  function animateValueCounter(element, start, end, duration = 650, prefix = '', suffix = ' ETB') {
    if (!element) return;
    if (prefersReducedMotion) {
      element.textContent = `${prefix}${Math.round(end).toLocaleString()}${suffix}`;
      return;
    }

    const startTime = performance.now();
    const diff = end - start;

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quartic: 1 - pow(1 - x, 4)
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const current = start + (diff * easeOut);

      element.textContent = `${prefix}${Math.round(current).toLocaleString()}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  function triggerCurrencyBurst(originEl, amount) {
    if (prefersReducedMotion || !originEl) return;

    const burst = document.createElement('div');
    burst.className = 'calc-currency-burst';
    burst.textContent = `+${amount} ETB`;

    const rect = originEl.getBoundingClientRect();
    burst.style.left = `${rect.left + rect.width / 2 - 35}px`;
    burst.style.top = `${rect.top - 10}px`;

    const driftX = (Math.random() - 0.5) * 40;
    burst.style.setProperty('--cx', `${driftX.toFixed(1)}px`);

    document.body.appendChild(burst);

    setTimeout(() => {
      burst.remove();
    }, 900);
  }

  function initCalculatorMotion() {
    const rangeSliders = document.querySelectorAll('#inputTables, #inputChecks, #inputAmount, .calc-range');
    rangeSliders.forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const valEl = document.getElementById('calcSavings') || document.querySelector('.calc-savings-value');
        if (valEl && !valEl.classList.contains('etb-number-shimmer')) {
          valEl.classList.add('etb-number-shimmer');
        }

        // Throttle bursts
        if (!slider._lastBurst || Date.now() - slider._lastBurst > 320) {
          slider._lastBurst = Date.now();
          triggerCurrencyBurst(slider, Math.round(Number(slider.value) * 12));
        }
      });
    });
  }

  // ==========================================================================
  // 5. Cinematic Hero Intro Sequence & 3D Parallax Tilt
  // ==========================================================================
  function initCinematicHero() {
    const nav = document.querySelector('header, .nav-container, nav');
    const badge = document.querySelector('.hero-badge');
    const title = document.querySelector('.hero-title, #heroTitle');
    const sub = document.querySelector('.hero-subtitle, #heroSub');
    const ctas = document.querySelector('.hero-buttons');
    const phoneWrapper = document.querySelector('.phone-mockup, .phone-container, .phone-frame');

    if (nav) nav.classList.add('hero-intro-nav');
    if (badge) badge.classList.add('hero-intro-badge');
    if (title) title.classList.add('hero-intro-title');
    if (sub) sub.classList.add('hero-intro-sub');
    if (ctas) ctas.classList.add('hero-intro-cta');

    if (phoneWrapper) {
      phoneWrapper.classList.add('phone-float-wrapper');
      setTimeout(() => {
        phoneWrapper.classList.add('phone-mockup-floating');
      }, 1800);

      // Interactive 3D Parallax Tilt
      if (!isTouchDevice && !prefersReducedMotion) {
        const heroSection = document.querySelector('.hero-section') || document.body;

        heroSection.addEventListener('mousemove', (e) => {
          const rect = heroSection.getBoundingClientRect();
          const normalizedX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
          const normalizedY = (e.clientY - rect.top) / rect.height - 0.5;

          const tiltX = (normalizedY * -12).toFixed(2); // Tilt up/down
          const tiltY = (normalizedX * 14).toFixed(2);  // Tilt left/right

          phoneWrapper.style.transform = `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
        });

        heroSection.addEventListener('mouseleave', () => {
          phoneWrapper.style.transform = '';
        });
      }
    }
  }

  // ==========================================================================
  // 6. Scroll-Triggered Reveal with Buttery Cubic-Bezier
  // ==========================================================================
  function initScrollReveal() {
    const revealTargets = document.querySelectorAll(`
      .reveal-on-scroll, .reveal-stagger, section,
      .placards-container, .calculator-section, #tiers, #register
    `);

    if (prefersReducedMotion) {
      revealTargets.forEach(el => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');

          // Assign stagger indices to child cards
          const staggerChildren = entry.target.querySelectorAll('.placard-card, .calc-card, .perspective-tab, .step-indicator, .form-group');
          staggerChildren.forEach((child, index) => {
            child.style.setProperty('--stagger-index', index);
          });

          obs.unobserve(entry.target); // Optimize: fire once
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -50px 0px'
    });

    revealTargets.forEach((el) => {
      if (!el.classList.contains('reveal-on-scroll') && !el.classList.contains('reveal-stagger')) {
        el.classList.add('reveal-on-scroll');
      }
      observer.observe(el);
    });
  }

  // ==========================================================================
  // 7. Master Initialization
  // ==========================================================================
  function initMotionSystem() {
    // 1. Cursor Follower
    new LuxCursorFollower();

    // 2. Magnetic Buttons
    initMagneticButtons();

    // 3. Card Hairline Spotlights
    initCardSpotlights();

    // 4. Contextual Button Listeners
    const registerBtns = document.querySelectorAll('.btn-register, #heroBtnRegister, #navCta, a[href="/register"], .btn-start-free');
    registerBtns.forEach(btn => btn.addEventListener('click', handleRegisterClick));

    const loginBtns = document.querySelectorAll('.btn-login, #heroBtnLogin, #navLogin, a[href="/login"]');
    loginBtns.forEach(btn => btn.addEventListener('click', handleLoginClick));

    const langBtn = document.getElementById('langToggle') || document.querySelector('.lang-pill, .btn-lang');
    if (langBtn) {
      langBtn.addEventListener('click', () => handleLanguageFlip(langBtn));
    }

    const roleOwner = document.getElementById('btnRoleOwner');
    if (roleOwner) {
      roleOwner.addEventListener('click', () => handleRoleSelection('OWNER', roleOwner));
    }

    const roleManager = document.getElementById('btnRoleManager');
    if (roleManager) {
      roleManager.addEventListener('click', () => handleRoleSelection('MAIN_MANAGER', roleManager));
    }

    // 5. Simulator & Calculator
    initSimulatorMotion();
    initCalculatorMotion();

    // 6. Cinematic Hero Intro
    initCinematicHero();

    // 7. Scroll Reveals
    initScrollReveal();
  }

  // Auto-run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMotionSystem);
  } else {
    initMotionSystem();
  }

  // Expose APIs on global window object for direct script integration
  global.MenuMiniMotion = {
    init: initMotionSystem,
    launchArrowParticles,
    handleRegisterClick,
    handleLoginClick,
    handleLanguageFlip,
    handleRoleSelection,
    animateValueCounter,
    triggerCurrencyBurst
  };

})(typeof window !== 'undefined' ? window : globalThis);
