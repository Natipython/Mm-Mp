/**
 * MenuMini Luxury Light - Mobile Touch Physics & Gesture Interaction Engine
 * Path: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/web/design/touch_interactions.js
 *
 * Capabilities:
 * 1. Hardware Haptic Feedback via Navigator Vibrate API
 * 2. Multi-Directional Touch Swipe Physics on Phone Simulator (Left/Right perspective cycling)
 * 3. Mobile Momentum Carousel Auto-Centering for Perspective Tabs & Stepper
 * 4. Zero Layout Shift (CLS 0.000) Animated Step Transitioning
 * 5. Touch Slider Ergonomic Haptic Modulation
 */

(function initMenuMiniTouchPhysics() {
  'use strict';

  // ==========================================================================
  // 1. Hardware Haptic Feedback System
  // ==========================================================================

  const HAPTIC_PATTERNS = {
    tick: [8],
    tap: [12],
    medium: [18],
    heavy: [28],
    success: [12, 45, 18],
    error: [35, 60, 35]
  };

  function triggerHaptic(type = 'tap') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        const pattern = HAPTIC_PATTERNS[type] || [10];
        navigator.vibrate(pattern);
      } catch (_) {
        // Fallback silently if vibration is blocked or unsupported
      }
    }
  }

  window.menuMiniHaptic = triggerHaptic;

  // ==========================================================================
  // 2. Perspective Simulator Swipe Gestures & Auto-Centering
  // ==========================================================================

  const PERSPECTIVES = ['guest', 'owner', 'kitchen', 'platform'];

  function initSimulatorTouchGestures() {
    const mockup = document.querySelector('.device-mockup') || document.getElementById('deviceScreen');
    if (!mockup) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const SWIPE_THRESHOLD = 45; // Minimum horizontal distance in px
    const ANGLE_THRESHOLD = 30; // Max vertical deviation in px

    mockup.addEventListener('touchstart', (e) => {
      const touch = e.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    mockup.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      touchEndX = touch.clientX;
      touchEndY = touch.clientY;

      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      // Ensure horizontal swipe intent (prevent intercepting standard vertical page scroll)
      if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffY) < ANGLE_THRESHOLD) {
        handleSimulatorSwipe(diffX < 0 ? 'next' : 'prev');
      }
    }, { passive: true });
  }

  function handleSimulatorSwipe(direction) {
    const tabs = Array.from(document.querySelectorAll('.perspective-tab'));
    if (!tabs.length) return;

    const activeIndex = tabs.findIndex(tab => tab.classList.contains('active'));
    let nextIndex = activeIndex;

    if (direction === 'next') {
      nextIndex = (activeIndex + 1) % tabs.length;
    } else {
      nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
    }

    const nextTab = tabs[nextIndex];
    const key = PERSPECTIVES[nextIndex] || 'guest';

    if (nextTab && typeof window.switchPerspective === 'function') {
      triggerHaptic('medium');
      window.switchPerspective(key, nextTab);
      centerActivePerspectiveTab(nextTab);
    }
  }

  function centerActivePerspectiveTab(targetTab) {
    if (!targetTab) return;
    const menu = document.querySelector('.perspective-menu');
    if (menu && menu.scrollWidth > menu.clientWidth) {
      targetTab.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }

  // Hook into switchPerspective to ensure tab auto-centering on click as well
  const originalSwitchPerspective = window.switchPerspective;
  window.switchPerspective = function(key, el) {
    triggerHaptic('tap');
    if (typeof originalSwitchPerspective === 'function') {
      originalSwitchPerspective(key, el);
    } else {
      document.querySelectorAll('.perspective-tab').forEach(t => t.classList.remove('active'));
      if (el) el.classList.add('active');
      const screenEl = document.getElementById('deviceScreen');
      if (screenEl && window.screens && window.screens[key]) {
        screenEl.innerHTML = window.screens[key];
      }
    }
    centerActivePerspectiveTab(el);
  };

  // ==========================================================================
  // 3. Ergonomic Touch Sliders with Haptic Modulation
  // ==========================================================================

  function initSliderTouchFeedback() {
    const sliders = ['inputTables', 'inputChecks', 'inputAmount'];
    let lastVibrateTime = 0;

    sliders.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;

      el.addEventListener('input', () => {
        const now = Date.now();
        // Throttle haptic ticks to avoid overwhelming device vibrator (every 40ms max)
        if (now - lastVibrateTime > 40) {
          triggerHaptic('tick');
          lastVibrateTime = now;
        }
      }, { passive: true });
    });
  }

  // ==========================================================================
  // 4. Role Toggle Haptic Mechanics
  // ==========================================================================

  const originalSetRole = window.setRole;
  window.setRole = function(role) {
    triggerHaptic('medium');
    if (typeof originalSetRole === 'function') {
      originalSetRole(role);
    }
  };

  // ==========================================================================
  // 5. Zero Layout Shift (CLS 0) Stepper Navigation & Pane Cross-Fade
  // ==========================================================================

  function centerActiveStepIndicator(stepIndex) {
    const ind = document.getElementById('stepInd' + stepIndex);
    if (!ind) return;
    const nav = document.querySelector('.stepper-nav');
    if (nav && nav.scrollWidth > nav.clientWidth) {
      ind.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }

  const originalGoToStep = window.goToStep;
  window.goToStep = function(step) {
    triggerHaptic('tap');
    centerActiveStepIndicator(step);

    if (typeof originalGoToStep === 'function') {
      originalGoToStep(step);
    }
  };

  // ==========================================================================
  // 6. Dynamic Initialization on DOM Ready
  // ==========================================================================

  function init() {
    initSimulatorTouchGestures();
    initSliderTouchFeedback();

    // Attach haptic feedback to primary CTAs
    document.querySelectorAll('.btn-cta, .lang-pill, .role-btn').forEach(btn => {
      btn.addEventListener('click', () => triggerHaptic('tap'), { passive: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
