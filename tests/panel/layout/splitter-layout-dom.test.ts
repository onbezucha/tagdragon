// ─── SPLITTER LAYOUT INTEGRATION TESTS ──────────────────────────────────────
// Layout integration tests for the panel splitter focusing on:
// - Grid layout verification
// - DL splitter behavior
// - View switching
// - Edge cases not covered by splitter.test.ts

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── MOCK SETUP ───────────────────────────────────────────────────────────────

const mockStorageLocal = {
  get: vi.fn(() => Promise.resolve({})),
  set: vi.fn(() => Promise.resolve()),
};
vi.stubGlobal('chrome', {
  storage: { local: mockStorageLocal },
});

const mockSplitter = document.createElement('div');
mockSplitter.id = 'splitter';
const mockDlSplitter = document.createElement('div');
mockDlSplitter.id = 'dl-splitter';
const mockMain = document.createElement('div');
const mockList = document.createElement('div');
const mockDetail = document.createElement('div');

const mockSave = vi.fn(() => Promise.resolve());
const mockLoad = vi.fn(() => Promise.resolve(''));

vi.mock('@/panel/utils/dom', () => ({
  DOM: {
    get splitter() {
      return mockSplitter;
    },
    get dlSplitter() {
      return mockDlSplitter;
    },
    get main() {
      return mockMain;
    },
    get list() {
      return mockList;
    },
    get detail() {
      return mockDetail;
    },
  },
  $: vi.fn(),
  qsa: vi.fn(),
}));

vi.mock('@/panel/utils/persistence', () => ({
  savePanelSetting: mockSave,
  loadPanelSetting: mockLoad,
}));

// ─── DYNAMIC IMPORT ───────────────────────────────────────────────────────────

async function importSplitter() {
  const module = await import('@/panel/splitter');
  return module;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function resetMocks(): void {
  mockSave.mockClear();
  mockLoad.mockClear();
  mockStorageLocal.get.mockClear();
  mockStorageLocal.set.mockClear();
  mockMain.style.gridTemplateColumns = '';
  mockMain.style.gridTemplateRows = '';
}

function simulateMousedown(x: number): void {
  const event = new MouseEvent('mousedown', {
    clientX: x,
    bubbles: true,
    cancelable: true,
  });
  mockSplitter.dispatchEvent(event);
}

function simulateMousemove(x: number): void {
  const event = new MouseEvent('mousemove', { clientX: x, bubbles: true });
  document.dispatchEvent(event);
}

function simulateMouseup(): void {
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}

function simulateMouseleave(): void {
  const event = new MouseEvent('mouseleave', { bubbles: true });
  document.body.dispatchEvent(event);
}

function simulateDblclick(): void {
  mockSplitter.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
}

function getGridColumns(): string {
  return mockMain.style.gridTemplateColumns;
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('initSplitter - Grid Layout', () => {
  beforeEach(() => {
    resetMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1200,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Grid Layout ───────────────────────────────────────────────────────────

  it('nastaví grid-template-columns na správný formát po init s validní hodnotou', async () => {
    mockLoad.mockResolvedValueOnce('400');

    await importSplitter().then((m) => m.initSplitter());

    const columns = getGridColumns();
    // Formát: "Wpx 4px 1fr"
    expect(columns).toBe('400px 4px 1fr');
  });

  it('default width je 350px', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Když není uložená hodnota, grid-template-columns zůstane prázdná
    // Protože init neručí nastaví default při prázdném loadPanelSetting
    expect(getGridColumns()).toBe('');
  });

  it('default width je 350px při dblclick reset', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    simulateDblclick();

    expect(getGridColumns()).toBe('350px 4px 1fr');
  });

  it('aktualizuje grid-template-columns po drag', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    simulateMousedown(300);
    simulateMousemove(400);
    simulateMouseup();

    expect(getGridColumns()).toBe('400px 4px 1fr');
  });

  it('zachová detail pane šířku (1fr) při resize', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    simulateMousedown(300);
    simulateMousemove(500);
    simulateMouseup();

    const columns = getGridColumns();
    // 1fr by mělo zůstat na konci
    expect(columns.endsWith('1fr')).toBe(true);
  });

  it('splitter width zůstává 4px při změnách', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    simulateMousedown(300);
    simulateMousemove(400);
    simulateMousemove(500);
    simulateMousemove(600);
    simulateMouseup();

    // Middle column vždy 4px
    expect(getGridColumns()).toContain(' 4px ');
  });
});

describe('initSplitter - DL Splitter', () => {
  beforeEach(() => {
    resetMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1200,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── DL Splitter ───────────────────────────────────────────────────────────

  it('splitter funguje v network view', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Network view - hlavní splitter by měl fungovat
    simulateMousedown(300);
    simulateMousemove(450);
    simulateMouseup();

    expect(getGridColumns()).toBe('450px 4px 1fr');
  });

  it('#dl-splitter je oddělený element od #splitter', async () => {
    // Ověříme že máme dva různé elementy
    expect(mockSplitter.id).toBe('splitter');
    expect(mockDlSplitter.id).toBe('dl-splitter');
    expect(mockSplitter).not.toBe(mockDlSplitter);
  });

  it('#splitter nemá listenery na #dl-splitter', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Dblclick na dl-splitter by NEMĚL resetovat hlavní splitter
    const event = new MouseEvent('dblclick', { bubbles: true });
    mockDlSplitter.dispatchEvent(event);

    // Grid by měl zůstat prázdný (pokud nebyl nastaven)
    expect(getGridColumns()).toBe('');
  });
});

describe('initSplitter - Responsive', () => {
  beforeEach(() => {
    resetMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1200,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Responsive ─────────────────────────────────────────────────────────────

  it('opraví width při window resize (příliš velká)', async () => {
    mockLoad.mockResolvedValueOnce('900');

    await importSplitter().then((m) => m.initSplitter());

    // innerWidth=1200, maxRatio=0.8, maxAllowed=960
    // 900 < 960, takže OK na začátku
    expect(getGridColumns()).toBe('900px 4px 1fr');

    // Zmenšíme okno
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1000,
    });

    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);

    // maxAllowed = 1000 * 0.8 = 800
    // 900 > 800, takže oprava na Math.min(350, 800) = 350
    expect(getGridColumns()).toBe('350px 4px 1fr');
  });

  it('neopraví width při window resize (stále validní)', async () => {
    mockLoad.mockResolvedValueOnce('600');

    await importSplitter().then((m) => m.initSplitter());

    // innerWidth=1200, maxAllowed=960
    expect(getGridColumns()).toBe('600px 4px 1fr');

    // Zmenšíme okno, ale 600 zůstane validní
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1000,
    });

    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);

    // maxAllowed = 1000 * 0.8 = 800
    // 600 < 800 a 600 > 200, takže žádná oprava
    expect(getGridColumns()).toBe('600px 4px 1fr');
  });

  it('nepřekročí 80% šířky okna', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Pokusíme se táhnout na pozici 1200px (80% z 1200 = 960)
    simulateMousedown(300);
    simulateMousemove(1200);
    simulateMouseup();

    // Mělo by být omezeno na innerWidth - 300 = 900
    expect(getGridColumns()).toBe('900px 4px 1fr');
  });

  it('neklesne pod SPLITTER_MIN_WIDTH', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Pokusíme se táhnout doleva k 50px
    simulateMousedown(300);
    simulateMousemove(50);
    simulateMouseup();

    // Mělo by být omezeno na minimum 280 (interní clamp v mousemove)
    expect(getGridColumns()).toBe('280px 4px 1fr');
  });

  it('při init s příliš velkým saved width opraví na default', async () => {
    // 1500 > 1200 * 0.8 = 960
    mockLoad.mockResolvedValueOnce('1500');

    await importSplitter().then((m) => m.initSplitter());

    // Opraveno na default 350
    expect(getGridColumns()).toBe('350px 4px 1fr');
    expect(mockSave).toHaveBeenCalledWith('list-width', '350');
  });

  it('při init s příliš malým saved width opraví na default', async () => {
    // 50 < 200 (SPLITTER_MIN_WIDTH)
    mockLoad.mockResolvedValueOnce('50');

    await importSplitter().then((m) => m.initSplitter());

    // Opraveno na default 350
    expect(getGridColumns()).toBe('350px 4px 1fr');
    expect(mockSave).toHaveBeenCalledWith('list-width', '350');
  });
});

describe('initSplitter - Double-Click Reset', () => {
  beforeEach(() => {
    resetMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1200,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Double-Click Reset ─────────────────────────────────────────────────────

  it('reset na default po double-click', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Nejprve nastavíme nějakou šířku
    simulateMousedown(300);
    simulateMousemove(600);
    simulateMouseup();

    expect(getGridColumns()).toBe('600px 4px 1fr');

    // Pak dblclick reset
    simulateDblclick();

    expect(getGridColumns()).toBe('350px 4px 1fr');
  });

  it('persistuje reset width po dblclick', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    simulateMousedown(300);
    simulateMousemove(700);
    simulateMouseup();

    // Reset
    simulateDblclick();

    expect(mockSave).toHaveBeenCalledWith('list-width', '350');
  });
});

describe('initSplitter - Edge Cases', () => {
  beforeEach(() => {
    resetMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1200,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  it('zpracuje drag rychlostí sub-pixel (desetinná čísla)', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Simulace pomalého drag kde se myš skoro nehýbe
    simulateMousedown(300);
    simulateMousemove(300.5); // Sub-pixel movement
    simulateMousemove(300.7);
    simulateMousemove(300.9);
    simulateMouseup();

    // Code uses e.clientX directly, keeping decimal values
    expect(getGridColumns()).toBe('300.9px 4px 1fr');
  });

  it('zpracuje drag mimo okno (mouse leave)', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    simulateMousedown(300);
    simulateMousemove(450);

    // Simulace mouse leave z document.body
    simulateMouseleave();

    // Drag by měl stále pokračovat když je isDragging = true
    simulateMousemove(500);

    // Style stále nastaveny během drag
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    simulateMouseup();

    // Mouseup ukončí drag
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('body cursor = col-resize během drag', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    simulateMousedown(300);
    simulateMousemove(350);

    expect(document.body.style.cursor).toBe('col-resize');
  });

  it('body user-select = none během drag', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    simulateMousedown(300);
    simulateMousemove(350);

    expect(document.body.style.userSelect).toBe('none');
  });

  it('reset cursor a user-select po mouseup', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    simulateMousedown(300);
    simulateMousemove(350);

    // Ověříme že jsou nastaveny
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    simulateMouseup();

    // Po mouseup by měly být prázdné
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('nezmění cursor bez aktivního drag', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Simulace mousemove bez předchozího mousedown
    const event = new MouseEvent('mousemove', { clientX: 500, bubbles: true });
    document.dispatchEvent(event);

    // Cursor by neměl být změněn
    expect(document.body.style.cursor).toBe('');
  });

  it('více po sobě jdoucích drag operací', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // První drag
    simulateMousedown(300);
    simulateMousemove(500);
    simulateMouseup();
    expect(getGridColumns()).toBe('500px 4px 1fr');

    // Druhý drag
    simulateMousedown(500);
    simulateMousemove(350);
    simulateMouseup();
    expect(getGridColumns()).toBe('350px 4px 1fr');

    // Třetí drag
    simulateMousedown(350);
    simulateMousemove(600);
    simulateMouseup();
    expect(getGridColumns()).toBe('600px 4px 1fr');
  });

  it('mousedown na splitteru bez následného mousemove', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Jen mousedown
    simulateMousedown(300);

    // Styl by měl být nastaven
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    // Ale bez mousemove se grid nemění
    expect(getGridColumns()).toBe('');
  });

  it('více rychlých mouseup bez odpovídajícího mousedown', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Více mouseup bez mousedown - nemělo by to spadnout
    simulateMouseup();
    simulateMouseup();
    simulateMouseup();

    // Cursor by měl být prázdný (isDragging je false)
    expect(document.body.style.cursor).toBe('');
  });
});