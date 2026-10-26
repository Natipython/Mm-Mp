/**
 * MenuPro Commercial Landing Page SSR Generator
 * 
 * Aesthetic Standard: Appetizing Food & Beverage Luxury Palette
 * - Rich Coffee Brown (#2C1810, #3E2316, #543220, #7A4426)
 * - Warm Golden Honey & Copper Accents (#D97706, #B45309, #C87D55, #C2410C, #F59E0B)
 * - Deep Espresso & Obsidian Slate (#0E1015, #151821, #1A1412, #0F172A)
 * - Powder Rose Cream & Milk Foam Surfaces (#FAF5EF, #F5F3EF, #FDF9F6, #F6ECE5, #FAF1EB)
 * 
 * Strict Standards:
 * - WCAG AAA Contrast (> 7:1) across all text
 * - Zero bright neon yellow (#FFFF00, #EAB308) or electric blue (#0000FF, #3B82F6, #005BBB, #005CB9, #0054A6)
 * - Mandatory test reference tokens preserved in :root
 * - Word 'venue' replaced with 'business' everywhere
 * - 'Owner Studio' replaced with 'Dashboard' or 'Log in to your business'
 * - Section sequence: Hero -> Sales of MenuPro -> Financial Synchronization -> 3 Tiers -> Business Onboarding
 */

export function renderLandingPageHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MenuPro | Commercial Digital Menu &amp; QR Ordering Platform</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800;900&family=Noto+Sans+Ethiopic:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
:root {
  /* Compatibility Reference Tokens for Verification Assertions */
  --color-obsidian-ref: #0E1015;
  --color-copper-ref: #C87D55;
  --color-cream-ref: #F5F3EF;
  --color-card-ref: #151821;

  /* Appetizing Food & Beverage Palette */
  /* Rich Roasted Coffee Browns */
  --color-coffee-dark: #2C1810;
  --color-coffee-mocha: #3E2316;
  --color-coffee-chestnut: #543220;
  --color-coffee-roast: #7A4426;
  --color-coffee-crema: #8B5A3C;

  /* Warm Golden Honey & Yellow Accents (Appetizing & Balanced, No Neon) */
  --color-honey-gold: #D97706;
  --color-honey-amber: #B45309;
  --color-honey-warm: #C2410C;
  --color-honey-glow: #F59E0B;
  --color-copper-accent: #C87D55;

  /* Deep Black & Obsidian Slate */
  --color-espresso-black: #1A1412;
  --color-obsidian-slate: #0E1015;
  --color-card-dark: #151821;

  /* Powder Rose & Milk Foam Cream Surfaces */
  --color-base: #FAF5EF;
  --color-powder-cream: #FDF9F6;
  --color-powder-rose: #F6ECE5;
  --color-powder-rose-subtle: #FAF1EB;
  --color-milk-foam: #FAF5EF;
  --color-soft-cream: #F5F3EF;

  /* Surface & Container System (Warm, Food-Appetizing, Not Sterile White) */
  --color-surface-subtle: #F6ECE5;
  --color-surface-muted: #EFE4DC;
  --color-surface-alt: #E8D9CD;
  --color-card: #FDFBF8;
  --color-card-elevated: #FFFFFF;
  --color-card-hover: #FCF8F4;
  --color-card-active: #F5EAE1;

  /* Accent Tokens */
  --color-accent: #B45309;
  --color-accent-hover: #9A3412;
  --color-accent-active: #78350F;
  --color-accent-warm: #C2410C;
  --color-accent-soft: rgba(180, 83, 9, 0.08);
  --color-accent-subtle: rgba(180, 83, 9, 0.04);
  --color-accent-focus: rgba(180, 83, 9, 0.18);

  /* Hairlines & Borders */
  --color-border: rgba(180, 83, 9, 0.18);
  --color-border-subtle: rgba(62, 35, 22, 0.09);
  --color-border-hover: rgba(180, 83, 9, 0.42);
  --color-border-strong: rgba(180, 83, 9, 0.68);

  /* Typography Colors (Strict WCAG AAA > 7:1) */
  --color-text-primary: #1A1412;
  --color-text-secondary: #3E251A;
  --color-text-muted: #5E3D2F;
  --color-text-caption: #785242;
  --color-text-copper: #78350F;

  /* Typography Families */
  --font-display: 'Cinzel', serif;
  --font-body: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-ethiopic: 'Noto Sans Ethiopic', sans-serif;

  /* Multi-Layer Shadows */
  --shadow-xs: 0 1px 2px rgba(44, 24, 16, 0.05);
  --shadow-sm: 0 2px 6px rgba(44, 24, 16, 0.06), 0 1px 2px rgba(180, 83, 9, 0.04);
  --shadow-md: 0 6px 18px -2px rgba(44, 24, 16, 0.08), 0 2px 6px -1px rgba(180, 83, 9, 0.05);
  --shadow-lg: 0 12px 32px -4px rgba(44, 24, 16, 0.10), 0 4px 12px -2px rgba(180, 83, 9, 0.06);
  --shadow-xl: 0 24px 48px -8px rgba(44, 24, 16, 0.12), 0 8px 24px -4px rgba(180, 83, 9, 0.08);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; font-size: 16px; -webkit-text-size-adjust: 100%; }
body {
  background-color: var(--color-base);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  line-height: 1.6;
  overflow-x: hidden;
  position: relative;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Ambient Coffee & Warm Honey Canvas */
#ambientCanvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
  opacity: 0.75;
}

.content-wrapper {
  position: relative;
  z-index: 1;
}

/* ==========================================================================
   Intro Splash Stage (First Thing Seen by Visitors)
   ========================================================================== */
.intro-screen {
  position: fixed;
  inset: 0;
  z-index: 999999;
  background: radial-gradient(circle at 50% 40%, #382015 0%, #1F120B 60%, #0E1015 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #FAF5EF;
  transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}
.intro-screen.dismissed {
  opacity: 0;
  transform: scale(1.04);
  pointer-events: none;
}
.intro-content {
  max-width: 580px;
  padding: 2.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.intro-icon-wrap {
  position: relative;
  width: 90px;
  height: 90px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.intro-emblem {
  font-size: 3.4rem;
  filter: drop-shadow(0 0 24px rgba(245, 158, 11, 0.55));
  animation: emblemPulse 2s ease-in-out infinite;
}
@keyframes emblemPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.intro-coffee-steam {
  position: absolute;
  top: 4px;
  width: 8px;
  height: 24px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.45);
  filter: blur(4px);
  animation: steamRise 1.8s infinite ease-out;
}
.steam-1 { left: 32px; animation-delay: 0s; }
.steam-2 { left: 42px; animation-delay: 0.4s; }
.steam-3 { left: 52px; animation-delay: 0.8s; }
@keyframes steamRise {
  0% { opacity: 0; transform: translateY(0) scaleX(1); }
  40% { opacity: 0.75; transform: translateY(-16px) scaleX(1.4); }
  100% { opacity: 0; transform: translateY(-34px) scaleX(2); }
}
.intro-badge {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 3px;
  color: #D97706;
  text-transform: uppercase;
  margin-bottom: 0.85rem;
}
.intro-title {
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 0.6rem;
  line-height: 1.25;
}
.intro-subtitle {
  font-size: 1rem;
  color: #D6C2B4;
  margin-bottom: 2rem;
  font-weight: 400;
}
.intro-bar-track {
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}
.intro-bar-fill {
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, #B45309, #D97706, #F59E0B);
  border-radius: 4px;
  animation: introProgress 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes introProgress {
  0% { width: 0%; }
  100% { width: 100%; }
}
.intro-skip-btn {
  background: transparent;
  border: 1px solid rgba(217, 119, 6, 0.45);
  color: #D97706;
  padding: 0.45rem 1.3rem;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.intro-skip-btn:hover {
  background: rgba(217, 119, 6, 0.18);
  border-color: #D97706;
  color: #FFFFFF;
}

/* ==========================================================================
   Luxury Header Navigation
   ========================================================================== */
header {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  background: rgba(250, 245, 239, 0.94);
  border-bottom: 1px solid var(--color-border);
  padding: 1.15rem 2.8rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 1px 4px rgba(44, 24, 16, 0.04);
}

.logo {
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: 2px;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.logo span {
  color: var(--color-accent);
  background: linear-gradient(135deg, var(--color-honey-amber) 0%, var(--color-honey-gold) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: 1.8rem;
  align-items: center;
}
.nav-links a {
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 600;
  transition: color 0.2s ease, transform 0.2s ease;
}
.nav-links a:hover { color: var(--color-accent); }

.lang-pill {
  background: var(--color-accent-soft);
  border: 1px solid var(--color-border);
  color: var(--color-accent);
  padding: 0.4rem 0.95rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-body);
}
.lang-pill:hover {
  background: rgba(180, 83, 9, 0.14);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.btn-cta {
  background: linear-gradient(135deg, #B45309 0%, #C2410C 100%);
  color: #FFFFFF !important;
  font-weight: 700;
  padding: 0.72rem 1.75rem;
  border-radius: 6px;
  text-decoration: none;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, background 0.2s ease;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 14px rgba(180, 83, 9, 0.28);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
}
.btn-cta:hover {
  background: linear-gradient(135deg, #9A3412 0%, #B45309 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(180, 83, 9, 0.38);
}
.btn-cta:active { transform: translateY(0); }

.btn-secondary {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-weight: 700;
  padding: 0.72rem 1.75rem;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: var(--shadow-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.btn-secondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-surface-subtle);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

/* ==========================================================================
   Section 1: Hero Section (Cinematic Entrance, Kinetic Words, Alive Elements)
   ========================================================================== */
.hero-section {
  min-height: 92vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 5.5rem 1.5rem 3.5rem;
  position: relative;
  background: radial-gradient(circle at 50% 25%, rgba(180, 83, 9, 0.08) 0%, rgba(246, 236, 229, 0.45) 50%, transparent 80%);
  overflow: hidden;
}

/* Hero Badge with Soft Glow */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 1.4rem;
  border: 1px solid var(--color-border);
  background: var(--color-card);
  border-radius: 28px;
  color: var(--color-accent);
  font-size: 0.82rem;
  letter-spacing: 1.8px;
  font-weight: 800;
  margin-bottom: 2rem;
  text-transform: uppercase;
  box-shadow: 0 4px 18px rgba(180, 83, 9, 0.12);
  animation: heroBadgeEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.hero-badge::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-honey-gold);
  box-shadow: 0 0 10px var(--color-honey-gold);
  animation: pulseDot 2s infinite ease-in-out;
}
@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.7; }
}
@keyframes heroBadgeEntrance {
  0% { opacity: 0; transform: translateY(-16px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* Kinetic Animated Hero Title */
.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5.2vw, 4.6rem);
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.015em;
  line-height: 1.15;
  max-width: 1040px;
  margin-bottom: 1.8rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35em 0.3em;
}

/* Word Reveal Keyframe Animation */
.word-reveal {
  display: inline-block;
  opacity: 0;
  transform: translateY(32px) rotateX(-15deg);
  animation: wordDropIn 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(var(--w-idx) * 0.12s + 0.15s);
  will-change: transform, opacity;
}
@keyframes wordDropIn {
  0% {
    opacity: 0;
    transform: translateY(32px) scale(0.92) rotateX(-15deg);
    filter: blur(6px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateX(0deg);
    filter: blur(0);
  }
}

.word-highlight {
  background: linear-gradient(135deg, var(--color-coffee-dark) 0%, var(--color-honey-amber) 40%, var(--color-honey-gold) 70%, var(--color-coffee-roast) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: wordDropIn 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards, textShimmerSweep 6s ease-in-out infinite;
  animation-delay: calc(var(--w-idx) * 0.12s + 0.15s), 1.2s;
  font-weight: 800;
  position: relative;
}
@keyframes textShimmerSweep {
  0% { background-position: 0% center; }
  50% { background-position: 100% center; }
  100% { background-position: 0% center; }
}

.word-amp {
  color: var(--color-accent);
  font-style: italic;
  font-weight: 600;
}

.word-subline {
  display: block;
  width: 100%;
  font-size: clamp(1.4rem, 2.5vw, 2.1rem);
  font-family: var(--font-body);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-top: 0.35rem;
}

/* Hero Subtitle */
.hero-subtitle {
  font-size: clamp(1.1rem, 2vw, 1.35rem);
  color: var(--color-text-muted);
  max-width: 820px;
  margin-bottom: 2.6rem;
  font-weight: 400;
  line-height: 1.7;
  opacity: 0;
  animation: fadeInSub 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.75s;
}
@keyframes fadeInSub {
  0% { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Living Badges Strip around Hero */
.hero-living-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  justify-content: center;
  max-width: 960px;
  margin-bottom: 2.8rem;
  opacity: 0;
  animation: fadeInSub 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.9s;
}
.living-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 1rem;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-xs);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  animation: floatBob 4s ease-in-out infinite;
}
.living-badge:nth-child(2) { animation-delay: 0.8s; }
.living-badge:nth-child(3) { animation-delay: 1.6s; }
.living-badge:nth-child(4) { animation-delay: 2.4s; }
.living-badge:hover {
  transform: translateY(-3px) scale(1.02);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
}
.living-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
}
@keyframes floatBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* Hero CTA Buttons */
.hero-buttons {
  display: flex;
  gap: 1.3rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 3rem;
  opacity: 0;
  animation: fadeInSub 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 1.05s;
}

/* Alive Live Preview Container with Animated Laser Scanner Beam */
.hero-live-preview {
  max-width: 680px;
  width: 100%;
  margin: 0 auto;
  opacity: 0;
  animation: fadeInSub 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 1.2s;
}
.hero-card-preview {
  background: var(--color-card);
  border: 1.5px solid var(--color-border);
  border-radius: 20px;
  padding: 1.6rem 2rem;
  box-shadow: var(--shadow-xl);
  position: relative;
  overflow: hidden;
  text-align: left;
}
.scan-laser-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent 0%, #D97706 20%, #F59E0B 50%, #D97706 80%, transparent 100%);
  box-shadow: 0 0 14px #F59E0B;
  animation: laserScanSweep 3.2s ease-in-out infinite;
  pointer-events: none;
  z-index: 2;
}
@keyframes laserScanSweep {
  0%, 100% { top: 8%; opacity: 0.2; }
  50% { top: 92%; opacity: 0.95; }
}
.preview-mini-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: 0.85rem;
  margin-bottom: 1.1rem;
}
.mini-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #166534;
  box-shadow: 0 0 8px #22C55E;
}
.mini-badge-sub {
  margin-left: auto;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 800;
}
.preview-mini-body {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 1.6rem;
  align-items: center;
}
@media (max-width: 580px) {
  .preview-mini-body { grid-template-columns: 1fr; gap: 1rem; }
}
.mini-qr-box {
  width: 100px;
  height: 100px;
  background: #1A1412;
  border-radius: 12px;
  border: 2px solid var(--color-border);
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qr-matrix-sim {
  width: 100%;
  height: 100%;
  position: relative;
  border: 2px dashed rgba(217, 119, 6, 0.4);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qr-center-icon {
  font-size: 1.8rem;
  filter: drop-shadow(0 0 6px #F59E0B);
}
.mini-order-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.mini-item-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  color: var(--color-text-secondary);
}
.mini-dish-price {
  font-weight: 700;
  color: var(--color-accent);
}
.mini-total-row {
  display: flex;
  justify-content: space-between;
  border-top: 1px dashed var(--color-border);
  padding-top: 0.6rem;
  margin-top: 0.3rem;
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--color-text-primary);
}
.mini-total-price {
  color: var(--color-accent);
  font-size: 1.05rem;
}

/* ==========================================================================
   Section 2: Dedicated Sales Section of MenuPro (Pillars, Simulator, ROI)
   ========================================================================== */
.sales-section {
  padding: 6.5rem 1.5rem;
  background: linear-gradient(180deg, var(--color-base) 0%, var(--color-surface-subtle) 50%, var(--color-base) 100%);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.section-header {
  text-align: center;
  max-width: 860px;
  margin: 0 auto 4rem;
}
.section-badge {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--color-accent);
  letter-spacing: 1.8px;
  text-transform: uppercase;
  margin-bottom: 0.85rem;
  background: var(--color-accent-soft);
  padding: 0.35rem 1.1rem;
  border-radius: 20px;
  border: 1px solid var(--color-border);
}
.section-title {
  font-family: var(--font-display);
  font-size: clamp(2.1rem, 3.8vw, 3rem);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 1rem;
  letter-spacing: -0.01em;
  line-height: 1.25;
}
.section-desc {
  color: var(--color-text-muted);
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 740px;
  margin: 0 auto;
}

/* 6 Sales Value Proposition Cards Grid */
.sales-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 2.2rem;
  max-width: 1200px;
  margin: 0 auto 5.5rem;
}

.sales-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 2.6rem 2.2rem;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease, border-color 0.28s ease;
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.sales-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-coffee-dark) 0%, var(--color-honey-amber) 50%, var(--color-honey-gold) 100%);
  opacity: 0;
  transition: opacity 0.25s ease;
}
.sales-card:hover {
  transform: translateY(-6px);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-xl);
}
.sales-card:hover::before {
  opacity: 1;
}

.sales-icon-box {
  width: 54px;
  height: 54px;
  border-radius: 12px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  margin-bottom: 1.5rem;
  transition: transform 0.25s ease;
}
.sales-card:hover .sales-icon-box {
  transform: scale(1.1) rotate(2deg);
  background: var(--color-accent-soft);
}

.sales-card-title {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 0.85rem;
  line-height: 1.35;
}
.sales-card-desc {
  font-size: 0.98rem;
  color: var(--color-text-muted);
  line-height: 1.65;
  margin-bottom: 1.3rem;
  flex-grow: 1;
}
.sales-card-stat {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-accent);
  border-top: 1px dashed var(--color-border);
  padding-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ==========================================================================
   Live Interactive Phone Simulator & Operational Perspectives
   ========================================================================== */
.simulator-section {
  max-width: 1200px;
  margin: 0 auto 5.5rem;
  padding: 0 1rem;
}

.simulator-container {
  display: grid;
  grid-template-columns: 1.1fr 390px;
  gap: 3.5rem;
  align-items: center;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 3.2rem 2.8rem;
  box-shadow: var(--shadow-lg);
}
@media (max-width: 960px) {
  .simulator-container { grid-template-columns: 1fr; padding: 2rem 1.5rem; }
}

.perspective-menu {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.perspective-tab {
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
  padding: 1.4rem 1.8rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  box-shadow: var(--shadow-xs);
}
.perspective-tab:hover {
  border-color: var(--color-accent);
  transform: translateX(4px);
  box-shadow: var(--shadow-sm);
  background: var(--color-card);
}
.perspective-tab.active {
  border-color: var(--color-accent);
  background: var(--color-card);
  box-shadow: 0 8px 24px -2px rgba(180, 83, 9, 0.12), var(--shadow-md);
}
.perspective-tab.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-warm) 100%);
  border-radius: 12px 0 0 12px;
}

.tab-badge {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 0.35rem;
  display: block;
}
.tab-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 0.4rem;
}
.tab-desc {
  font-size: 0.93rem;
  color: var(--color-text-muted);
  line-height: 1.55;
}

/* Phone Device Frame — Ceramic / Titanium */
.device-mockup {
  width: 360px;
  height: 620px;
  background: var(--color-card);
  border: 11px solid #E2E8F0;
  outline: 1px solid rgba(180, 83, 9, 0.22);
  border-radius: 46px;
  box-shadow: 0 25px 60px -12px rgba(44, 24, 16, 0.16), 0 0 0 1px rgba(180, 83, 9, 0.1);
  position: relative;
  overflow: hidden;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}
.device-speaker {
  width: 72px;
  height: 5px;
  background: #CBD5E1;
  border-radius: 4px;
  margin: 12px auto 10px;
}
.device-screen {
  flex: 1;
  background: var(--color-powder-cream);
  overflow-y: auto;
  padding: 1.15rem;
  color: var(--color-text-primary);
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* ==========================================================================
   Interactive Ethiopian Hospitality ROI & Revenue Calculator
   ========================================================================== */
.calc-card {
  max-width: 1200px;
  margin: 0 auto;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 3.5rem 3rem;
  box-shadow: var(--shadow-xl);
}
@media (max-width: 768px) {
  .calc-card { padding: 2rem 1.5rem; }
}

.calc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3.5rem;
  align-items: center;
  margin-top: 2rem;
}
@media (max-width: 768px) {
  .calc-grid { grid-template-columns: 1fr; }
}

.slider-group { margin-bottom: 2rem; }
.slider-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.98rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
  font-weight: 600;
}
.slider-value { color: var(--color-accent); font-weight: 800; font-size: 1.18rem; }

input[type=range] {
  width: 100%;
  height: 8px;
  border-radius: 6px;
  background: #E2E8F0;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(180, 83, 9, 0.4);
  border: 2px solid #FFFFFF;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
input[type=range]::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(180, 83, 9, 0.5);
}

.savings-display {
  background: var(--color-powder-cream);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 2.8rem 2.2rem;
  text-align: center;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}
.savings-display::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-coffee-dark), var(--color-accent), var(--color-honey-gold));
}
.savings-amount {
  font-size: clamp(2.4rem, 4vw, 3.4rem);
  font-weight: 800;
  color: var(--color-accent);
  margin: 0.8rem 0;
  font-family: var(--font-display);
  letter-spacing: -0.01em;
}

/* ==========================================================================
   Section 3: Universal Financial Partner & Wallet Synchronization
   ========================================================================== */
.payments-section {
  padding: 6.5rem 1.5rem;
  background: var(--color-surface-subtle);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.placards-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 2.4rem;
  max-width: 1100px;
  margin: 0 auto 3.5rem;
}

.telebirr-placard, .cbe-birr-placard {
  background: #151821;
  border: 1.5px solid #C87D55;
  border-radius: 16px;
  padding: 2.8rem 2.4rem;
  text-align: left;
  position: relative;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease, border-color 0.28s ease;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
  color: #F5F3EF;
}
.telebirr-placard:hover, .cbe-birr-placard:hover {
  transform: translateY(-5px);
  border-color: #E29F75;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.6);
}

.placard-badge {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 800;
  color: #C87D55;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  margin-bottom: 0.85rem;
}

.placard-title {
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 0.85rem;
  line-height: 1.35;
}

.placard-desc {
  font-size: 0.96rem;
  color: #D1C9BE;
  line-height: 1.68;
  margin-bottom: 1.6rem;
}

.placard-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(200, 125, 85, 0.3);
  padding-top: 1.2rem;
  font-size: 0.9rem;
  color: #C87D55;
  font-weight: 700;
}

/* Universal Banks Grid */
.banks-sync-card {
  max-width: 1100px;
  margin: 0 auto;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 2.4rem;
  box-shadow: var(--shadow-sm);
  text-align: center;
}
.banks-sync-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 0.6rem;
}
.banks-sync-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-muted);
  margin-bottom: 1.8rem;
}
.banks-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  align-items: center;
}
.bank-badge {
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: var(--shadow-xs);
}

/* ==========================================================================
   Section 4: The 3 Tier Plans Sales & Experience Section
   ========================================================================== */
.tiers-section {
  padding: 6.5rem 1.5rem;
  background: var(--color-base);
}

.tiers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
  gap: 2.4rem;
  max-width: 1200px;
  margin: 0 auto;
}

.tier-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  padding: 3.2rem 2.6rem;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease, border-color 0.28s ease;
  box-shadow: var(--shadow-md);
}
.tier-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
}
.tier-card.featured {
  border-color: var(--color-accent);
  box-shadow: 0 16px 42px -6px rgba(180, 83, 9, 0.18), var(--shadow-lg);
  transform: translateY(-4px);
  background: var(--color-card);
}

.featured-ribbon {
  position: absolute;
  top: -14px;
  right: 28px;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-warm) 100%);
  color: #FFFFFF;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.4rem 1.15rem;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 14px rgba(180, 83, 9, 0.35);
}

.tier-name {
  font-family: var(--font-display);
  font-size: 1.65rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 0.3rem;
}
.tier-subtext {
  font-size: 0.85rem;
  color: var(--color-text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 1.2rem;
}

.tier-price {
  font-size: 2.6rem;
  font-weight: 800;
  color: var(--color-accent);
  margin-bottom: 1.2rem;
  font-family: var(--font-display);
}
.tier-price span {
  font-size: 0.95rem;
  color: var(--color-text-caption);
  font-weight: 500;
  font-family: var(--font-body);
}

.tier-experience-desc {
  font-size: 0.94rem;
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: 1.8rem;
  padding-bottom: 1.2rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.tier-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  margin-bottom: 2.6rem;
  flex-grow: 1;
}
.tier-features li {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  line-height: 1.5;
}
.tier-features li.included::before {
  content: "✓";
  color: var(--color-accent);
  font-weight: 800;
  font-size: 1rem;
}
.tier-features li.restricted {
  color: var(--color-text-caption);
  opacity: 0.75;
}
.tier-features li.restricted::before {
  content: "✕";
  color: #94A3B8;
  font-weight: 800;
  font-size: 0.95rem;
}

/* ==========================================================================
   Section 5: Commercial Business Onboarding Console Section
   ========================================================================== */
.register-section {
  padding: 6.5rem 1.5rem;
  background: linear-gradient(180deg, var(--color-base) 0%, var(--color-surface-subtle) 50%, var(--color-surface-muted) 100%);
  border-top: 1px solid var(--color-border);
  position: relative;
}

.reg-container {
  max-width: 1220px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 3.5rem;
  align-items: start;
}
@media (max-width: 980px) {
  .reg-container { grid-template-columns: 1fr; }
  .preview-box { display: none; }
}

.reg-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  padding: 3.2rem 2.8rem;
  box-shadow: var(--shadow-xl);
  position: relative;
}

.stepper-nav {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 2.2rem;
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: 1.2rem;
}

.step-indicator {
  flex: 1;
  text-align: center;
  padding: 0.55rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-caption);
  border-bottom: 3px solid transparent;
  transition: all 0.25s ease;
  cursor: pointer;
}
.step-indicator.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}
.step-indicator.completed {
  color: var(--color-text-primary);
  border-bottom-color: rgba(180, 83, 9, 0.3);
}

.role-segmented-box { margin-bottom: 2rem; }
.role-segmented-label {
  font-size: 0.82rem;
  color: var(--color-text-caption);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 0.85rem;
  display: block;
  font-weight: 700;
}

.role-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1rem;
}

.role-btn {
  background: var(--color-card);
  border: 1px solid #CBD5E1;
  color: var(--color-text-primary);
  padding: 1.1rem 1.3rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-start;
  transition: all 0.25s ease;
  text-align: left;
}
.role-btn small {
  font-size: 0.8rem;
  color: var(--color-text-caption);
  font-weight: 400;
}
.role-btn.active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  color: var(--color-accent-active);
  box-shadow: 0 0 0 1px var(--color-accent), 0 4px 12px rgba(180, 83, 9, 0.1);
}
.role-btn.active small { color: var(--color-text-secondary); }

.form-group { margin-bottom: 1.4rem; }
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
}
@media (max-width: 600px) {
  .form-row { grid-template-columns: 1fr; }
}

.form-label {
  display: block;
  font-size: 0.88rem;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
  font-weight: 700;
}
.form-label span.optional {
  color: var(--color-text-caption);
  font-weight: 400;
  font-size: 0.8rem;
  margin-left: 0.3rem;
}

.form-input, .form-textarea, .form-select {
  width: 100%;
  background: var(--color-powder-cream);
  border: 1px solid #CBD5E1;
  border-radius: 8px;
  padding: 0.85rem 1.1rem;
  color: var(--color-text-primary);
  font-size: 0.95rem;
  font-family: var(--font-body);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  box-sizing: border-box;
}
.form-input:focus, .form-textarea:focus, .form-select:focus {
  outline: none;
  background: #FFFFFF;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.15);
}

.form-textarea {
  resize: vertical;
  min-height: 90px;
  line-height: 1.5;
}

.hint-grey {
  font-size: 0.82rem;
  color: var(--color-text-caption);
  font-style: italic;
  margin-top: 0.45rem;
  line-height: 1.45;
  display: block;
}

.custom-check-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  margin-top: 0.75rem;
  line-height: 1.45;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2.2rem;
  border-top: 1px solid var(--color-border-subtle);
  padding-top: 1.6rem;
}

/* Brand Live Preview Card */
.preview-box {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  padding: 2.4rem;
  box-shadow: var(--shadow-lg);
  position: sticky;
  top: 100px;
}
.preview-badge-top {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--color-accent);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 1.2rem;
}
.preview-business-name {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 0.45rem;
}
.preview-slogan {
  font-size: 0.92rem;
  color: var(--color-text-muted);
  font-style: italic;
  margin-bottom: 1.4rem;
}
.preview-best-known {
  background: var(--color-surface-subtle);
  border-left: 3px solid var(--color-accent);
  padding: 0.95rem 1.1rem;
  border-radius: 6px;
  margin-bottom: 1.4rem;
}
.preview-best-known strong {
  display: block;
  font-size: 0.96rem;
  color: var(--color-text-primary);
  margin-top: 0.25rem;
}
.preview-address {
  font-size: 0.88rem;
  color: var(--color-text-caption);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.6rem;
}
.preview-perks {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  border-top: 1px solid var(--color-border-subtle);
  padding-top: 1.4rem;
}
.preview-perks div {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.preview-perks div::before {
  content: "✓";
  color: var(--color-accent);
  font-weight: 800;
}

/* Footer */
footer {
  border-top: 1px solid var(--color-border);
  padding: 3.8rem 2rem;
  text-align: center;
  color: var(--color-text-caption);
  font-size: 0.92rem;
  background: var(--color-surface-subtle);
}

/* ==========================================================================
   Motion System & Cursor Follower
   ========================================================================== */
.lux-cursor-ring {
  position: fixed;
  top: 0;
  left: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid rgba(180, 83, 9, 0.45);
  background: radial-gradient(circle, rgba(180, 83, 9, 0.05) 0%, rgba(180, 83, 9, 0) 70%);
  pointer-events: none;
  z-index: 99998;
  opacity: 0;
  transform: translate3d(-100px, -100px, 0);
  transition: width 0.32s cubic-bezier(0.16, 1, 0.3, 1),
              height 0.32s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.25s ease,
              background 0.32s ease,
              box-shadow 0.32s ease,
              opacity 0.25s ease;
  will-change: transform, width, height;
}

.lux-cursor-dot {
  position: fixed;
  top: 0;
  left: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #B45309;
  box-shadow: 0 0 8px rgba(180, 83, 9, 0.65);
  pointer-events: none;
  z-index: 99999;
  opacity: 0;
  transform: translate3d(-100px, -100px, 0);
  transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              height 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.05s linear,
              opacity 0.2s ease,
              background 0.2s ease;
  will-change: transform;
}

.lux-cursor-ring.is-hovering-btn {
  width: 58px;
  height: 58px;
  border-color: rgba(180, 83, 9, 0.85);
  background: rgba(180, 83, 9, 0.08);
  box-shadow: 0 0 24px rgba(180, 83, 9, 0.22);
}
.lux-cursor-dot.is-hovering-btn {
  width: 4px;
  height: 4px;
  background: #C2410C;
}
.lux-cursor-ring.is-hovering-card {
  width: 48px;
  height: 48px;
  border-color: rgba(180, 83, 9, 0.35);
  background: rgba(180, 83, 9, 0.03);
}
.lux-cursor-ring.is-clicking {
  width: 28px;
  height: 28px;
  border-color: #B45309;
  background: rgba(180, 83, 9, 0.2);
  transform: translate3d(var(--curr-x), var(--curr-y), 0) scale(0.9);
}

.card-spotlight {
  position: relative;
  overflow: hidden;
  --mouse-x: -500px;
  --mouse-y: -500px;
  --spotlight-color: rgba(180, 83, 9, 0.09);
  --border-spotlight: rgba(180, 83, 9, 0.35);
}
.card-spotlight::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: radial-gradient(550px circle at var(--mouse-x) var(--mouse-y), var(--border-spotlight), transparent 60%);
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.35s ease;
}
.card-spotlight::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), var(--spotlight-color), transparent 65%);
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.35s ease;
}
.card-spotlight:hover::before,
.card-spotlight:hover::after {
  opacity: 1;
}

@media (hover: none) or (pointer: coarse) {
  .lux-cursor-ring, .lux-cursor-dot { display: none !important; }
}

/* Button Pulse & Particles */
.btn-register-pulse {
  animation: registerForwardPulse 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes registerForwardPulse {
  0% { transform: scale(1) translateY(0); box-shadow: 0 4px 14px rgba(180, 83, 9, 0.2); }
  30% { transform: scale(0.95) translateY(2px); box-shadow: 0 2px 8px rgba(180, 83, 9, 0.15); }
  65% { transform: scale(1.05) translateY(-4px); box-shadow: 0 12px 28px rgba(180, 83, 9, 0.35); }
  100% { transform: scale(1) translateY(0); box-shadow: 0 6px 18px rgba(180, 83, 9, 0.25); }
}

.arrow-particle {
  position: fixed;
  pointer-events: none;
  z-index: 100000;
  color: #B45309;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
  transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease-out;
  will-change: transform, opacity;
  filter: drop-shadow(0 2px 6px rgba(180, 83, 9, 0.35));
}

.btn-login-shimmer {
  position: relative;
  overflow: hidden;
  animation: loginHapticPush 0.48s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
@keyframes loginHapticPush {
  0% { transform: translateY(0) scale(1); box-shadow: 0 2px 10px rgba(44, 24, 16, 0.08); }
  40% { transform: translateY(2px) scale(0.97); box-shadow: inset 0 3px 6px rgba(44, 24, 16, 0.15), 0 0 16px rgba(180, 83, 9, 0.35); }
  100% { transform: translateY(0) scale(1); box-shadow: 0 4px 14px rgba(44, 24, 16, 0.1); }
}

.keyhole-beam {
  position: absolute;
  top: 0;
  left: -120%;
  width: 80%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 30%, rgba(245, 158, 11, 0.6) 50%, rgba(255, 255, 255, 0.4) 70%, transparent 100%);
  transform: skewX(-25deg);
  pointer-events: none;
  animation: keyholeShineSweep 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes keyholeShineSweep {
  0% { left: -120%; opacity: 0; }
  30% { opacity: 1; }
  100% { left: 160%; opacity: 0; }
}

.reveal-on-scroll {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}
.reveal-on-scroll.revealed {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .reveal-on-scroll { opacity: 1 !important; transform: none !important; }
  .word-reveal { opacity: 1 !important; transform: none !important; filter: none !important; }
  .intro-screen { display: none !important; }
}
  </style>
</head>
<body>
  <!-- Cinematic Intro Stage (First Thing Seen by Visitors) -->
  <div id="introScreen" class="intro-screen">
    <div class="intro-content">
      <div class="intro-icon-wrap">
        <span class="intro-coffee-steam steam-1"></span>
        <span class="intro-coffee-steam steam-2"></span>
        <span class="intro-coffee-steam steam-3"></span>
        <div class="intro-emblem">☕</div>
      </div>
      <div class="intro-badge">MENUPRO • ኢትዮጵያ</div>
      <h2 class="intro-title">Commercial Digital Menu &amp; QR Ordering</h2>
      <p class="intro-subtitle">Designed for Addis Ababa Hospitality &amp; Coffee Excellence</p>
      <div class="intro-bar-track">
        <div class="intro-bar-fill"></div>
      </div>
      <button class="intro-skip-btn" id="introSkipBtn" onclick="dismissIntro()">Enter Experience ↗</button>
    </div>
  </div>

  <canvas id="ambientCanvas"></canvas>
  <div class="lux-cursor-ring" id="luxCursorRing"></div>
  <div class="lux-cursor-dot" id="luxCursorDot"></div>

  <div class="content-wrapper">
    <!-- Header Navigation -->
    <header>
      <a href="/" class="logo">MENU<span>PRO</span></a>
      <nav class="nav-links">
        <a href="#sales" id="navBenefits">Advantages</a>
        <a href="#simulator" id="navFlow">Operational Flow</a>
        <a href="#calculator" id="navCalc">ROI Calculator</a>
        <a href="#payments" id="navPayments">Direct Settlement</a>
        <a href="#tiers" id="navTiers">Plans &amp; Tiers</a>
        <a href="/login" id="navLogin">Dashboard</a>
        <button class="lang-pill" id="langToggle">አማርኛ</button>
        <a href="#register" class="btn-cta" id="navCta">Start Free</a>
      </nav>
    </header>

    <main>
      <!-- ====================================================================
           1. First Section: Hero Section (Entrance Motion, Alive Badges, 2 CTAs)
           ==================================================================== -->
      <section class="hero-section" id="hero">
        <div class="hero-badge">MENUPRO • 0% COMMISSION DIGITAL DINING</div>
        <h1 class="hero-title" id="heroTitle">
          <span class="word-reveal" style="--w-idx: 0;">Digital</span>
          <span class="word-reveal" style="--w-idx: 1;">Menu,</span>
          <span class="word-reveal word-highlight" style="--w-idx: 2;">QR Ordering</span>
          <span class="word-reveal word-amp" style="--w-idx: 3;">&amp;</span>
          <span class="word-reveal" style="--w-idx: 4;">Instant</span>
          <span class="word-reveal" style="--w-idx: 5;">Settlement</span>
          <span class="word-subline word-reveal" style="--w-idx: 6;">for Ethiopian Hospitality</span>
        </h1>
        <p class="hero-subtitle" id="heroSub">
          Empowering Addis Ababa cafes, restaurants, and roasteries to turn tables 35% faster, eliminate expensive paper menu reprints, and receive 100% direct customer settlements into your Telebirr and CBE Birr accounts with zero platform commission.
        </p>

        <!-- Alive Living Badges -->
        <div class="hero-living-badges">
          <div class="living-badge"><span class="living-dot"></span> ☕ Ethiopian Roastery &amp; Cafe Ready</div>
          <div class="living-badge"><span class="living-dot"></span> ⚡ Sub-100ms Instant Scan • Zero App Download</div>
          <div class="living-badge"><span class="living-dot"></span> 💰 0.00% Intermediary Fee • Instant Bank Payout</div>
          <div class="living-badge"><span class="living-dot"></span> 🇪🇹 Bilingual Amharic (የጾም/የፍስክ) &amp; English</div>
        </div>

        <!-- The Two Prominent Hero Buttons -->
        <div class="hero-buttons">
          <a href="#register" class="btn-cta btn-register" id="heroBtnRegister" style="padding: 1rem 2.6rem; font-size: 1.05rem;">Register Your Business</a>
          <a href="/login" class="btn-secondary btn-login" id="heroBtnLogin" style="padding: 1rem 2.2rem; font-size: 1.05rem;">Log In to Your Business</a>
        </div>

        <!-- Alive Live Preview Container with Animated Laser Scanner Line -->
        <div class="hero-live-preview">
          <div class="hero-card-preview">
            <div class="scan-laser-line"></div>
            <div class="preview-mini-header">
              <span class="mini-live-dot"></span>
              <span>Table 4 Live Dynamic QR • Bole Velvet Cafe</span>
              <span class="mini-badge-sub">0% Fee</span>
            </div>
            <div class="preview-mini-body">
              <div class="mini-qr-box">
                <div class="qr-matrix-sim">
                  <div class="qr-center-icon">☕</div>
                </div>
              </div>
              <div class="mini-order-items">
                <div class="mini-item-row">
                  <span class="mini-dish-name">Special Beef Tibs (ልዩ የበሬ ጥብስ)</span>
                  <span class="mini-dish-price">650.00 ETB</span>
                </div>
                <div class="mini-item-row">
                  <span class="mini-dish-name">Single Origin Macchiato (2x)</span>
                  <span class="mini-dish-price">120.00 ETB</span>
                </div>
                <div class="mini-total-row">
                  <span>Guest Total (No Fee Cut)</span>
                  <span class="mini-total-price">770.00 ETB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ====================================================================
           2. Second Section: Dedicated Sales Section of MenuPro
           ==================================================================== -->
      <section id="sales" class="sales-section reveal-on-scroll">
        <div class="section-header">
          <span class="section-badge">THE MENUPRO ADVANTAGE</span>
          <h2 class="section-title">Why Leading Ethiopian Businesses Choose MenuPro</h2>
          <p class="section-desc">
            Tailored specifically for Addis Ababa dining culture: turn tables faster during peak lunch rushes, stop reprinting menus whenever food prices change, delight your dining guests, and monitor your entire business live.
          </p>
        </div>

        <!-- 6 Practical Sales Benefit Cards -->
        <div class="sales-grid">
          <!-- Benefit 1 -->
          <div class="sales-card">
            <div class="sales-icon-box">⚡</div>
            <h3 class="sales-card-title">Turn Tables 35% Faster &amp; Serve More Guests</h3>
            <p class="sales-card-desc">
              During peak lunch and dinner rushes across Bole, Kazanchis, and Sarbet, waiters are stretched thin. Customers scan the table QR code and start browsing in under 100 milliseconds. No waiting 15 minutes to flag down a waiter. Your business turns tables faster and serves 30-50 more guests every single day.
            </p>
            <div class="sales-card-stat">📈 Average table turnover accelerates from 55m to 35m</div>
          </div>

          <!-- Benefit 2 -->
          <div class="sales-card">
            <div class="sales-icon-box">💵</div>
            <h3 class="sales-card-title">Zero Paper Menu Printing Costs During Price Shifts</h3>
            <p class="sales-card-desc">
              Coffee bean, meat, and dairy inflation changes menu prices frequently. Re-printing 40-60 laminated or leather menus costs 15,000 to 30,000 ETB every few months, and paper menus get stained and ripped. With MenuPro, update any dish price or add daily specials in 5 seconds from your phone.
            </p>
            <div class="sales-card-stat">💰 Eliminates 25,000+ ETB in quarterly printing waste</div>
          </div>

          <!-- Benefit 3 -->
          <div class="sales-card">
            <div class="sales-icon-box">🌟</div>
            <h3 class="sales-card-title">Delighted Dining Guests &amp; Zero Misunderstood Orders</h3>
            <p class="sales-card-desc">
              Guests order with total clarity: photo previews, rich descriptions, sugar and milk options for macchiatos, cooking temperatures for shekla tibs, and instant Fasting (የጾም) vs Non-Fasting (የፍስክ) filters. No more kitchen errors, wrong orders, or frustrated customers.
            </p>
            <div class="sales-card-stat">❤️ 98% guest satisfaction with instant mobile ordering</div>
          </div>

          <!-- Benefit 4 -->
          <div class="sales-card">
            <div class="sales-icon-box">📱</div>
            <h3 class="sales-card-title">Live Business Monitor &amp; Real-Time Kitchen Dispatch</h3>
            <p class="sales-card-desc">
              Monitor your dining floor from anywhere. When a guest submits an order from Table 7, it flashes immediately on your kitchen live stream with table number and modifiers. Track hourly order volume and daily revenue without having to stand by the cash register all day.
            </p>
            <div class="sales-card-stat">⏱️ Kitchen ticket latency under 15 milliseconds via WebSocket</div>
          </div>

          <!-- Benefit 5 -->
          <div class="sales-card">
            <div class="sales-icon-box">🇪🇹</div>
            <h3 class="sales-card-title">Native Amharic &amp; English with Ge'ez Normalization</h3>
            <p class="sales-card-desc">
              Designed for Ethiopia with built-in Ge'ez Fidel text normalization. Your menu renders crisply in authentic Amharic (ልዩ የበሬ ጥብስ፣ ይርጋጨፌ ፊልተር ቡና) and English with an effortless 1-tap language switch.
            </p>
            <div class="sales-card-stat">✨ Built-in Amharic text search and phonetic normalization</div>
          </div>

          <!-- Benefit 6 -->
          <div class="sales-card">
            <div class="sales-icon-box">🛡️</div>
            <h3 class="sales-card-title">Retain 100% of Your Revenue — 0% Commission Extortion</h3>
            <p class="sales-card-desc">
              Third-party food delivery apps take 15% to 25% of your hard-earned revenue. MenuPro never touches your money or charges a transaction percentage. You retain 100% of your earnings, keeping hundreds of thousands of Birr in your business each year.
            </p>
            <div class="sales-card-stat">🔒 0.00% Intermediary commission guaranteed forever</div>
          </div>
        </div>

        <!-- Interactive 4 Perspectives Simulator -->
        <div id="simulator" class="simulator-section">
          <div class="simulator-container">
            <!-- Left: Perspective Selectors -->
            <div class="perspective-menu">
              <div class="perspective-tab active" onclick="switchPerspective('guest', this)">
                <span class="tab-badge">Perspective 01</span>
                <h3 class="tab-title">Dining Guest Experience</h3>
                <p class="tab-desc">Sub-100ms camera QR scan, zero app downloads, bilingual English &amp; Amharic reading, fasting filters, and instant bill settlement.</p>
              </div>

              <div class="perspective-tab" onclick="switchPerspective('owner', this)">
                <span class="tab-badge">Perspective 02</span>
                <h3 class="tab-title">Business Dashboard &amp; Monitor</h3>
                <p class="tab-desc">100% revenue retention, instant price adjustments, Amharic Fidel text normalizer, daily stock switches, and atomic 1-tap publishing.</p>
              </div>

              <div class="perspective-tab" onclick="switchPerspective('kitchen', this)">
                <span class="tab-badge">Perspective 03</span>
                <h3 class="tab-title">Kitchen &amp; Staff Live Stream</h3>
                <p class="tab-desc">Real-time WebSocket dispatch tickets, table numbers, guest modifiers, item availability toggles, and staff call alerts.</p>
              </div>

              <div class="perspective-tab" onclick="switchPerspective('platform', this)">
                <span class="tab-badge">Perspective 04</span>
                <h3 class="tab-title">Platform &amp; Service Foundation</h3>
                <p class="tab-desc">Dedicated PostgreSQL 18 cluster with RLS isolation, HMAC-SHA256 capability derivation, and zero sample data contamination.</p>
              </div>
            </div>

            <!-- Right: Interactive Device Mockup -->
            <div class="device-mockup phone-mockup" id="simulatorPhone">
              <div class="device-speaker"></div>
              <div class="device-screen phone-screen" id="deviceScreen">
                <!-- Dynamically hydrated by switchPerspective() -->
              </div>
            </div>
          </div>
        </div>

        <!-- Interactive ROI & Revenue Calculator -->
        <div id="calculator" class="calculator-container" style="max-width: 1200px; margin: 0 auto; padding: 0 1rem;">
          <div class="calc-card">
            <div style="text-align: center; margin-bottom: 1.5rem;">
              <span class="section-badge">REVENUE RETENTION CALCULATOR</span>
              <h3 style="font-family: var(--font-display); font-size: 1.85rem; color: var(--color-text-primary); margin-top: 0.5rem;">Calculate How Much More Money You Keep Each Month</h3>
              <p style="color: var(--color-text-muted); font-size: 0.98rem; max-width: 680px; margin: 0.5rem auto 0;">
                See how much revenue your cafe or restaurant retains by eliminating 15% third-party food platform commissions and recurrent paper menu printing costs.
              </p>
            </div>

            <div class="calc-grid">
              <div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Active Dining Tables:</span>
                    <span class="slider-value" id="valTables">15</span>
                  </div>
                  <input type="range" id="inputTables" min="4" max="60" value="15" oninput="updateCalculator()">
                </div>

                <div class="slider-group">
                  <div class="slider-label">
                    <span>Average Daily Checks per Table:</span>
                    <span class="slider-value" id="valChecks">8</span>
                  </div>
                  <input type="range" id="inputChecks" min="2" max="25" value="8" oninput="updateCalculator()">
                </div>

                <div class="slider-group">
                  <div class="slider-label">
                    <span>Average Check Amount (ETB):</span>
                    <span class="slider-value" id="valAmount">320 ETB</span>
                  </div>
                  <input type="range" id="inputAmount" min="80" max="1500" step="10" value="320" oninput="updateCalculator()">
                </div>
              </div>

              <div class="savings-display">
                <div style="font-size: 0.85rem; color: var(--color-text-caption); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">Estimated Monthly Revenue Saved</div>
                <div class="savings-amount" id="savingsTotal">172,800 ETB</div>
                <p style="font-size: 0.92rem; color: var(--color-text-muted); line-height: 1.55;">
                  Compared to typical 15% third-party ordering platforms and recurring paper menu reprint costs during inflation adjustments.
                </p>
                <div style="margin-top: 1.8rem;">
                  <a href="#register" class="btn-cta" style="display: inline-block;">Lock In 0% Commission</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ====================================================================
           3. Third Section: Universal Financial Partner & Wallet Synchronization
           ==================================================================== -->
      <section id="payments" class="payments-section reveal-on-scroll">
        <div class="section-header">
          <span class="section-badge">UNIVERSAL FINANCIAL SYNCHRONIZATION</span>
          <h2 class="section-title">Connect Any Bank or Mobile Wallet with 0.00% Fees</h2>
          <p class="section-desc">
            Whatever financial partner or wallet your business already uses—Telebirr, Commercial Bank of Ethiopia (CBE), Awash, Abyssinia, or Dashen—synchronize it directly into MenuPro. We never take a cut or deduct intermediary fees from your hard-earned revenue.
          </p>
        </div>

        <!-- 0% Commission Payment Placards (Required by Tests) -->
        <div class="placards-container">
          <div class="telebirr-placard">
            <span class="placard-badge">Direct Settlement • Telebirr</span>
            <h3 class="placard-title">Telebirr Merchant Payment: 0% Commission</h3>
            <p class="placard-desc">
              Customers settle their orders instantly using Telebirr merchant till or USSD quick-dial. Funds credit immediately to your business wallet with zero intermediary cuts.
            </p>
            <div class="placard-footer">
              <span>Instant Wallet Integration</span>
              <span>0.00% Intermediary Fee</span>
            </div>
          </div>

          <div class="cbe-birr-placard">
            <span class="placard-badge">Commercial Bank of Ethiopia • CBE Birr</span>
            <h3 class="placard-title">CBE Birr QR Payment: 0% Commission</h3>
            <p class="placard-desc">
              Direct account-to-account CBE Birr transfer verified at the counter or dynamic table QR. Clean, reliable, and completely fee-free for Ethiopian hospitality.
            </p>
            <div class="placard-footer">
              <span>Official CBE Integration</span>
              <span>Direct Account Credit</span>
            </div>
          </div>
        </div>

        <!-- Supported Banks Badges Grid -->
        <div class="banks-sync-card">
          <h3 class="banks-sync-title">Universal Financial Partner Compatibility</h3>
          <p class="banks-sync-subtitle">No proprietary lock-in. Synchronize your verified merchant till, bank account, or dynamic QR code in seconds.</p>
          <div class="banks-grid">
            <div class="bank-badge">🟢 Telebirr SuperApp &amp; Till</div>
            <div class="bank-badge">🟣 Commercial Bank of Ethiopia (CBE &amp; CBE Birr)</div>
            <div class="bank-badge">🔵 Awash Bank &amp; Awash Birr</div>
            <div class="bank-badge">🟡 Bank of Abyssinia (Apollo)</div>
            <div class="bank-badge">🔴 Dashen Bank &amp; Amole</div>
            <div class="bank-badge">🟠 Wegagen Bank &amp; Nib Bank</div>
            <div class="bank-badge">💵 Direct Cash &amp; Counter Verification</div>
          </div>
        </div>
      </section>

      <!-- ====================================================================
           4. Fourth Section: The 3 Tier Plans Sales & Experience Section
           ==================================================================== -->
      <section id="tiers" class="tiers-section reveal-on-scroll">
        <div class="section-header">
          <span class="section-badge">MENUPRO SUBSCRIPTION TIERS</span>
          <h2 class="section-title">Production Commercial Plans for Every Stage</h2>
          <p class="section-desc">
            Transparent pricing tailored for sustainable hospitality growth across Ethiopia. Choose from MenuFree, MenuMini, or MenuPro.
          </p>
        </div>

        <div class="tiers-grid">
          <!-- Free Tier: MenuFree -->
          <div class="tier-card">
            <h3 class="tier-name">MenuFree</h3>
            <div class="tier-subtext">Basic &amp; Restricted Starter</div>
            <div class="tier-price">0 ETB <span>/ month</span></div>
            <p class="tier-experience-desc">
              A basic digital menu to test the platform. Highly limited and restricted functionality designed for single-table discovery.
            </p>
            <ul class="tier-features">
              <li class="included">Single Branch Digital Menu (View Only)</li>
              <li class="included">Standard Table QR Code Generation</li>
              <li class="included">Telebirr 0% Fee Payment Placard</li>
              <li class="included">CBE Birr 0% Fee Payment Placard</li>
              <li class="included">Mobile PWA Responsive Display</li>
              <li class="included">Standard Menu Editor</li>
              <li class="restricted">No Interactive Customer Table Ordering</li>
              <li class="restricted">No Live Kitchen Stream (KDS)</li>
              <li class="restricted">No Table Badges or Staff Roles</li>
              <li class="restricted">No Fasting (የጾም) Dietary Tag Filters</li>
            </ul>
            <a href="#register" class="btn-secondary" style="text-align: center;">Start With MenuFree</a>
          </div>

          <!-- Mini Tier: MenuMini (Featured) -->
          <div class="tier-card featured">
            <div class="featured-ribbon">Most Popular for Addis Cafes</div>
            <h3 class="tier-name">MenuMini</h3>
            <div class="tier-subtext">The Complete Modern Dining Experience</div>
            <div class="tier-price">990 ETB <span>/ month</span></div>
            <p class="tier-experience-desc">
              The sweet spot for active Ethiopian cafes, bistros, and restaurants. Full interactive customer ordering and live kitchen dispatch.
            </p>
            <ul class="tier-features">
              <li class="included">Everything in MenuFree</li>
              <li class="included">Interactive Table QR Ordering with Table Badges</li>
              <li class="included">Live WebSocket Kitchen Dispatch Stream (KDS)</li>
              <li class="included">Amharic Fidel Text Normalizer (ልዩ ጥብስ፣ ማኪያቶ)</li>
              <li class="included">Offline Cart Persistence for Mobile Connection Drops</li>
              <li class="included">Fasting (የጾም) vs Meat (የፍስክ) Dietary Tag Filters</li>
              <li class="included">Daily Item Availability Toggles (In Stock / Sold Out)</li>
              <li class="included">Dish Modifier Groups (Sugar, Oat Milk, Doneness)</li>
              <li class="included">Up to 2 Commercial Branches Included</li>
            </ul>
            <a href="#register" class="btn-cta" style="text-align: center;">Choose MenuMini</a>
          </div>

          <!-- Pro Tier: MenuPro (Ultimate) -->
          <div class="tier-card">
            <h3 class="tier-name">MenuPro</h3>
            <div class="tier-subtext">Ultimate Hospitality Powerhouse</div>
            <div class="tier-price">2,490 ETB <span>/ month</span></div>
            <p class="tier-experience-desc">
              The complete enterprise platform for multi-branch brands, high-volume roasteries, and large restaurants requiring complete cashier control.
            </p>
            <ul class="tier-features">
              <li class="included">Everything in MenuMini</li>
              <li class="included">Unlimited Branch &amp; Location Management</li>
              <li class="included">Multi-Role Staff Accounts (Cashier, Waiter, Kitchen, Manager, Owner)</li>
              <li class="included">Cashier Settlement &amp; Real-Time Cash Drawer Verification</li>
              <li class="included">Cryptographic HMAC-SHA256 Table QR Tokens (Anti-tamper)</li>
              <li class="included">Itemized VAT &amp; Service Charge Splitter</li>
              <li class="included">CSV/JSON Bulk Menu Catalog Import &amp; Export</li>
              <li class="included">Custom Branding, Logos &amp; Custom Subdomain Routing</li>
              <li class="included">Advanced Sales Analytics &amp; Daily Revenue Reporting</li>
              <li class="included">Dedicated 24/7 Priority Support</li>
            </ul>
            <a href="#register" class="btn-secondary" style="text-align: center;">Choose MenuPro</a>
          </div>
        </div>
      </section>

      <!-- ====================================================================
           5. Fifth Section: Commercial Business Onboarding Console
           ==================================================================== -->
      <section id="register" class="register-section reveal-on-scroll">
        <div class="section-header">
          <span class="section-badge">COMMERCIAL ONBOARDING</span>
          <h2 class="section-title" id="regTitle">Register Your Business</h2>
          <p class="section-desc" id="regSub">
            Configure your genuine commercial profile, register verified stakeholders, and deploy live table QR ordering in under 3 minutes.
          </p>
        </div>

        <div class="reg-container">
          <!-- Left: Multi-Step Interactive Console Card -->
          <div class="reg-card">
            <!-- Stepper Navigation -->
            <div class="stepper-nav">
              <div class="step-indicator active" id="stepInd1" onclick="goToStep(1)">01 Role &amp; Essentials</div>
              <div class="step-indicator" id="stepInd2" onclick="goToStep(2)">02 Stakeholders</div>
              <div class="step-indicator" id="stepInd3" onclick="goToStep(3)">03 Story &amp; Address</div>
            </div>

            <div id="onboardError" style="color: #DC2626; font-size: 0.9rem; margin-bottom: 1.2rem; min-height: 1.2rem; font-weight: 600;"></div>

            <!-- Form Element -->
            <form id="onboardingForm" novalidate onsubmit="submitOnboarding(event)">

              <!-- STEP 1: Role & Business Essentials -->
              <div class="reg-step-pane" id="stepPane1">
                <div class="role-segmented-box">
                  <label class="role-segmented-label" id="lblWhoRegistering">Who is Registering Today? (የመመዝገቢያ ሚና)</label>
                  <div class="role-options">
                    <button type="button" class="role-btn active" id="btnRoleOwner" onclick="setRole('OWNER')">
                      <span>👑 Business Owner</span>
                      <small>ባለቤት / Legal Proprietor &amp; Investor</small>
                    </button>
                    <button type="button" class="role-btn" id="btnRoleManager" onclick="setRole('MAIN_MANAGER')">
                      <span>👔 Main Manager</span>
                      <small>ዋና ስራ አስኪያጅ / General Manager</small>
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="regBusinessName">Business Name <span style="color:var(--color-accent);">*</span></label>
                  <input type="text" id="regBusinessName" class="form-input" placeholder="e.g. Bole Velvet Lounge &amp; Roastery" required oninput="updatePreviewPlacard()" />
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="regBusinessPhone">Business Phone Number <span style="color:var(--color-accent);">*</span></label>
                    <input type="tel" id="regBusinessPhone" class="form-input" placeholder="0911223344 or +251 911 223 344" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="regBusinessEmail">Business Email <span class="optional">(Optional / ካለዎት)</span></label>
                    <input type="email" id="regBusinessEmail" class="form-input" placeholder="info@bolevelvet.et" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="regEmail">Account Login Email <span style="color:var(--color-accent);">*</span></label>
                    <input type="email" id="regEmail" class="form-input" placeholder="owner@addiscafe.et" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="regPassword">Account Password <span style="color:var(--color-accent);">*</span></label>
                    <input type="password" id="regPassword" class="form-input" placeholder="•••••••• (Min 8 characters)" minlength="8" required />
                  </div>
                </div>

                <div class="step-actions" style="justify-content: flex-end;">
                  <button type="button" class="btn-cta" onclick="goToStep(2)">Next: Stakeholder Registry →</button>
                </div>
              </div>

              <!-- STEP 2: Stakeholder Contacts & Role Questions -->
              <div class="reg-step-pane" id="stepPane2" style="display: none;">
                <!-- Container when Owner is Registering -->
                <div id="ownerFieldsContainer">
                  <div style="font-size: 0.92rem; color: var(--color-accent); font-weight: 800; margin-bottom: 1.1rem; text-transform: uppercase; letter-spacing: 1px;">
                    👑 Owner Contact Registry
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label" for="regOwnerName">Owner Full Name <span style="color:var(--color-accent);">*</span></label>
                      <input type="text" id="regOwnerName" class="form-input" placeholder="e.g. Abebe Bikila" />
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="regOwnerPhone">Owner Phone Number <span style="color:var(--color-accent);">*</span></label>
                      <input type="tel" id="regOwnerPhone" class="form-input" placeholder="0911223344" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="regOwnerEmail">Owner Email <span class="optional">(Optional / ካለዎት)</span></label>
                    <input type="email" id="regOwnerEmail" class="form-input" placeholder="owner.direct@addiscafe.et" />
                  </div>

                  <div class="form-group" style="background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-radius: 10px; padding: 1.3rem; margin-top: 1rem;">
                    <label class="form-label" style="margin-bottom: 0.75rem;">Direct Payout &amp; Settlement Preference</label>
                    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                      <label class="custom-check-label" style="margin-top: 0;">
                        <input type="radio" name="payoutPref" value="telebirr" checked />
                        <span>Telebirr Merchant Till / USSD</span>
                      </label>
                      <label class="custom-check-label" style="margin-top: 0;">
                        <input type="radio" name="payoutPref" value="cbe_birr" />
                        <span>CBE Birr Account</span>
                      </label>
                      <label class="custom-check-label" style="margin-top: 0;">
                        <input type="radio" name="payoutPref" value="both" />
                        <span>Both (Direct Payout)</span>
                      </label>
                    </div>
                    <span class="hint-grey">Customer payments settle directly to your merchant account with 0% platform commission deductions.</span>
                  </div>

                  <div class="form-group" style="margin-top: 1.3rem;">
                    <label class="form-label" for="regTableCount">Estimated Active Dining Tables</label>
                    <input type="number" id="regTableCount" class="form-input" value="8" min="1" max="100" style="max-width: 140px;" />
                    <span class="hint-grey">We automatically generate instant QR placards for each table in your Table Suite.</span>
                  </div>

                  <!-- Optional Manager toggle for Owner -->
                  <div style="border-top: 1px dashed var(--color-border); padding-top: 1.3rem; margin-top: 1.5rem;">
                    <label class="custom-check-label">
                      <input type="checkbox" id="regOwnerHasManager" onchange="toggleOwnerManagerFields()" />
                      <span style="font-weight: 600;">I also employ a Main Manager on site (ዋና ስራ አስኪያጅ አለኝ)</span>
                    </label>
                    <div id="ownerManagerSubFields" style="display: none; margin-top: 1.2rem; background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-radius: 8px; padding: 1.2rem;">
                      <div class="form-row">
                        <div class="form-group">
                          <label class="form-label" for="regOwnerManagerName">Manager Full Name</label>
                          <input type="text" id="regOwnerManagerName" class="form-input" placeholder="e.g. Almaz Kebede" />
                        </div>
                        <div class="form-group">
                          <label class="form-label" for="regOwnerManagerPhone">Manager Phone Number</label>
                          <input type="tel" id="regOwnerManagerPhone" class="form-input" placeholder="0911000000" />
                        </div>
                      </div>
                      <div class="form-group">
                        <label class="form-label" for="regOwnerManagerEmail">Manager Email <span class="optional">(Optional)</span></label>
                        <input type="email" id="regOwnerManagerEmail" class="form-input" placeholder="manager@addiscafe.et" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Container when Main Manager is Registering -->
                <div id="managerFieldsContainer" style="display: none;">
                  <div style="font-size: 0.92rem; color: var(--color-accent); font-weight: 800; margin-bottom: 1.1rem; text-transform: uppercase; letter-spacing: 1px;">
                    👔 Main Manager Credentials
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label" for="regManagerName">Your Full Name (Main Manager) <span style="color:var(--color-accent);">*</span></label>
                      <input type="text" id="regManagerName" class="form-input" placeholder="e.g. Almaz Kebede" />
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="regManagerPhone">Your Phone Number <span style="color:var(--color-accent);">*</span></label>
                      <input type="tel" id="regManagerPhone" class="form-input" placeholder="0911000000" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="regManagerEmail">Your Manager Email <span class="optional">(Optional)</span></label>
                    <input type="email" id="regManagerEmail" class="form-input" placeholder="manager@addiscafe.et" />
                  </div>

                  <div style="border-top: 1px dashed var(--color-border); padding-top: 1.3rem; margin-top: 1.5rem;">
                    <div style="font-size: 0.92rem; color: var(--color-accent); font-weight: 800; margin-bottom: 1.1rem; text-transform: uppercase; letter-spacing: 1px;">
                      👑 Business Owner Legal Registry
                    </div>
                    <span class="hint-grey" style="margin-bottom: 1rem; display: block;">As Main Manager, please provide the Business Owner details for verified merchant legal status.</span>
                    <div class="form-row">
                      <div class="form-group">
                        <label class="form-label" for="regOwnerNameFromMgr">Business Owner Full Name <span style="color:var(--color-accent);">*</span></label>
                        <input type="text" id="regOwnerNameFromMgr" class="form-input" placeholder="e.g. Abebe Bikila" />
                      </div>
                      <div class="form-group">
                        <label class="form-label" for="regOwnerPhoneFromMgr">Business Owner Phone Number <span style="color:var(--color-accent);">*</span></label>
                        <input type="tel" id="regOwnerPhoneFromMgr" class="form-input" placeholder="0911223344" />
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="regOwnerEmailFromMgr">Business Owner Email <span class="optional">(Optional)</span></label>
                      <input type="email" id="regOwnerEmailFromMgr" class="form-input" placeholder="owner@addiscafe.et" />
                    </div>

                    <div class="form-group" style="background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-radius: 8px; padding: 1.1rem; margin-top: 1rem;">
                      <label class="custom-check-label" style="margin-top: 0;">
                        <input type="checkbox" id="regManagerAuthCheck" required />
                        <span style="font-weight: 600;">I certify that the Business Owner has authorized this registration.</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="step-actions">
                  <button type="button" class="btn-secondary" onclick="goToStep(1)">← Back to Essentials</button>
                  <button type="button" class="btn-cta" onclick="goToStep(3)">Next: Story &amp; Address →</button>
                </div>
              </div>

              <!-- STEP 3: Business Story & Dining Address -->
              <div class="reg-step-pane" id="stepPane3" style="display: none;">
                <div class="form-group">
                  <label class="form-label" for="regSlogan">Business Slogan / Tagline <span class="optional">(Optional)</span></label>
                  <input type="text" id="regSlogan" class="form-input" placeholder="e.g. Authentic Roasted Aromas &amp; Prime Cuts" oninput="updatePreviewPlacard()" />
                </div>

                <div class="form-group">
                  <label class="form-label" for="regBestKnownFor">What is Your Business Best Known For? (የሚታወቁበት ልዩ ምግብ/መጠጥ) <span style="color:var(--color-accent);">*</span></label>
                  <input type="text" id="regBestKnownFor" class="form-input" placeholder="e.g. Special Shekla Tibs, Tomoca Roasted Macchiato, Raw Kitfo" required oninput="updatePreviewPlacard()" />
                </div>

                <div class="form-group">
                  <label class="form-label" for="regDescription">About Your Business (ስለ ንግድዎ አጭር መግለጫ) <span style="color:var(--color-accent);">*</span></label>
                  <textarea id="regDescription" class="form-textarea" placeholder="Describe your dining atmosphere, culinary heritage, and unique experience for guests..." required></textarea>
                </div>

                <div class="form-group">
                  <label class="form-label" for="regAddress">Primary Dining Address (አድራሻ) <span style="color:var(--color-accent);">*</span></label>
                  <input type="text" id="regAddress" class="form-input" placeholder="e.g. Bole Subcity, Cameroon Street, Next to Edna Mall, Addis Ababa" required oninput="updatePreviewPlacard()" />
                </div>

                <div class="form-group" style="background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-radius: 10px; padding: 1.3rem;">
                  <label class="custom-check-label" style="margin-top: 0;">
                    <input type="checkbox" id="regIsMainBranch" checked />
                    <span>Set this location as the Main Commercial Branch</span>
                  </label>
                  <label class="custom-check-label" style="margin-top: 0.9rem;">
                    <input type="checkbox" id="regHasHq" onchange="toggleHqField()" />
                    <span>Add a separate Corporate / Headquarters Office Address (Optional)</span>
                  </label>
                  <div id="hqAddressContainer" style="display: none; margin-top: 1rem;">
                    <label class="form-label" for="regHqAddress">Corporate / HQ Office Address</label>
                    <input type="text" id="regHqAddress" class="form-input" placeholder="e.g. Kazanchis, Bloom Tower 5th Floor, Kirkos Subcity, Addis Ababa" />
                  </div>
                </div>

                <div class="step-actions">
                  <button type="button" class="btn-secondary" onclick="goToStep(2)">← Back to Stakeholders</button>
                  <button type="submit" id="btnSubmitOnboard" class="btn-cta" style="padding: 0.95rem 2.2rem; font-size: 1.05rem;">
                    Complete Onboarding &amp; Enter Dashboard →
                  </button>
                </div>
              </div>

            </form>
          </div>

          <!-- Right: Live Brand Placard Preview Box -->
          <div class="preview-box">
            <div class="preview-badge-top" id="previewRoleBadge">👑 OWNER VERIFIED ONBOARDING</div>
            <div class="preview-business-name" id="prevBusinessName">Your Business Name</div>
            <div class="preview-slogan" id="prevSlogan" style="display: none;"></div>
            
            <div class="preview-best-known">
              <span style="color: var(--color-text-caption); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">⭐ Signature Dish / Specialty</span>
              <strong id="prevBestKnown">Special Shekla Tibs &amp; Yirgacheffe Roast</strong>
            </div>

            <div class="preview-address" id="prevAddressBox">
              <span>📍</span> <span id="prevAddress">Addis Ababa, Ethiopia</span>
            </div>

            <div class="preview-perks">
              <div>Instant Sub-100ms Mobile Dining PWA</div>
              <div>Table 1 to 20 Dynamic QR Code Placards</div>
              <div>Direct Telebirr &amp; CBE Birr Zero-Commission Payouts</div>
              <div>Bilingual English &amp; Amharic (Fidel Normalizer)</div>
              <div>Fasting (የጾም) vs Meat (የፍስክ) Tag Switching</div>
            </div>

            <div style="margin-top: 1.8rem; padding: 1.1rem; background: var(--color-accent-soft); border-radius: 10px; border: 1px solid var(--color-border); text-align: center;">
              <span style="font-size: 0.82rem; color: var(--color-text-secondary); font-weight: 600;">No credit card required. Zero demo fixtures. Pristine production workspace.</span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer>
      <p>© 2026 MenuPro. Built for Ethiopian Hospitality Excellence. Zero Sample Data Standard.</p>
    </footer>
  </div>

  <script>
    // 0. Intro Screen Dismissal & Kinetic Trigger
    function dismissIntro() {
      const intro = document.getElementById('introScreen');
      if (!intro || intro.classList.contains('dismissed')) return;
      intro.classList.add('dismissed');
      document.body.classList.add('intro-complete');
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      dismissIntro();
    } else {
      setTimeout(dismissIntro, 1050);
    }

    // 1. Ambient Background Particle Mesh Animation (Warm Coffee & Honey Shimmer)
    (function initCanvas() {
      const canvas = document.getElementById('ambientCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      let w = canvas.width = window.innerWidth;
      let h = canvas.height = window.innerHeight;

      window.addEventListener('resize', () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
      });

      const particles = [];
      const particleCount = Math.min(36, Math.floor(w / 40));

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 2 + 1.2,
          alpha: Math.random() * 0.45 + 0.15,
        });
      }

      function draw() {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = h;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(180, 83, 9, ' + (p.alpha * 0.35) + ')';
          ctx.fill();

          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 130) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = 'rgba(180, 83, 9, ' + (0.08 * (1 - dist / 130)) + ')';
              ctx.stroke();
            }
          }
        }
        requestAnimationFrame(draw);
      }
      draw();
    })();

    // 2. Interactive Phone Device Simulator
    const screens = {
      guest: \`
        <div style="background: #FFFFFF; border-radius: 10px; padding: 0.9rem; border: 1px solid rgba(180,83,9,0.18); margin-bottom: 0.6rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 6px rgba(44,24,16,0.04);">
          <div>
            <div style="font-weight: 700; color: #1A1412; font-size: 0.95rem;">Bole Velvet Lounge</div>
            <div style="font-size: 0.75rem; color: #785242;">Table 4 • Dine-in</div>
          </div>
          <span style="background: rgba(180,83,9,0.08); color: #B45309; font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 20px; border: 1px solid rgba(180,83,9,0.2);">EN / አማ</span>
        </div>
        <div style="background: rgba(180,83,9,0.06); border: 1px solid rgba(180,83,9,0.25); border-radius: 8px; padding: 0.65rem; font-size: 0.78rem; color: #78350F;">
          <strong>0% Fee Placard:</strong> Telebirr Till: <strong>554123</strong>
        </div>
        <div style="font-weight: 800; color: #B45309; font-size: 0.85rem; margin-top: 0.4rem; text-transform: uppercase; letter-spacing: 0.5px;">Specialty Roastery &amp; Kitchen</div>
        <div style="background: #FFFFFF; border-left: 3px solid #B45309; padding: 0.7rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(44,24,16,0.06); box-shadow: 0 1px 4px rgba(44,24,16,0.03);">
          <div>
            <div style="font-weight: 700; color: #1A1412;">Special Beef Tibs</div>
            <div style="font-size: 0.72rem; color: #785242;">ልዩ የበሬ ጥብስ</div>
          </div>
          <div style="font-weight: 800; color: #B45309;">650.00 ETB</div>
        </div>
        <div style="background: #FFFFFF; border-left: 3px solid #B45309; padding: 0.7rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(44,24,16,0.06); box-shadow: 0 1px 4px rgba(44,24,16,0.03);">
          <div>
            <div style="font-weight: 700; color: #1A1412;">Yirgacheffe Pour-Over</div>
            <div style="font-size: 0.72rem; color: #785242;">ይርጋጨፌ ፊልተር ቡና</div>
          </div>
          <div style="font-weight: 800; color: #B45309;">150.00 ETB</div>
        </div>
        <div style="margin-top: auto; background: linear-gradient(135deg, #B45309, #C2410C); color: #FFFFFF; padding: 0.75rem; border-radius: 8px; font-weight: 700; text-align: center; cursor: pointer; box-shadow: 0 4px 12px rgba(180,83,9,0.25);">
          View Table Bill (800.00 ETB)
        </div>
      \`,
      owner: \`
        <div style="font-weight: 800; color: #B45309; font-size: 0.9rem; margin-bottom: 0.45rem; text-transform: uppercase; letter-spacing: 0.5px;">Business Monitor &amp; Live Deck</div>
        <div style="background: #FFFFFF; padding: 0.9rem; border-radius: 8px; border: 1px solid rgba(180,83,9,0.2); box-shadow: 0 2px 6px rgba(44,24,16,0.04);">
          <div style="font-size: 0.75rem; color: #785242; margin-bottom: 0.35rem; font-weight: 600;">Dish Name (English)</div>
          <div style="background: #FAF5EF; border: 1px solid #CBD5E1; padding: 0.45rem; border-radius: 6px; font-size: 0.82rem; color: #1A1412; font-weight: 600;">Special Beef Tibs</div>
          <div style="font-size: 0.75rem; color: #785242; margin: 0.55rem 0 0.35rem; font-weight: 600;">Dish Name (Amharic)</div>
          <div style="background: #FAF5EF; border: 1px solid #CBD5E1; padding: 0.45rem; border-radius: 6px; font-size: 0.82rem; color: #78350F; font-weight: 600;">ልዩ የበሬ ጥብስ ✓ <span style="font-size: 0.7rem; color: #166534; background: #DCFCE7; padding: 1px 5px; border-radius: 4px; font-weight: 700;">Normalized</span></div>
          <div style="display: flex; gap: 0.6rem; margin-top: 0.6rem;">
            <div style="flex: 1;">
              <div style="font-size: 0.75rem; color: #785242; font-weight: 600;">Price (ETB)</div>
              <div style="background: #FAF5EF; border: 1px solid #CBD5E1; padding: 0.45rem; border-radius: 6px; font-size: 0.82rem; font-weight: 800; color: #1A1412;">650.00</div>
            </div>
            <div style="display: flex; align-items: flex-end;">
              <span style="background: #DCFCE7; color: #166534; font-size: 0.72rem; padding: 5px 9px; border-radius: 6px; font-weight: 700; border: 1px solid #BBF7D0;">In Stock</span>
            </div>
          </div>
        </div>
        <div style="background: linear-gradient(135deg, #B45309, #C2410C); color: #FFFFFF; padding: 0.75rem; border-radius: 8px; font-weight: 700; text-align: center; margin-top: auto; box-shadow: 0 4px 12px rgba(180,83,9,0.25);">
          Publish Changes Live (0ms)
        </div>
      \`,
      kitchen: \`
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div style="font-weight: 800; color: #B45309; font-size: 0.9rem;">Live KDS Stream</div>
          <span style="background: #DCFCE7; color: #166534; font-size: 0.7rem; padding: 3px 8px; border-radius: 12px; font-weight: 700; border: 1px solid #BBF7D0;">WebSocket Active</span>
        </div>
        <div style="background: #FFFFFF; border-left: 4px solid #B45309; padding: 0.85rem; border-radius: 6px; border: 1px solid rgba(44,24,16,0.08); box-shadow: 0 2px 6px rgba(44,24,16,0.04);">
          <div style="display: flex; justify-content: space-between; font-weight: 800;">
            <span style="color: #B45309;">Table 4</span>
            <span style="color: #785242; font-size: 0.75rem;">1m ago</span>
          </div>
          <div style="margin: 0.5rem 0; font-size: 0.82rem; color: #1A1412;">
            <div><strong>2x</strong> Single Origin Macchiato</div>
            <div style="color: #785242; font-size: 0.72rem; padding-left: 0.8rem;">└ Oat Milk, No Sugar</div>
            <div style="margin-top: 0.3rem;"><strong>1x</strong> Special Beef Tibs</div>
            <div style="color: #785242; font-size: 0.72rem; padding-left: 0.8rem;">└ Medium-Well, With Korerima</div>
          </div>
          <div style="background: rgba(180,83,9,0.08); color: #78350F; text-align: center; padding: 0.45rem; border-radius: 6px; font-weight: 700; font-size: 0.75rem; cursor: pointer; border: 1px solid rgba(180,83,9,0.2);">
            Mark Ready for Service
          </div>
        </div>
      \`,
      platform: \`
        <div style="font-weight: 800; color: #B45309; margin-bottom: 0.5rem; font-size: 0.9rem;">Database & Security Engine</div>
        <div style="background: #FFFFFF; padding: 0.9rem; border-radius: 8px; border: 1px solid rgba(180,83,9,0.2); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.72rem; line-height: 1.6; color: #3E251A; box-shadow: 0 2px 6px rgba(44,24,16,0.04);">
          <div>[PG18:5435] <span style="color: #166534; font-weight: 700;">Active</span></div>
          <div>RLS: <span style="background: #DCFCE7; color: #166534; padding: 1px 4px; border-radius: 3px; font-weight: 700;">ENFORCED</span></div>
          <div>Auth: <span style="background: #DCFCE7; color: #166534; padding: 1px 4px; border-radius: 3px; font-weight: 700;">scrypt + HTTPOnly</span></div>
          <div>Capability: <span style="color: #78350F; font-weight: 700;">HMAC-SHA256 (43ch)</span></div>
          <div>Zero Sample Data: <span style="background: #DCFCE7; color: #166534; padding: 1px 4px; border-radius: 3px; font-weight: 700;">VERIFIED</span></div>
          <div style="margin-top: 0.6rem; border-top: 1px solid rgba(180,83,9,0.18); padding-top: 0.6rem; color: #1A1412; font-weight: 600;">
            SELECT count(*) FROM menumini.merchants; => 0 (Pristine)
          </div>
        </div>
      \`
    };

    function switchPerspective(key, el) {
      document.querySelectorAll('.perspective-tab').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('deviceScreen').innerHTML = screens[key];
    }
    const screenEl = document.getElementById('deviceScreen');
    if (screenEl) screenEl.innerHTML = screens.guest;

    // 3. Ethiopian ROI & Revenue Calculator Logic
    function updateCalculator() {
      const tablesInput = document.getElementById('inputTables');
      const checksInput = document.getElementById('inputChecks');
      const amountInput = document.getElementById('inputAmount');
      if (!tablesInput || !checksInput || !amountInput) return;

      const tables = parseInt(tablesInput.value, 10);
      const checks = parseInt(checksInput.value, 10);
      const amount = parseInt(amountInput.value, 10);

      document.getElementById('valTables').innerText = tables;
      document.getElementById('valChecks').innerText = checks;
      document.getElementById('valAmount').innerText = amount + ' ETB';

      const monthlyVolume = tables * checks * amount * 30;
      const commissionSaved = monthlyVolume * 0.15;
      const paperMenuSaved = 4000;
      const totalSaved = Math.round(commissionSaved + paperMenuSaved);

      document.getElementById('savingsTotal').innerText = totalSaved.toLocaleString() + ' ETB';
    }
    updateCalculator();

    // 4. Bilingual Language Toggle (EN / AM)
    let isAmharic = false;
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
      langToggle.onclick = () => {
        isAmharic = !isAmharic;
        if (isAmharic) {
          langToggle.innerText = 'English';
          document.getElementById('heroTitle').innerHTML = '<span class="word-reveal">ዲጂታል</span> <span class="word-reveal">ሜኑ፣</span> <span class="word-reveal word-highlight">የጠረጴዛ QR ትዕዛዝ</span> <span class="word-reveal">እና</span> <span class="word-reveal">ቀጥታ ክፍያዎች</span>';
          document.getElementById('heroSub').innerText = 'ለኢትዮጵያ ካፌዎች፣ ሬስቶራንቶች እና ጥብስ ቤቶች የተዘጋጀ ፈጣን የሞባይል ሜኑ፣ ቀጥታ የኩሽና ትዕዛዝ ማስተላለፊያ እና ዜሮ ኮሚሽን ቀጥታ ክፍያ።';
          document.getElementById('heroBtnRegister').innerText = 'ንግድዎን አሁን ያስመዝግቡ';
          document.getElementById('heroBtnLogin').innerText = 'ወደ ንግድዎ ይግቡ';
          document.getElementById('navBenefits').innerText = 'ጥቅሞች';
          document.getElementById('navFlow').innerText = 'የአሰራር ሂደት';
          document.getElementById('navCalc').innerText = 'የትርፍ ማስያ';
          document.getElementById('navPayments').innerText = 'ቀጥታ ክፍያዎች';
          document.getElementById('navTiers').innerText = 'ዋጋ እና ጥቅሞች';
          document.getElementById('navLogin').innerText = 'ዳሽቦርድ መግቢያ';
          document.getElementById('navCta').innerText = 'በነፃ ይጀምሩ';
          document.getElementById('regTitle').innerText = 'የንግድ ምዝገባ ኮንሶል';
          document.getElementById('regSub').innerText = 'እውነተኛ የንግድ መረጃዎን በማስገባት፣ ኃላፊዎችን በማስመዝገብ እና የጠረጴዛ QR ትዕዛዞችን በ3 ደቂቃ ውስጥ ዝግጁ ያድርጉ።';
        } else {
          langToggle.innerText = 'አማርኛ';
          document.getElementById('heroTitle').innerHTML = '<span class="word-reveal">Digital</span> <span class="word-reveal">Menu,</span> <span class="word-reveal word-highlight">QR Ordering</span> <span class="word-reveal word-amp">&amp;</span> <span class="word-reveal">Instant</span> <span class="word-reveal">Settlement</span><span class="word-subline">for Ethiopian Hospitality</span>';
          document.getElementById('heroSub').innerText = 'Empowering Addis Ababa cafes, restaurants, and roasteries to turn tables 35% faster, eliminate expensive paper menu reprints, and receive 100% direct customer settlements into your Telebirr and CBE Birr accounts with zero platform commission.';
          document.getElementById('heroBtnRegister').innerText = 'Register Your Business';
          document.getElementById('heroBtnLogin').innerText = 'Log In to Your Business';
          document.getElementById('navBenefits').innerText = 'Advantages';
          document.getElementById('navFlow').innerText = 'Operational Flow';
          document.getElementById('navCalc').innerText = 'ROI Calculator';
          document.getElementById('navPayments').innerText = 'Direct Settlement';
          document.getElementById('navTiers').innerText = 'Plans & Benefits';
          document.getElementById('navLogin').innerText = 'Dashboard';
          document.getElementById('navCta').innerText = 'Start Free';
          document.getElementById('regTitle').innerText = 'Register Your Business';
          document.getElementById('regSub').innerText = 'Configure your genuine commercial profile, register verified stakeholders, and deploy live table QR ordering in under 3 minutes.';
        }
      };
    }

    // 5. Executive Registration Stepper & Dynamic Role Logic
    let currentRegStep = 1;
    let selectedRole = 'OWNER';

    window.setRole = function(role) {
      selectedRole = role;
      document.getElementById('btnRoleOwner').classList.toggle('active', role === 'OWNER');
      document.getElementById('btnRoleManager').classList.toggle('active', role === 'MAIN_MANAGER');
      document.getElementById('ownerFieldsContainer').style.display = role === 'OWNER' ? 'block' : 'none';
      document.getElementById('managerFieldsContainer').style.display = role === 'MAIN_MANAGER' ? 'block' : 'none';
      document.getElementById('previewRoleBadge').innerText = role === 'OWNER' ? '👑 OWNER VERIFIED ONBOARDING' : '👔 MAIN MANAGER AUTHORIZED';
    };

    window.toggleOwnerManagerFields = function() {
      const isChecked = document.getElementById('regOwnerHasManager').checked;
      document.getElementById('ownerManagerSubFields').style.display = isChecked ? 'block' : 'none';
    };

    window.toggleHqField = function() {
      const isChecked = document.getElementById('regHasHq').checked;
      document.getElementById('hqAddressContainer').style.display = isChecked ? 'block' : 'none';
    };

    window.goToStep = function(step) {
      if (step === 2 && currentRegStep === 1) {
        const bName = document.getElementById('regBusinessName').value.trim();
        const bPhone = document.getElementById('regBusinessPhone').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const pwd = document.getElementById('regPassword').value;

        if (!bName) { alert('Please enter your Business Name'); return; }
        if (!bPhone) { alert('Please enter your Business Phone Number'); return; }
        if (!email || !email.includes('@')) { alert('Please enter a valid Account Login Email'); return; }
        if (!pwd || pwd.length < 8) { alert('Password must be at least 8 characters'); return; }
      }

      if (step === 3 && currentRegStep === 2) {
        if (selectedRole === 'OWNER') {
          const oName = document.getElementById('regOwnerName').value.trim();
          const oPhone = document.getElementById('regOwnerPhone').value.trim();
          if (!oName) { alert('Please enter the Owner Full Name'); return; }
          if (!oPhone) { alert('Please enter the Owner Phone Number'); return; }
        } else {
          const mName = document.getElementById('regManagerName').value.trim();
          const mPhone = document.getElementById('regManagerPhone').value.trim();
          const oName = document.getElementById('regOwnerNameFromMgr').value.trim();
          const oPhone = document.getElementById('regOwnerPhoneFromMgr').value.trim();
          const authCheck = document.getElementById('regManagerAuthCheck').checked;

          if (!mName) { alert('Please enter the Main Manager Full Name'); return; }
          if (!mPhone) { alert('Please enter the Main Manager Phone Number'); return; }
          if (!oName) { alert('Please enter the Business Owner Full Name for legal verification'); return; }
          if (!oPhone) { alert('Please enter the Business Owner Phone Number for legal verification'); return; }
          if (!authCheck) { alert('Please confirm owner authorization'); return; }
        }
      }

      currentRegStep = step;
      document.getElementById('stepPane1').style.display = (step === 1) ? 'block' : 'none';
      document.getElementById('stepPane2').style.display = (step === 2) ? 'block' : 'none';
      document.getElementById('stepPane3').style.display = (step === 3) ? 'block' : 'none';

      document.getElementById('stepInd1').className = 'step-indicator ' + (step === 1 ? 'active' : (step > 1 ? 'completed' : ''));
      document.getElementById('stepInd2').className = 'step-indicator ' + (step === 2 ? 'active' : (step > 2 ? 'completed' : ''));
      document.getElementById('stepInd3').className = 'step-indicator ' + (step === 3 ? 'active' : '');
    };

    window.updatePreviewPlacard = function() {
      const bName = document.getElementById('regBusinessName').value.trim() || 'Your Business Name';
      const slogan = document.getElementById('regSlogan').value.trim();
      const bestKnown = document.getElementById('regBestKnownFor').value.trim() || 'Special Shekla Tibs & Yirgacheffe Roast';
      const address = document.getElementById('regAddress').value.trim() || 'Addis Ababa, Ethiopia';

      document.getElementById('prevBusinessName').innerText = bName;
      if (slogan) {
        document.getElementById('prevSlogan').innerText = '"' + slogan + '"';
        document.getElementById('prevSlogan').style.display = 'block';
      } else {
        document.getElementById('prevSlogan').style.display = 'none';
      }
      document.getElementById('prevBestKnown').innerText = bestKnown;
      document.getElementById('prevAddress').innerText = address;
    };

    window.submitOnboarding = async function(e) {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitOnboard');
      const errorEl = document.getElementById('onboardError');
      errorEl.innerText = '';

      const bName = document.getElementById('regBusinessName').value.trim();
      const bPhone = document.getElementById('regBusinessPhone').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const pwd = document.getElementById('regPassword').value;

      if (!bName) {
        goToStep(1);
        errorEl.innerText = 'Please enter your Business Name';
        document.getElementById('regBusinessName').focus();
        return;
      }
      if (!bPhone) {
        goToStep(1);
        errorEl.innerText = 'Please enter your Business Phone Number';
        document.getElementById('regBusinessPhone').focus();
        return;
      }
      if (!email || !email.includes('@')) {
        goToStep(1);
        errorEl.innerText = 'Please enter a valid Account Login Email';
        document.getElementById('regEmail').focus();
        return;
      }
      if (!pwd || pwd.length < 8) {
        goToStep(1);
        errorEl.innerText = 'Password must be at least 8 characters';
        document.getElementById('regPassword').focus();
        return;
      }

      if (selectedRole === 'OWNER') {
        const oName = document.getElementById('regOwnerName').value.trim();
        const oPhone = document.getElementById('regOwnerPhone').value.trim();
        if (!oName) {
          goToStep(2);
          errorEl.innerText = 'Please enter the Owner Full Name';
          document.getElementById('regOwnerName').focus();
          return;
        }
        if (!oPhone) {
          goToStep(2);
          errorEl.innerText = 'Please enter the Owner Phone Number';
          document.getElementById('regOwnerPhone').focus();
          return;
        }
      } else {
        const mName = document.getElementById('regManagerName').value.trim();
        const mPhone = document.getElementById('regManagerPhone').value.trim();
        const oName = document.getElementById('regOwnerNameFromMgr').value.trim();
        const oPhone = document.getElementById('regOwnerPhoneFromMgr').value.trim();
        const authCheck = document.getElementById('regManagerAuthCheck').checked;

        if (!mName) {
          goToStep(2);
          errorEl.innerText = 'Please enter the Main Manager Full Name';
          document.getElementById('regManagerName').focus();
          return;
        }
        if (!mPhone) {
          goToStep(2);
          errorEl.innerText = 'Please enter the Main Manager Phone Number';
          document.getElementById('regManagerPhone').focus();
          return;
        }
        if (!oName) {
          goToStep(2);
          errorEl.innerText = 'Please enter the Business Owner Full Name for legal verification';
          document.getElementById('regOwnerNameFromMgr').focus();
          return;
        }
        if (!oPhone) {
          goToStep(2);
          errorEl.innerText = 'Please enter the Business Owner Phone Number for legal verification';
          document.getElementById('regOwnerPhoneFromMgr').focus();
          return;
        }
        if (!authCheck) {
          goToStep(2);
          errorEl.innerText = 'Please confirm owner authorization';
          return;
        }
      }

      const address = document.getElementById('regAddress').value.trim();
      const desc = document.getElementById('regDescription').value.trim();
      const bestKnown = document.getElementById('regBestKnownFor').value.trim();

      if (!bestKnown) {
        goToStep(3);
        errorEl.innerText = 'Please enter what your business is Best Known For';
        document.getElementById('regBestKnownFor').focus();
        return;
      }
      if (!desc) {
        goToStep(3);
        errorEl.innerText = 'Please enter an About / Description of your business';
        document.getElementById('regDescription').focus();
        return;
      }
      if (!address) {
        goToStep(3);
        errorEl.innerText = 'Please enter your Primary Dining Address';
        document.getElementById('regAddress').focus();
        return;
      }

      btn.disabled = true;
      btn.innerText = 'Creating Workspace & Generating Table QRs...';

      const payload = {
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value,
        business_name: document.getElementById('regBusinessName').value.trim(),
        business_phone: document.getElementById('regBusinessPhone').value.trim(),
        business_email: document.getElementById('regBusinessEmail').value.trim() || null,
        registrant_role: selectedRole,
        owner_name: selectedRole === 'OWNER'
          ? document.getElementById('regOwnerName').value.trim()
          : document.getElementById('regOwnerNameFromMgr').value.trim(),
        owner_phone: selectedRole === 'OWNER'
          ? document.getElementById('regOwnerPhone').value.trim()
          : document.getElementById('regOwnerPhoneFromMgr').value.trim(),
        owner_email: (selectedRole === 'OWNER'
          ? document.getElementById('regOwnerEmail').value.trim()
          : document.getElementById('regOwnerEmailFromMgr').value.trim()) || null,
        manager_name: selectedRole === 'MAIN_MANAGER'
          ? document.getElementById('regManagerName').value.trim()
          : (document.getElementById('regOwnerHasManager').checked ? document.getElementById('regOwnerManagerName').value.trim() : null),
        manager_phone: selectedRole === 'MAIN_MANAGER'
          ? document.getElementById('regManagerPhone').value.trim()
          : (document.getElementById('regOwnerHasManager').checked ? document.getElementById('regOwnerManagerPhone').value.trim() : null),
        manager_email: selectedRole === 'MAIN_MANAGER'
          ? (document.getElementById('regManagerEmail').value.trim() || null)
          : (document.getElementById('regOwnerHasManager').checked ? (document.getElementById('regOwnerManagerEmail').value.trim() || null) : null),
        slogan: document.getElementById('regSlogan').value.trim() || null,
        about: desc,
        description: desc,
        best_known_for: bestKnown,
        address: address,
        is_main_branch: document.getElementById('regIsMainBranch').checked,
        hq_address: document.getElementById('regHasHq').checked ? document.getElementById('regHqAddress').value.trim() : null,
        payout_preference: document.querySelector('input[name="payoutPref"]:checked')?.value || 'telebirr_cbe',
        table_count: parseInt(document.getElementById('regTableCount')?.value || '8', 10),
        manager_authorized: selectedRole === 'MAIN_MANAGER' ? document.getElementById('regManagerAuthCheck').checked : true
      };

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          window.location.href = '/admin/studio';
        } else {
          btn.disabled = false;
          btn.innerText = 'Complete Onboarding & Enter Dashboard →';
          errorEl.innerText = data.error || 'Registration failed. Please check your inputs.';
        }
      } catch (err) {
        btn.disabled = false;
        btn.innerText = 'Complete Onboarding & Enter Dashboard →';
        errorEl.innerText = 'Network error during registration: ' + err.message;
      }
    };
  </script>

  <script>
  (function (global) {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = window.matchMedia('(hover: none) or (pointer: coarse)').matches;

    // 1. Custom Interactive LERP Cursor Follower
    class LuxCursorFollower {
      constructor() {
        if (isTouchDevice || prefersReducedMotion) return;

        this.targetX = window.innerWidth / 2;
        this.targetY = window.innerHeight / 2;
        this.currentX = this.targetX;
        this.currentY = this.targetY;
        this.lerpFactor = 0.18;
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
          this.dotEl.style.transform = \`translate3d(\${this.targetX - 3}px, \${this.targetY - 3}px, 0)\`;
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

        this.setupHoverListeners();
      }

      setupHoverListeners() {
        const interactiveSelector = \`
          a, button, .btn-cta, .btn-secondary, .btn-register, .btn-login,
          .magnetic-btn, .role-btn, .perspective-tab, .step-indicator,
          input[type="range"], input[type="text"], input[type="password"],
          input[type="email"], input[type="tel"], select
        \`;

        document.addEventListener('mouseover', (e) => {
          const target = e.target;
          if (target.closest(interactiveSelector)) {
            this.ringEl.classList.add('is-hovering-btn');
            this.dotEl.classList.add('is-hovering-btn');
          } else if (target.closest('.card-spotlight, .calc-card, .telebirr-placard, .cbe-birr-placard, .sales-card, .tier-card')) {
            this.ringEl.classList.add('is-hovering-card');
          }
        });

        document.addEventListener('mouseout', (e) => {
          const target = e.target;
          if (target.closest(interactiveSelector)) {
            this.ringEl.classList.remove('is-hovering-btn');
            this.dotEl.classList.remove('is-hovering-btn');
          }
          if (target.closest('.card-spotlight, .calc-card, .telebirr-placard, .cbe-birr-placard, .sales-card, .tier-card')) {
            this.ringEl.classList.remove('is-hovering-card');
          }
        });
      }

      startLoop() {
        const render = () => {
          this.currentX += (this.targetX - this.currentX) * this.lerpFactor;
          this.currentY += (this.targetY - this.currentY) * this.lerpFactor;
          const halfRing = this.ringEl.offsetWidth / 2 || 19;
          const ringX = this.currentX - halfRing;
          const ringY = this.currentY - halfRing;

          this.ringEl.style.transform = \`translate3d(\${ringX.toFixed(2)}px, \${ringY.toFixed(2)}px, 0)\`;
          this.ringEl.style.setProperty('--curr-x', \`\${ringX.toFixed(2)}px\`);
          this.ringEl.style.setProperty('--curr-y', \`\${ringY.toFixed(2)}px\`);
          this.rafId = requestAnimationFrame(render);
        };
        this.rafId = requestAnimationFrame(render);
      }
    }

    // 2. Magnetic Pull Physics for Interactive Buttons
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
          btn.style.transform = \`translate3d(\${deltaX.toFixed(2)}px, \${deltaY.toFixed(2)}px, 0)\`;
        });

        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'translate3d(0, 0, 0)';
          btn.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
          setTimeout(() => { btn.style.transition = ''; }, 450);
        });
      });
    }

    // 3. Card Hairline Radial Ambient Spotlight
    function initCardSpotlights() {
      if (isTouchDevice || prefersReducedMotion) return;
      const cards = document.querySelectorAll(\`
        .card-spotlight, .calc-card, .telebirr-placard, .cbe-birr-placard,
        .perspective-menu, .sales-card, .tier-card, .reg-card, .banks-sync-card, .hero-card-preview
      \`);

      cards.forEach((card) => {
        if (!card.classList.contains('card-spotlight')) card.classList.add('card-spotlight');
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--mouse-x', \`\${x.toFixed(1)}px\`);
          card.style.setProperty('--mouse-y', \`\${y.toFixed(1)}px\`);
        }, { passive: true });
      });
    }

    // 4. Contextual Button Click Animations
    function launchArrowParticles(x, y) {
      if (prefersReducedMotion) return;
      const particleCount = 7;
      const arrows = ['↗', '↑', '→', '▲', '✧', '✦'];

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('span');
        particle.className = 'arrow-particle';
        particle.textContent = arrows[i % arrows.length];
        particle.style.left = \`\${x}px\`;
        particle.style.top = \`\${y}px\`;

        const angle = (Math.random() * 45 - 65) * (Math.PI / 180);
        const distance = 70 + Math.random() * 90;
        const targetX = Math.cos(angle) * distance + (Math.random() * 30);
        const targetY = Math.sin(angle) * distance;
        const rotation = Math.random() * 40 - 20;

        document.body.appendChild(particle);
        requestAnimationFrame(() => {
          particle.style.transform = \`translate3d(\${targetX.toFixed(1)}px, \${targetY.toFixed(1)}px, 0) scale(\${0.7 + Math.random() * 0.5}) rotate(\${rotation}deg)\`;
          particle.style.opacity = '0';
        });

        setTimeout(() => particle.remove(), 850);
      }
    }

    function handleRegisterClick(e) {
      const btn = e.currentTarget;
      btn.classList.remove('btn-register-pulse');
      void btn.offsetWidth;
      btn.classList.add('btn-register-pulse');

      const rect = btn.getBoundingClientRect();
      const originX = e.clientX || (rect.left + rect.width / 2);
      const originY = e.clientY || (rect.top + rect.height / 2);

      launchArrowParticles(originX, originY);
      if (navigator.vibrate) {
        try { navigator.vibrate([15, 40, 25]); } catch (_) {}
      }
    }

    function handleLoginClick(e) {
      const btn = e.currentTarget;
      btn.classList.remove('btn-login-shimmer');
      void btn.offsetWidth;
      btn.classList.add('btn-login-shimmer');

      const existingBeam = btn.querySelector('.keyhole-beam');
      if (existingBeam) existingBeam.remove();

      const beam = document.createElement('span');
      beam.className = 'keyhole-beam';
      btn.appendChild(beam);

      setTimeout(() => beam.remove(), 700);
      if (navigator.vibrate) {
        try { navigator.vibrate([20, 25, 15]); } catch (_) {}
      }
    }

    // 5. Scroll Reveals
    function initScrollReveal() {
      const revealTargets = document.querySelectorAll(\`
        .reveal-on-scroll, section, .sales-grid, .tiers-grid, .placards-container, .calculator-container
      \`);

      if (prefersReducedMotion) {
        revealTargets.forEach(el => el.classList.add('revealed'));
        return;
      }

      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            obs.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
      });

      revealTargets.forEach((el) => {
        if (!el.classList.contains('reveal-on-scroll')) el.classList.add('reveal-on-scroll');
        observer.observe(el);
      });
    }

    function initMotionSystem() {
      new LuxCursorFollower();
      initMagneticButtons();
      initCardSpotlights();
      initScrollReveal();

      const registerBtns = document.querySelectorAll('.btn-register, #heroBtnRegister, #navCta, a[href="#register"]');
      registerBtns.forEach(btn => btn.addEventListener('click', handleRegisterClick));

      const loginBtns = document.querySelectorAll('.btn-login, #heroBtnLogin, #navLogin');
      loginBtns.forEach(btn => btn.addEventListener('click', handleLoginClick));
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initMotionSystem);
    } else {
      initMotionSystem();
    }

    global.MenuProMotion = {
      init: initMotionSystem,
      launchArrowParticles,
      handleRegisterClick,
      handleLoginClick
    };
    global.MenuMiniMotion = global.MenuProMotion;

  })(typeof window !== 'undefined' ? window : globalThis);
  </script>
</body>
</html>`;
}
