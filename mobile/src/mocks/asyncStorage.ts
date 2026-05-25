const store: Record<string, string> = {};

export default {
  getItem: async (key: string) => store[key] || null,
  setItem: async (key: string, value: string) => { store[key] = value; },
  removeItem: async (key: string) => { delete store[key]; },
  multiSet: async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { store[k] = v; }); },
  multiRemove: async (keys: string[]) => { keys.forEach((k) => { delete store[k]; }); },
};
