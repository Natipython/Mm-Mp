/**
 * Central Configuration for Mm-Mp E2E Test Suite
 * Respects PROJECT.md § Interface Contracts & Milestones
 */

export const CONFIG = {
  // Database Configuration
  db: {
    host: process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.PGPORT || '5435', 10),
    database: process.env.PGDATABASE || 'menumini_db',
    adminUser: process.env.PGADMIN_USER || 'menu_admin',
    adminPassword: process.env.PGADMIN_PASSWORD || 'menumini_admin_dev',
    merchantUser: process.env.PGMERCHANT_USER || 'menu_workspace_runtime',
    merchantPassword: process.env.PGMERCHANT_PASSWORD || 'menumini_merchant_dev',
    customerUser: process.env.PGCUSTOMER_USER || 'menu_customer',
    customerPassword: process.env.PGCUSTOMER_PASSWORD || 'menumini_customer_dev',
    guestUser: process.env.PGGUEST_USER || 'menu_guest_runtime',
    guestPassword: process.env.PGGUEST_PASSWORD || 'menumini_guest_dev',
    adminUrl: process.env.DATABASE_URL || 'postgres://menu_admin:menumini_admin_dev@127.0.0.1:5435/menumini_db?sslmode=disable',
    merchantUrl: process.env.MENU_MERCHANT_DATABASE_URL || 'postgres://menu_workspace_runtime:menumini_merchant_dev@127.0.0.1:5435/menumini_db?sslmode=disable',
    customerUrl: process.env.MENU_PUBLIC_DATABASE_URL || 'postgres://menu_customer:menumini_customer_dev@127.0.0.1:5435/menumini_db?sslmode=disable',
    guestUrl: process.env.MENU_GUEST_DATABASE_URL || 'postgres://menu_guest_runtime:menumini_guest_dev@127.0.0.1:5435/menumini_db?sslmode=disable',
  },

  // Microservices & PWA Endpoints
  services: {
    go: {
      baseUrl: process.env.GO_SERVICE_URL || 'http://127.0.0.1:8080',
      wsUrl: process.env.GO_WS_URL || 'ws://127.0.0.1:8080',
      port: 8080,
    },
    python: {
      baseUrl: process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5001',
      port: 5001,
    },
    web: {
      baseUrl: process.env.WEB_SERVICE_URL || 'http://127.0.0.1:5173',
      port: 5173,
    },
  },

  // Cryptographic Capability Constants
  crypto: {
    capabilityRegex: /^[A-Za-z0-9_-]{43}$/,
    hashRegex: /^[0-9a-f]{64}$/,
    defaultCapabilityKey: process.env.MENU_GUEST_CAPABILITY_KEY || 'menumini-guest-dev-key-32bytes-secret!',
  },

  // Color Design System Whitelist (strictly NO bright yellow #FFFF00/#EAB308 or bright blue #0000FF/#3B82F6)
  palette: {
    base: '#0E1015',
    card: '#151821',
    accent: '#C87D55',
    accentHover: '#B5653C',
    textPrimary: '#F5F3EF',
    textMuted: '#9E988D',
    forbiddenColors: ['#0000FF', '#3B82F6', '#005BBB', '#005CB9', '#FFFF00', '#EAB308'],
  },

  // Execution Timeouts
  timeouts: {
    request: 5000,
    wsMessage: 6000,
    dbQuery: 5000,
  },

  // Operational Mode: 'live' or 'simulation'
  mode: process.env.TEST_MODE || 'live',
};
