// ═══════════════════════════════════════
//  HELPER UTILITIES
// ═══════════════════════════════════════

/**
 * Random integer between a and b (inclusive)
 */
export const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

/**
 * Clamp value between min and max
 */
export const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

/**
 * Calculate level from XP
 */
export const levelFromXP = xp => Math.floor(Math.sqrt(xp / 60)) + 1;

/**
 * Calculate next level's XP requirement
 */
export const xpToNext = lvl => lvl * lvl * 60;

/**
 * Shuffle array in place
 */
export const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Calculate distance between two points
 */
export const distance = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Check if two positions are adjacent (Manhattan distance <= 1)
 */
export const isAdjacent = (x1, y1, x2, y2) => {
  return Math.abs(x2 - x1) <= 1 && Math.abs(y2 - y1) <= 1 && !(x1 === x2 && y1 === y2);
};
