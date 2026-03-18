// ─── ADOBE ENVIRONMENT SWITCHER ──────────────────────────────────────────────

import type { AdobeEnvState } from '@/types/request';
import { DOM, qsa } from '../utils/dom';
import { adobeEnvState } from '../state';
import { closeFilterPopover } from './filter-bar';

type AdobeDetected = AdobeEnvState['detected'];
type AdobeEnvConfig = Exclude<AdobeEnvState['config'], null>;
type AdobeEnvStorage = Record<string, AdobeEnvConfig>;

const DETECT_ADOBE_SCRIPT = `
(function() {
  var scripts = document.querySelectorAll('script[src]');
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src;
    if (src.indexOf('assets.adobedtm.com') !== -1 ||
        /launch-EN[a-f0-9]+/.test(src) ||
        /launch-[a-f0-9]+\\\\.min\\\\.js/.test(src) ||
        /satellite-[a-f0-9]+/.test(src)) {
      return JSON.stringify({ url: src, hostname: location.hostname });
    }
  }
  return null;
})()
`;

// ─── ENV DETECTION ────────────────────────────────────────────────────────

function parseAdobeLibraryUrl(url: string): Omit<AdobeDetected, 'url' | 'hostname'> {
  const envMatch = url.match(/launch-EN([a-f0-9]+)(?:-(development|staging))?\.min\.js/);
  const legacyMatch = url.match(/launch-([a-f0-9]+)(?:-(development|staging))?\.min\.js/);
  const satelliteMatch = url.match(/satellite-([a-f0-9]+)\.js/);

  const isDTM = !!satelliteMatch;
  const isNew = !!envMatch;
  const libraryId = envMatch?.[1] || legacyMatch?.[1] || satelliteMatch?.[1] || '';
  const rawEnv = envMatch?.[2] || legacyMatch?.[2] || 'production';

  let environment = 'prod';
  if (rawEnv === 'development') environment = 'dev';
  else if (rawEnv === 'staging') environment = 'acc';

  const type = isDTM ? 'DTM (legacy)' : isNew ? 'Adobe Tags' : 'Launch (legacy)';
  return { libraryId, environment, type };
}

function detectAdobeLibrary(): Promise<AdobeDetected | null> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval(DETECT_ADOBE_SCRIPT, (result?: any) => {
      if (!result) { resolve(null); return; }
      try {
        const data = JSON.parse(result);
        const parsed = parseAdobeLibraryUrl(data.url);
        resolve({ ...data, ...parsed });
      } catch { resolve(null); }
    });
  });
}

// ─── ENV STORAGE ──────────────────────────────────────────────────────────

async function loadEnvConfig(hostname: string): Promise<AdobeEnvConfig | null> {
  try {
    const stored = await chrome.storage.local.get('rt_adobe_env');
    return (stored.rt_adobe_env as AdobeEnvStorage)?.[hostname] || null;
  } catch { return null; }
}

async function saveEnvConfig(hostname: string, envConfig: AdobeEnvConfig): Promise<void> {
  try {
    const stored = await chrome.storage.local.get('rt_adobe_env');
    const all = (stored.rt_adobe_env as AdobeEnvStorage) || {};
    all[hostname] = envConfig;
    await chrome.storage.local.set({ rt_adobe_env: all });
  } catch {
    console.warn('Request Tracker: Env config save failed');
  }
}

async function clearEnvConfig(hostname: string): Promise<void> {
  try {
    const stored = await chrome.storage.local.get('rt_adobe_env');
    const all = (stored.rt_adobe_env as AdobeEnvStorage) || {};
    delete all[hostname];
    await chrome.storage.local.set({ rt_adobe_env: all });
  } catch {}
}

// ─── ENV UI HELPERS ───────────────────────────────────────────────────────

function updateEnvBadge(env: string, isWarning: boolean): void {
  const $envBadge = DOM.envBadge!;
  const $envSeparator = DOM.envSeparator;
  if (!$envBadge) return;
  
  $envBadge.classList.remove('hidden');
  if ($envSeparator) $envSeparator.style.display = '';

  const labels: Record<string, string> = { dev: 'DEV', acc: 'ACC', prod: 'PROD' };
  const $envBadgeLabel = $envBadge.querySelector('.env-badge-label') as HTMLElement;

  if (isWarning) {
    $envBadge.dataset.env = 'warning';
    if ($envBadgeLabel) $envBadgeLabel.textContent = labels[env] + ' \u26a0';
  } else {
    $envBadge.dataset.env = env;
    if ($envBadgeLabel) $envBadgeLabel.textContent = labels[env] || env.toUpperCase();
  }
}

function hideEnvBadge(): void {
  const $envBadge = DOM.envBadge!;
  const $envSeparator = DOM.envSeparator;
  if (!$envBadge) return;
  $envBadge.classList.add('hidden');
  if ($envSeparator) $envSeparator.style.display = 'none';
}

function validateEnvUrl(url: string): boolean {
  if (!url || !url.trim()) return false;
  return /assets\.adobedtm\.com|launch-[a-zA-Z0-9]|satellite-[a-f0-9]/.test(url);
}

function updateApplyButton(): void {
  const $envApply = DOM.envApply as HTMLButtonElement;
  const $envUrlDev = DOM.envUrlDev as HTMLInputElement;
  const $envUrlAcc = DOM.envUrlAcc as HTMLInputElement;
  if (!$envApply) return;
  
  const sel = adobeEnvState.selectedEnv;

  if (sel === 'prod') {
    $envApply.disabled = false;
    return;
  }

  const urlField = sel === 'dev' ? $envUrlDev : $envUrlAcc;
  $envApply.disabled = !validateEnvUrl(urlField?.value || '');
}

function renderEnvPopover(): void {
  const det = adobeEnvState.detected;
  const cfg = adobeEnvState.config;
  if (!det) return;

  const $envDetectedUrl = DOM.envDetectedUrl as HTMLElement;
  const $envDetectedType = DOM.envDetectedType as HTMLElement;
  const $envHostname = DOM.envHostname as HTMLElement;
  const $envUrlDev = DOM.envUrlDev as HTMLInputElement;
  const $envUrlAcc = DOM.envUrlAcc as HTMLInputElement;
  const $envUrlProd = DOM.envUrlProd as HTMLInputElement;

  if ($envDetectedUrl) {
    $envDetectedUrl.textContent = det.url.length > 60
      ? '\u2026' + det.url.slice(-55)
      : det.url;
    ($envDetectedUrl as HTMLElement).title = det.url;
  }
  if ($envDetectedType) $envDetectedType.textContent = det.type;
  if ($envHostname) $envHostname.textContent = det.hostname;

  if ($envUrlProd) $envUrlProd.value = cfg?.originalUrl || det.url;
  if (cfg?.urls) {
    if ($envUrlDev) $envUrlDev.value = cfg.urls.dev || '';
    if ($envUrlAcc) $envUrlAcc.value = cfg.urls.acc || '';
  } else {
    if ($envUrlDev) $envUrlDev.value = '';
    if ($envUrlAcc) $envUrlAcc.value = '';
  }

  const activeEnv = cfg?.active || 'prod';
  adobeEnvState.selectedEnv = activeEnv;
  qsa('.env-select-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.env === activeEnv);
  });

  updateApplyButton();
}

// ─── ENV SWITCH ───────────────────────────────────────────────────────────

function switchAdobeEnv(targetUrl: string): void {
  const safeUrl = targetUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const script = `
  (function() {
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src.indexOf('assets.adobedtm.com') !== -1 ||
          /launch-EN[a-f0-9]+/.test(src) ||
          /launch-[a-f0-9]+\\.min\\.js/.test(src) ||
          /satellite-[a-f0-9]+/.test(src)) {
        scripts[i].remove();
        var s = document.createElement('script');
        s.src = '${safeUrl}';
        s.async = true;
        document.head.appendChild(s);
        return 'replaced';
      }
    }
    return 'not_found';
  })()
  `;

  chrome.devtools.inspectedWindow.eval(script, (result?: string) => {
    if (result === 'replaced') {
      chrome.devtools.inspectedWindow.reload();
    }
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────

export async function initAdobeEnvSwitcher(): Promise<void> {
  const detected = await detectAdobeLibrary();
  if (!detected) {
    hideEnvBadge();
    return;
  }

  adobeEnvState.detected = detected;
  const cfg = await loadEnvConfig(detected.hostname);
  adobeEnvState.config = cfg;

  if (cfg && cfg.active !== 'prod') {
    updateEnvBadge(cfg.active, true);
  } else {
    updateEnvBadge(detected.environment, false);
  }
  
  setupEnvEventListeners();
}

function setupEnvEventListeners(): void {
  const $envBadge = DOM.envBadge as HTMLElement;
  const $envPopover = DOM.envPopover as HTMLElement;
  const $envUrlDev = DOM.envUrlDev as HTMLInputElement;
  const $envUrlAcc = DOM.envUrlAcc as HTMLInputElement;
  const $envApply = DOM.envApply as HTMLButtonElement;
  const $envReset = DOM.envReset as HTMLButtonElement;

  // Badge click → toggle popover
  if ($envBadge) {
    $envBadge.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      DOM.settingsPopover!.classList.remove('visible');
      if (typeof closeFilterPopover === 'function') closeFilterPopover();

      if ($envPopover.classList.contains('visible')) {
        $envPopover.classList.remove('visible');
        return;
      }

      renderEnvPopover();
      $envPopover.classList.add('visible');
    });
  }

  // Environment select buttons
  qsa('.env-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      adobeEnvState.selectedEnv = (btn as HTMLElement).dataset.env!;
      qsa('.env-select-btn').forEach(b => b.classList.toggle('active', b === btn));
      updateApplyButton();
    });
  });

  // Input change → validate
  [$envUrlDev, $envUrlAcc].forEach(input => {
    if (input) input.addEventListener('input', () => updateApplyButton());
  });

  // Apply button
  if ($envApply) {
    $envApply.addEventListener('click', async () => {
      const det = adobeEnvState.detected!;
      if (!det) return;

      const sel = adobeEnvState.selectedEnv!;
      const urls: Record<string, string> = {
        dev: ($envUrlDev?.value || '').trim(),
        acc: ($envUrlAcc?.value || '').trim(),
        prod: det.url,
      };

      const envConfig: AdobeEnvConfig = {
        active: sel,
        urls,
        originalUrl: adobeEnvState.config?.originalUrl || det.url,
        updatedAt: new Date().toISOString(),
      };

      await saveEnvConfig(det.hostname, envConfig);
      adobeEnvState.config = envConfig;

      const targetUrl = urls[sel];
      if (sel === 'prod') {
        switchAdobeEnv(envConfig.originalUrl);
      } else if (targetUrl) {
        switchAdobeEnv(targetUrl);
      }

      updateEnvBadge(sel, false);
      $envPopover.classList.remove('visible');
    });
  }

  // Reset button
  if ($envReset) {
    $envReset.addEventListener('click', async () => {
      const det = adobeEnvState.detected!;
      if (!det) return;

      const originalUrl = adobeEnvState.config?.originalUrl || det.url;

      await clearEnvConfig(det.hostname);
      adobeEnvState.config = null;
      adobeEnvState.selectedEnv = 'prod';

      if ($envUrlDev) $envUrlDev.value = '';
      if ($envUrlAcc) $envUrlAcc.value = '';
      qsa('.env-select-btn').forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.env === 'prod'));
      updateEnvBadge('prod', false);

      switchAdobeEnv(originalUrl);
      $envPopover.classList.remove('visible');
    });
  }

  // Close popover on outside click
  document.addEventListener('click', (e: MouseEvent) => {
    if ($envPopover && !$envPopover.contains(e.target as Node) && !(e.target as HTMLElement).closest('#adobe-env-badge')) {
      $envPopover.classList.remove('visible');
    }
  });
}
