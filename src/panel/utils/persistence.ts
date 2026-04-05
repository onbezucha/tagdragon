const PREFIX = 'rt_';

/**
 * Save a panel setting with chrome.storage.local fallback to localStorage.
 */
export async function savePanelSetting(key: string, value: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [PREFIX + key]: value });
  } catch {
    // fallback below
  }
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // localStorage may not be available in all contexts
  }
}

/**
 * Load a panel setting from chrome.storage.local with localStorage fallback.
 */
export async function loadPanelSetting(key: string, fallback = ''): Promise<string> {
  try {
    const result = await chrome.storage.local.get(PREFIX + key);
    if (result[PREFIX + key]) return result[PREFIX + key] as string;
  } catch {
    // fallback below
  }
  try {
    return localStorage.getItem(PREFIX + key) ?? fallback;
  } catch {
    return fallback;
  }
}
