/*
  Namespaced localStorage wrapper. Every module owns one key
  ("physio.v1", "tasks.v1", ...) — exportAll/importAll give whole-app
  JSON backups regardless of how many modules exist.
*/
const PREFIX = "hq.";

export const store = {
  get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  exportAll() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        try {
          out[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k));
        } catch {
          /* skip unparseable */
        }
      }
    }
    return out;
  },
  importAll(obj) {
    Object.entries(obj).forEach(([k, v]) => {
      localStorage.setItem(PREFIX + k, JSON.stringify(v));
    });
  },
};
