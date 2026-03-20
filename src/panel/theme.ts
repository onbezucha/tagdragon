// ─── THEME MANAGEMENT ────────────────────────────────────────────────────────

type Theme = 'dark' | 'light';

let currentTheme: Theme = 'dark';

async function loadTheme(): Promise<Theme> {
  try {
    const stored = await chrome.storage.local.get('rt_theme');
    return (stored.rt_theme as Theme) || 'dark';
  } catch {
    return 'dark';
  }
}

async function saveTheme(theme: Theme): Promise<void> {
  try {
    await chrome.storage.local.set({ rt_theme: theme });
  } catch {
    // non-fatal
  }
}

function applyTheme(theme: Theme, animate = true): void {
  currentTheme = theme;

  if (!animate) {
    document.body.classList.add('no-transition');
  }

  // Dark mode = remove attribute (CSS :root defines dark defaults)
  // Light mode = set data-theme="light"
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  updateThemeUI();

  if (!animate) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove('no-transition');
      });
    });
  }
}

function updateThemeUI(): void {
  const darkBtn = document.getElementById('theme-dark');
  const lightBtn = document.getElementById('theme-light');
  darkBtn?.classList.toggle('active', currentTheme === 'dark');
  lightBtn?.classList.toggle('active', currentTheme === 'light');
}

function toggleTheme(): void {
  const next: Theme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(next, true);
  void saveTheme(next);
}

export async function initTheme(): Promise<void> {
  const theme = await loadTheme();
  applyTheme(theme, false);

  document.getElementById('theme-dark')?.addEventListener('click', () => {
    applyTheme('dark', true);
    void saveTheme('dark');
  });

  document.getElementById('theme-light')?.addEventListener('click', () => {
    applyTheme('light', true);
    void saveTheme('light');
  });

  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    toggleTheme();
  });
}
