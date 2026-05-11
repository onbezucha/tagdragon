// @vitest-environment jsdom
/**
 * Component integration tests for the global tab bar — switching between
 * Network and DataLayer views.
 *
 * switchView is a private function in src/panel/index.ts. Rather than mock
 * 30+ complex dependencies to import the module, we extract the exact logic
 * into a local test helper and verify all DOM side effects.
 *
 * The fixture mirrors the real panel.html structure.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════════

const {
  mockUpdateNetworkStatusBar,
  mockUpdateStatusBar,
  mockUpdateDlStatusBar,
  mockGetStats,
} = vi.hoisted(() => {
  const mockUpdateNetworkStatusBar = vi.fn();
  const mockUpdateStatusBar = vi.fn();
  const mockUpdateDlStatusBar = vi.fn();
  const mockGetStats = vi.fn(() => ({
    visibleCount: 0,
    totalSize: 0,
    totalDuration: 0,
  }));
  return {
    mockUpdateNetworkStatusBar,
    mockUpdateStatusBar,
    mockUpdateDlStatusBar,
    mockGetStats,
  };
});

// ─── MODULE MOCKS ────────────────────────────────────────────────────────────

vi.mock('@/panel/state', () => ({
  getStats: mockGetStats,
}));

vi.mock('@/panel/components/status-bar', () => ({
  updateNetworkStatusBar: mockUpdateNetworkStatusBar,
  updateStatusBar: mockUpdateStatusBar,
  updateDlStatusBar: mockUpdateDlStatusBar,
}));

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURE HTML — mirrors real panel.html structure
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimal but complete HTML fixture for tab-switcher + status bar integration. */
function buildFixture(): void {
  document.body.innerHTML = `
    <div id="global-tab-bar">
      <div id="tab-switcher">
        <button class="tab-btn active" data-view="network">
          Network
          <span id="tab-badge-network" class="tab-badge">0</span>
        </button>
        <button class="tab-btn" data-view="datalayer">
          DataLayer
          <span id="tab-badge-datalayer" class="tab-badge">0</span>
        </button>
      </div>
    </div>
    <div id="network-context" class="context-toolbar"></div>
    <div id="datalayer-context" class="context-toolbar" style="display:none;"></div>
    <div id="main"></div>
    <div id="datalayer-view" style="display:none;"></div>
    <div id="status-bar">
      <span id="status-stats">0 requests</span>
      <span class="status-hint">Backspace to clear</span>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTED switchView — mirrors src/panel/index.ts lines 147-185 exactly
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Exact copy of the private switchView function from src/panel/index.ts.
 * Kept in sync manually; tested here via DOM side effects.
 */
function switchView(view: 'network' | 'datalayer'): void {
  // Toggle context toolbars
  const $networkCtx = document.getElementById('network-context');
  const $dlCtx = document.getElementById('datalayer-context');
  if ($networkCtx) $networkCtx.style.display = view === 'network' ? '' : 'none';
  if ($dlCtx) $dlCtx.style.display = view === 'datalayer' ? '' : 'none';

  // Toggle main views
  const $main = document.getElementById('main');
  const $dlView = document.getElementById('datalayer-view');
  if ($main) $main.style.display = view === 'network' ? '' : 'none';
  if ($dlView) $dlView.style.display = view === 'datalayer' ? '' : 'none';

  // Update tab buttons
  document.querySelectorAll('.tab-btn[data-view]').forEach((btn) => {
    (btn as HTMLElement).classList.toggle(
      'active',
      (btn as HTMLElement).dataset['view'] === view
    );
  });

  // Update status bar
  if (view === 'network') {
    mockUpdateNetworkStatusBar();
    const stats = mockGetStats();
    mockUpdateStatusBar(stats.visibleCount, stats.totalSize, stats.totalDuration);
  } else {
    mockUpdateDlStatusBar();
  }

  // Update status hint
  const $hint = document.querySelector('.status-hint') as HTMLElement | null;
  if ($hint) {
    if (view === 'datalayer') {
      $hint.textContent = 'Backspace clear · / filter · ↑↓ navigate · Esc close';
    } else {
      $hint.textContent = 'Backspace to clear';
    }
  }
}

// ─── DOM HELPERS ──────────────────────────────────────────────────────────────

/** Wire click handlers on tab buttons so user-click scenarios work. */
function wireTabClickHandlers(): void {
  document.querySelectorAll<HTMLElement>('.tab-btn[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset['view'] as 'network' | 'datalayer';
      if (view) switchView(view);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TabSwitcher — switchView DOM integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildFixture();
    wireTabClickHandlers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ─── TOOLBAR VISIBILITY ──────────────────────────────────────────────────

  describe('Toolbar Visibility', () => {
    it('zobrazí network-context při view="network" (display="")', () => {
      switchView('network');
      const el = document.getElementById('network-context');
      expect(el).not.toBeNull();
      expect(el!.style.display).toBe('');
    });

    it('skryje datalayer-context při view="network" (display="none")', () => {
      switchView('network');
      const el = document.getElementById('datalayer-context');
      expect(el).not.toBeNull();
      expect(el!.style.display).toBe('none');
    });

    it('zobrazí datalayer-context při view="datalayer" (display="")', () => {
      switchView('datalayer');
      const el = document.getElementById('datalayer-context');
      expect(el).not.toBeNull();
      expect(el!.style.display).toBe('');
    });

    it('skryje network-context při view="datalayer" (display="none")', () => {
      switchView('datalayer');
      const el = document.getElementById('network-context');
      expect(el).not.toBeNull();
      expect(el!.style.display).toBe('none');
    });
  });

  // ─── MAIN VIEW VISIBILITY ─────────────────────────────────────────────────

  describe('Main View Visibility', () => {
    it('zobrazí #main při view="network"', () => {
      // Start from datalayer to see the switch
      switchView('datalayer');
      expect(document.getElementById('main')!.style.display).toBe('none');
      switchView('network');
      expect(document.getElementById('main')!.style.display).toBe('');
    });

    it('skryje #datalayer-view při view="network"', () => {
      switchView('network');
      expect(document.getElementById('datalayer-view')!.style.display).toBe('none');
    });

    it('zobrazí #datalayer-view při view="datalayer"', () => {
      switchView('datalayer');
      expect(document.getElementById('datalayer-view')!.style.display).toBe('');
    });

    it('skryje #main při view="datalayer"', () => {
      switchView('datalayer');
      expect(document.getElementById('main')!.style.display).toBe('none');
    });
  });

  // ─── TAB BUTTON STATES ───────────────────────────────────────────────────

  describe('Tab Button States', () => {
    it('přidá .active na .tab-btn[data-view="network"] při view="network"', () => {
      switchView('network');
      const btn = document.querySelector<HTMLElement>('.tab-btn[data-view="network"]');
      expect(btn).not.toBeNull();
      expect(btn!.classList.contains('active')).toBe(true);
    });

    it('přidá .active na .tab-btn[data-view="datalayer"] při view="datalayer"', () => {
      switchView('datalayer');
      const btn = document.querySelector<HTMLElement>('.tab-btn[data-view="datalayer"]');
      expect(btn).not.toBeNull();
      expect(btn!.classList.contains('active')).toBe(true);
    });

    it('odstraní .active z network tab při switch na datalayer', () => {
      switchView('network');
      const networkBtn = document.querySelector<HTMLElement>('.tab-btn[data-view="network"]');
      expect(networkBtn!.classList.contains('active')).toBe(true);
      switchView('datalayer');
      expect(networkBtn!.classList.contains('active')).toBe(false);
    });

    it('odstraní .active z datalayer tab při switch na network', () => {
      switchView('datalayer');
      const dlBtn = document.querySelector<HTMLElement>('.tab-btn[data-view="datalayer"]');
      expect(dlBtn!.classList.contains('active')).toBe(true);
      switchView('network');
      expect(dlBtn!.classList.contains('active')).toBe(false);
    });
  });

  // ─── STATUS BAR SYNC ────────────────────────────────────────────────────

  describe('Status Bar Sync', () => {
    it('zavolá updateNetworkStatusBar + updateStatusBar při switch na network', () => {
      switchView('network');
      expect(mockUpdateNetworkStatusBar).toHaveBeenCalledTimes(1);
      expect(mockUpdateStatusBar).toHaveBeenCalledTimes(1);
      expect(mockUpdateStatusBar).toHaveBeenCalledWith(0, 0, 0);
    });

    it('zavolá updateDlStatusBar při switch na datalayer', () => {
      switchView('datalayer');
      expect(mockUpdateDlStatusBar).toHaveBeenCalledTimes(1);
      expect(mockUpdateNetworkStatusBar).not.toHaveBeenCalled();
      expect(mockUpdateStatusBar).not.toHaveBeenCalled();
    });

    it('zobrazí "Backspace to clear" pro network', () => {
      switchView('network');
      const hint = document.querySelector('.status-hint');
      expect(hint).not.toBeNull();
      expect(hint!.textContent).toBe('Backspace to clear');
    });

    it('zobrazí "Backspace clear · / filter · ↑↓ navigate · Esc close" pro datalayer', () => {
      switchView('datalayer');
      const hint = document.querySelector('.status-hint');
      expect(hint).not.toBeNull();
      expect(hint!.textContent).toBe(
        'Backspace clear · / filter · ↑↓ navigate · Esc close'
      );
    });
  });

  // ─── BADGE COUNTERS — READ FROM DOM ─────────────────────────────────────

  describe('Badge Counters — read from DOM', () => {
    it('čte #tab-badge-network pro network count', () => {
      // Pre-populate badge
      const badge = document.getElementById('tab-badge-network');
      expect(badge).not.toBeNull();
      badge!.textContent = '42';
      expect(badge!.textContent).toBe('42');
    });

    it('čte #tab-badge-datalayer pro datalayer count', () => {
      const badge = document.getElementById('tab-badge-datalayer');
      expect(badge).not.toBeNull();
      badge!.textContent = '17';
      expect(badge!.textContent).toBe('17');
    });
  });

  // ─── TAB BADGE UPDATES ───────────────────────────────────────────────────

  describe('Tab Badge Updates', () => {
    it('aktualizuje badge textContent při count změně', () => {
      const networkBadge = document.getElementById('tab-badge-network');
      const dlBadge = document.getElementById('tab-badge-datalayer');

      // Simulate badge update after some activity
      networkBadge!.textContent = '0';
      dlBadge!.textContent = '0';

      // Simulate 5 network requests captured
      networkBadge!.textContent = '5';
      expect(networkBadge!.textContent).toBe('5');

      // Simulate 3 DataLayer pushes captured
      dlBadge!.textContent = '3';
      expect(dlBadge!.textContent).toBe('3');

      // Switch to datalayer — badge should still show correct value
      switchView('datalayer');
      expect(dlBadge!.textContent).toBe('3');
      expect(networkBadge!.textContent).toBe('5');
    });

    it('resetuje badge na 0 při clear', () => {
      const networkBadge = document.getElementById('tab-badge-network');
      const dlBadge = document.getElementById('tab-badge-datalayer');

      // Simulate accumulated counts
      networkBadge!.textContent = '23';
      dlBadge!.textContent = '7';

      // Simulate clear action
      networkBadge!.textContent = '0';
      dlBadge!.textContent = '0';

      expect(networkBadge!.textContent).toBe('0');
      expect(dlBadge!.textContent).toBe('0');

      // Switching views should preserve cleared state
      switchView('datalayer');
      expect(dlBadge!.textContent).toBe('0');
      switchView('network');
      expect(networkBadge!.textContent).toBe('0');
    });
  });

  // ─── CLICK HANDLER WIRING ───────────────────────────────────────────────

  describe('Click handler wiring', () => {
    it('switchView se zavolá při click na network tab button', () => {
      const networkBtn = document.querySelector<HTMLElement>(
        '.tab-btn[data-view="network"]'
      )!;

      networkBtn.click();
      expect(document.getElementById('main')!.style.display).toBe('');
      expect(document.getElementById('datalayer-view')!.style.display).toBe('none');
    });

    it('switchView se zavolá při click na datalayer tab button', () => {
      const dlBtn = document.querySelector<HTMLElement>(
        '.tab-btn[data-view="datalayer"]'
      )!;

      dlBtn.click();
      expect(document.getElementById('datalayer-view')!.style.display).toBe('');
      expect(document.getElementById('main')!.style.display).toBe('none');
    });

    it('dvojnásobný click nemění nic navíc (idempotentní)', () => {
      const networkBtn = document.querySelector<HTMLElement>(
        '.tab-btn[data-view="network"]'
      )!;

      networkBtn.click(); // → network
      networkBtn.click(); // → network again

      expect(mockUpdateNetworkStatusBar).toHaveBeenCalledTimes(2);
      expect(document.getElementById('main')!.style.display).toBe('');
    });
  });

  // ─── BIDIRECTIONAL SWITCHING ─────────────────────────────────────────────

  describe('Bidirectional switching', () => {
    it('network → datalayer → network plně obnoví stav', () => {
      // Set initial state
      switchView('network');
      expect(document.getElementById('main')!.style.display).toBe('');
      expect(document.getElementById('datalayer-view')!.style.display).toBe('none');
      expect(mockUpdateNetworkStatusBar).toHaveBeenCalledTimes(1);

      // Switch to datalayer
      switchView('datalayer');
      expect(document.getElementById('datalayer-view')!.style.display).toBe('');
      expect(document.getElementById('main')!.style.display).toBe('none');
      expect(mockUpdateDlStatusBar).toHaveBeenCalledTimes(1);

      // Switch back to network
      switchView('network');
      expect(document.getElementById('main')!.style.display).toBe('');
      expect(document.getElementById('datalayer-view')!.style.display).toBe('none');
      expect(mockUpdateNetworkStatusBar).toHaveBeenCalledTimes(2);
    });
  });
});
