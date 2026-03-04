// ═══════════════════════════════════════
//  STORAGE UTILITIES
// ═══════════════════════════════════════

/**
 * Read leaderboard from storage (window.storage or localStorage)
 */
export const readLocalLB = async () => {
  try {
    if (window.storage && typeof window.storage.get === 'function') {
      const r = await window.storage.get("osrpg_v5_lb");
      return r ? JSON.parse(r.value) : [];
    }
  } catch (e) {
    console.warn("window.storage.get failed:", e.message);
  }
  try {
    const s = localStorage.getItem("osrpg_v5_lb");
    return s ? JSON.parse(s) : [];
  } catch (e) {
    console.warn("localStorage.getItem failed:", e.message);
    return [];
  }
};

/**
 * Write leaderboard to storage
 */
export const writeLocalLB = async (arr) => {
  try {
    if (window.storage && typeof window.storage.set === 'function') {
      await window.storage.set("osrpg_v5_lb", JSON.stringify(arr));
      return true;
    }
  } catch (e) {
    console.warn("window.storage.set failed:", e.message);
  }
  try {
    localStorage.setItem("osrpg_v5_lb", JSON.stringify(arr));
    return true;
  } catch (e) {
    console.warn("localStorage.setItem failed:", e.message);
    return false;
  }
};

/**
 * Read generic key-value from storage
 */
export const readStorage = async (key) => {
  try {
    if (window.storage && typeof window.storage.get === 'function') {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : null;
    }
  } catch (e) {
    console.warn("window.storage.get failed:", e.message);
  }
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    console.warn("localStorage.getItem failed:", e.message);
    return null;
  }
};

/**
 * Write generic key-value to storage
 */
export const writeStorage = async (key, val) => {
  try {
    if (window.storage && typeof window.storage.set === 'function') {
      await window.storage.set(key, JSON.stringify(val));
      return true;
    }
  } catch (e) {
    console.warn("window.storage.set failed:", e.message);
  }
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch (e) {
    console.warn("localStorage.setItem failed:", e.message);
    return false;
  }
};
