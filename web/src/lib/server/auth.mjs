/**
 * Authentication & Session Management for MenuMini Web PWA
 */
import crypto from 'node:crypto';
import { queryDb, executeCommand } from './db.mjs';

// In-memory active session lookup
const activeSessions = new Map();

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, originalHash] = stored.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

export function createSession(merchantId, businessId, businessSlug, email, userId) {
  const sessionId = `sess_${Date.now()}_${crypto.randomBytes(24).toString('base64url')}`;
  const session = {
    sessionId,
    merchantId,
    businessId,
    businessSlug,
    venueId: businessId, // backward-compatibility alias
    venueSlug: businessSlug, // backward-compatibility alias
    email,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400 * 1000, // 24 hours
  };
  activeSessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId) {
  if (!sessionId) return null;
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(sessionId);
    return null;
  }
  return session;
}

export function removeSession(sessionId) {
  if (sessionId) {
    activeSessions.delete(sessionId);
  }
}
