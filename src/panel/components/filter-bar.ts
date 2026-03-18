// ─── FILTER BAR COMPONENT ────────────────────────────────────────────────────

import { DOM, qsa } from '../utils/dom';
import { esc } from '../utils/format';
import { getKnownEventNames, getStatusCounts, getMethodCounts, getUserIdCounts, getCommonParams } from '../utils/filter';
import {
  getFilterText,
  setFilterText,
  getFilterEventType,
  setFilterEventType,
  getFilterStatus,
  setFilterStatus,
  getFilterMethod,
  setFilterMethod,
  getFilterUserId,
  setFilterUserId,
  getFilterHasParam,
  setFilterHasParam,
  getHiddenProviders,
  resetFilters,
} from '../state';
import { updateFilterBarVisibility } from './provider-bar';

type FilterPill = {
  type: string;
  label: string;
  colorClass: string;
  dotColor: string;
  onRemove: () => void;
};

let activeSubmenu: string | null = null;

/**
 * Update active filter pills display.
 * @param applyFiltersCallback Callback to apply filters
 */
export function updateActiveFilters(applyFiltersCallback: () => void): void {
  const pills: FilterPill[] = [];
  const filterText = getFilterText();
  const filterEventType = getFilterEventType();
  const filterStatus = getFilterStatus();
  const filterMethod = getFilterMethod();
  const filterUserId = getFilterUserId();
  const filterHasParam = getFilterHasParam();
  const hiddenProviders = getHiddenProviders();
  
  // Search filter
  if (filterText) {
    pills.push({ 
      type: 'search', 
      label: `"${filterText}"`,
      colorClass: 'filter-pill--search',
      dotColor: '#5090ff',
      onRemove: () => { 
        setFilterText(''); 
        (DOM.filterInput as HTMLInputElement).value = ''; 
        DOM.clearFilter!.style.display = 'none';
        applyFiltersCallback(); 
        updateActiveFilters(applyFiltersCallback); 
      }
    });
  }

  // Event type filter
  if (filterEventType) {
    let label: string;
    if (filterEventType.startsWith('exact:')) {
      label = filterEventType.slice(6);
    } else {
      const labels: Record<string, string> = { page_view: 'Page views', purchase: 'Purchases', custom: 'Custom events' };
      label = labels[filterEventType] || filterEventType;
    }
    pills.push({ 
      type: 'event', 
      label: `event: ${label}`,
      colorClass: 'filter-pill--event',
      dotColor: '#ab47bc',
      onRemove: () => { 
        setFilterEventType(''); 
        applyFiltersCallback(); 
        updateActiveFilters(applyFiltersCallback); 
      }
    });
  }

  // HTTP Status filter
  if (filterStatus) {
    const labels: Record<string, string> = { '2xx': '2xx Success', '3xx': '3xx Redirect', '4xx': '4xx Error', '5xx': '5xx Error' };
    pills.push({ 
      type: 'status', 
      label: `status: ${labels[filterStatus] || filterStatus}`,
      colorClass: 'filter-pill--status',
      dotColor: '#3ecf8e',
      onRemove: () => { 
        setFilterStatus(''); 
        applyFiltersCallback(); 
        updateActiveFilters(applyFiltersCallback); 
      }
    });
  }
  
  // HTTP Method filter
  if (filterMethod) {
    pills.push({ 
      type: 'method', 
      label: `method: ${filterMethod}`,
      colorClass: 'filter-pill--method',
      dotColor: '#ffa726',
      onRemove: () => { 
        setFilterMethod(''); 
        applyFiltersCallback(); 
        updateActiveFilters(applyFiltersCallback); 
      }
    });
  }
  
  // User ID filter
  if (filterUserId) {
    const labels: Record<string, string> = { has: 'Has user ID', missing: 'Missing user ID' };
    pills.push({ 
      type: 'userid', 
      label: labels[filterUserId],
      colorClass: 'filter-pill--userid',
      dotColor: '#a8adc0',
      onRemove: () => { 
        setFilterUserId(''); 
        applyFiltersCallback(); 
        updateActiveFilters(applyFiltersCallback); 
      }
    });
  }
  
  // Has parameter filter
  if (filterHasParam) {
    pills.push({ 
      type: 'has-param', 
      label: `has: ${filterHasParam}`,
      colorClass: 'filter-pill--has-param',
      dotColor: '#ef5350',
      onRemove: () => { 
        setFilterHasParam(''); 
        applyFiltersCallback(); 
        updateActiveFilters(applyFiltersCallback); 
      }
    });
  }

  // Hidden provider filters
  hiddenProviders.forEach(provider => {
    pills.push({ 
      type: 'provider', 
      label: `${provider} hidden`,
      colorClass: 'filter-pill--provider',
      dotColor: '#ffa726',
      onRemove: () => { 
        hiddenProviders.delete(provider); 
        const p = document.querySelector(`.ppill[data-provider="${provider}"]`); 
        if (p) p.classList.replace('inactive', 'active'); 
        applyFiltersCallback(); 
        updateActiveFilters(applyFiltersCallback); 
      }
    });
  });
  
  // Render pills
  const $activeFilters = DOM.activeFilters!;
  $activeFilters.innerHTML = '';
  
  pills.forEach((p) => {
    const el = document.createElement('div');
    el.className = `filter-pill ${p.colorClass}`;
    el.innerHTML = `
      <span class="filter-pill-dot" style="background:${p.dotColor}"></span>
      <span class="filter-pill-label">${esc(p.label)}</span>
      <span class="filter-pill-remove" aria-label="Remove filter">&times;</span>
    `;
    el.querySelector('.filter-pill-remove')!.addEventListener('click', p.onRemove);
    $activeFilters.appendChild(el);
  });
  
  // Add "Clear all" button if there are multiple filters
  if (pills.length > 1) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'filter-clear-all';
    clearBtn.textContent = 'Clear all';
    clearBtn.addEventListener('click', () => {
      resetFilters();
      hiddenProviders.clear();
      (DOM.filterInput as HTMLInputElement).value = '';
      DOM.clearFilter!.style.display = 'none';
      qsa('.ppill.inactive').forEach(p => p.classList.replace('inactive', 'active'));
      applyFiltersCallback();
      updateActiveFilters(applyFiltersCallback);
    });
    $activeFilters.appendChild(clearBtn);
  }
  
  updateFilterBarVisibility();
}

/**
 * Close filter popover.
 */
export function closeFilterPopover(): void {
  DOM.filterPopover!.classList.remove('visible');
  DOM.filterSubmenu!.classList.remove('visible');
  activeSubmenu = null;
}

/**
 * Update filter popover state (highlight active filters).
 */
function updateFilterPopoverState(): void {
  const popover = DOM.filterPopover!;
  const filterEventType = getFilterEventType();
  const filterStatus = getFilterStatus();
  const filterMethod = getFilterMethod();
  const filterUserId = getFilterUserId();
  const filterHasParam = getFilterHasParam();
  
  qsa('.filter-popover-item', popover).forEach(item => {
    item.classList.remove('active-filter');
  });
  
  if (filterEventType) {
    const el = popover.querySelector('[data-submenu="event"]');
    if (el) el.classList.add('active-filter');
  }
  if (filterStatus) {
    const el = popover.querySelector('[data-submenu="status"]');
    if (el) el.classList.add('active-filter');
  }
  if (filterMethod) {
    const el = popover.querySelector('[data-submenu="method"]');
    if (el) el.classList.add('active-filter');
  }
  if (filterUserId) {
    const el = popover.querySelector('[data-submenu="userid"]');
    if (el) el.classList.add('active-filter');
  }
  if (filterHasParam) {
    const el = popover.querySelector('[data-submenu="has-param"]');
    if (el) el.classList.add('active-filter');
  }
}

/**
 * Initialize filter popover handlers.
 * @param applyFiltersCallback Callback to apply filters
 * @param updateActiveFiltersCallback Callback to update active filters
 */
export function initFilterPopoverHandlers(applyFiltersCallback: () => void, updateActiveFiltersCallback: () => void): void {
  const $btnAddFilter = document.getElementById('btn-add-filter') as HTMLElement;
  const $filterPopover = DOM.filterPopover!;
  const $filterSubmenu = DOM.filterSubmenu!;
  const $filterSubmenuContent = DOM.filterSubmenuContent!;
  
  if (!$btnAddFilter || !$filterPopover) return;
  
  $btnAddFilter.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    DOM.settingsPopover!.classList.remove('visible');
    
    if ($filterPopover.classList.contains('visible')) {
      closeFilterPopover();
      return;
    }
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    $filterPopover.style.top = (rect.bottom + 4) + 'px';
    $filterPopover.style.left = rect.left + 'px';
    $filterPopover.classList.add('visible');
    updateFilterPopoverState();
  });
  
  // Handle clicks on filter popover menu items
  $filterPopover.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    const item = (e.target as HTMLElement).closest('.filter-popover-item') as HTMLElement;
    if (!item) return;
    
    const submenuType = item.dataset.submenu;
    if (!submenuType) return;
    
    if (activeSubmenu === submenuType) {
      $filterSubmenu.classList.remove('visible');
      activeSubmenu = null;
      return;
    }
    
    activeSubmenu = submenuType;
    openSubmenu(submenuType, item, $filterPopover, $filterSubmenu, $filterSubmenuContent, applyFiltersCallback, updateActiveFiltersCallback);
  });
  
  // Close on outside click
  document.addEventListener('click', (e: MouseEvent) => {
    if (!$filterPopover.contains(e.target as Node) && 
        !$filterSubmenu.contains(e.target as Node) && 
        !(e.target as HTMLElement).closest('#btn-add-filter')) {
      closeFilterPopover();
    }
  });
  
  // Close on Escape
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && $filterPopover.classList.contains('visible')) {
      closeFilterPopover();
      e.stopImmediatePropagation();
    }
  });
}

function openSubmenu(type: string, anchorItem: HTMLElement, $filterPopover: HTMLElement, $filterSubmenu: HTMLElement, $filterSubmenuContent: HTMLElement, applyFiltersCallback: () => void, updateActiveFiltersCallback: () => void): void {
  const rect = anchorItem.getBoundingClientRect();
  const popoverRect = $filterPopover.getBoundingClientRect();
  
  let left = popoverRect.right + 4;
  let top = rect.top;
  
  if (left + 260 > window.innerWidth) {
    left = popoverRect.left - 260 - 4;
  }
  if (top + 320 > window.innerHeight) {
    top = window.innerHeight - 320 - 8;
  }
  
  $filterSubmenu.style.top = top + 'px';
  $filterSubmenu.style.left = left + 'px';
  
  renderSubmenuContent(type, $filterSubmenuContent, applyFiltersCallback, updateActiveFiltersCallback);
  $filterSubmenu.classList.add('visible');
}

function renderSubmenuContent(type: string, $content: HTMLElement, applyFiltersCallback: () => void, updateActiveFiltersCallback: () => void): void {
  let html = '';
  
  switch (type) {
    case 'event':
      html = renderEventSubmenu();
      break;
    case 'status':
      html = renderStatusSubmenu();
      break;
    case 'method':
      html = renderMethodSubmenu();
      break;
    case 'userid':
      html = renderUserIdSubmenu();
      break;
    case 'has-param':
      html = renderHasParamSubmenu();
      break;
  }
  
  $content.innerHTML = html;
  attachSubmenuListeners(type, $content, applyFiltersCallback, updateActiveFiltersCallback);
}

function renderEventSubmenu(): string {
  const events = getKnownEventNames();
  const filterEventType = getFilterEventType();
  let html = '<div class="filter-submenu-search"><input type="text" id="submenu-event-search" placeholder="Search events..."></div>';
  
  html += '<div class="filter-submenu-group-label">Presets</div>';
  html += `<div class="filter-submenu-item ${filterEventType === 'page_view' ? 'selected' : ''}" data-value="page_view"><span class="item-label">Page views</span></div>`;
  html += `<div class="filter-submenu-item ${filterEventType === 'purchase' ? 'selected' : ''}" data-value="purchase"><span class="item-label">Purchases</span></div>`;
  html += `<div class="filter-submenu-item ${filterEventType === 'custom' ? 'selected' : ''}" data-value="custom"><span class="item-label">Custom events</span></div>`;
  
  if (events.length > 0) {
    html += '<div class="filter-submenu-divider"></div>';
    html += '<div class="filter-submenu-group-label">Detected events</div>';
    
    events.forEach(([name, count]) => {
      const isSelected = filterEventType === 'exact:' + name;
      html += `<div class="filter-submenu-item event-item ${isSelected ? 'selected' : ''}" data-value="exact:${esc(name)}">
        <span class="item-label">${esc(name)}</span>
        <span class="item-count">${count}</span>
      </div>`;
    });
  }
  
  return html;
}

function renderStatusSubmenu(): string {
  const statusCounts = getStatusCounts();
  const filterStatus = getFilterStatus();
  const statuses = [
    { value: '2', label: '2xx Success', icon: '&#10003;', color: 'var(--green)' },
    { value: '3', label: '3xx Redirect', icon: '&#8599;', color: 'var(--accent)' },
    { value: '4', label: '4xx Client Error', icon: '&#9888;', color: 'var(--orange)' },
    { value: '5', label: '5xx Server Error', icon: '&#10005;', color: 'var(--red)' }
  ];
  
  let html = '';
  statuses.forEach(s => {
    const count = statusCounts[s.value] || 0;
    const isSelected = filterStatus === s.value + 'xx';
    const isDisabled = count === 0;
    html += `<div class="filter-submenu-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" data-value="${s.value}xx" ${isDisabled ? 'style="opacity:0.3;pointer-events:none"' : ''}>
      <span class="item-label"><span style="color:${s.color}">${s.icon}</span> ${s.label}</span>
      <span class="item-count">${count}</span>
    </div>`;
  });
  
  return html;
}

function renderMethodSubmenu(): string {
  const methodCounts = getMethodCounts();
  const filterMethod = getFilterMethod();
  let html = '';
  
  const methods = Object.entries(methodCounts).sort((a, b) => b[1] - a[1]);
  
  if (methods.length === 0) {
    html += '<div class="filter-submenu-item" style="color:var(--text-2);cursor:default"><span class="item-label">No requests yet</span></div>';
  } else {
    methods.forEach(([method, count]) => {
      const isSelected = filterMethod === method;
      html += `<div class="filter-submenu-item ${isSelected ? 'selected' : ''}" data-value="${esc(method)}">
        <span class="item-label">${esc(method)}</span>
        <span class="item-count">${count}</span>
      </div>`;
    });
  }
  
  return html;
}

function renderUserIdSubmenu(): string {
  const counts = getUserIdCounts();
  const filterUserId = getFilterUserId();
  let html = '';
  
  html += `<div class="filter-submenu-item ${filterUserId === 'has' ? 'selected' : ''}" data-value="has">
    <span class="item-label">Has user ID</span>
    <span class="item-count">${counts.has}</span>
  </div>`;
  html += `<div class="filter-submenu-item ${filterUserId === 'missing' ? 'selected' : ''}" data-value="missing">
    <span class="item-label">Missing user ID</span>
    <span class="item-count">${counts.missing}</span>
  </div>`;
  
  return html;
}

function renderHasParamSubmenu(): string {
  const filterHasParam = getFilterHasParam();
  let html = '';
  
  html += `<div class="filter-submenu-input-row">
    <input type="text" id="has-param-input" placeholder="Parameter name..." value="${esc(filterHasParam)}">
    <button id="has-param-apply">Add</button>
  </div>`;
  
  const commonParams = getCommonParams();
  if (commonParams.length > 0) {
    html += '<div class="filter-submenu-group-label">Common parameters</div>';
    html += '<div class="filter-submenu-quickpicks">';
    commonParams.forEach(p => {
      html += `<span class="filter-submenu-quickpick" data-param="${esc(p)}">${esc(p)}</span>`;
    });
    html += '</div>';
  }
  
  return html;
}

function attachSubmenuListeners(type: string, $content: HTMLElement, applyFiltersCallback: () => void, updateActiveFiltersCallback: () => void): void {
  const applyAndClose = (): void => {
    applyFiltersCallback();
    updateActiveFiltersCallback();
    closeFilterPopover();
  };
  
  switch (type) {
    case 'event': {
      const searchInput = document.getElementById('submenu-event-search') as HTMLInputElement;
      if (searchInput) {
        searchInput.addEventListener('input', (e: Event) => {
          const q = (e.target as HTMLInputElement).value.toLowerCase();
          qsa('.event-item', $content).forEach(item => {
            const label = (item.querySelector('.item-label') as HTMLElement).textContent!.toLowerCase();
            (item as HTMLElement).style.display = label.includes(q) ? '' : 'none';
          });
        });
        setTimeout(() => searchInput.focus(), 50);
      }
      
      qsa('.filter-submenu-item', $content).forEach(item => {
        if ((item as HTMLElement).style.opacity === '0.3') return;
        item.addEventListener('click', () => {
          const value = (item as HTMLElement).dataset.value;
          if (!value) return;
          const currentType = getFilterEventType();
          setFilterEventType(currentType === value ? '' : value);
          applyAndClose();
        });
      });
      break;
    }
    
    case 'status': {
      qsa('.filter-submenu-item:not(.disabled)', $content).forEach(item => {
        item.addEventListener('click', () => {
          const value = (item as HTMLElement).dataset.value;
          if (!value) return;
          const currentStatus = getFilterStatus();
          setFilterStatus(currentStatus === value ? '' : value);
          applyAndClose();
        });
      });
      break;
    }
    
    case 'method': {
      qsa('.filter-submenu-item', $content).forEach(item => {
        item.addEventListener('click', () => {
          const value = (item as HTMLElement).dataset.value;
          if (!value) return;
          const currentMethod = getFilterMethod();
          setFilterMethod(currentMethod === value ? '' : (value as '' | 'GET' | 'POST'));
          applyAndClose();
        });
      });
      break;
    }
    
    case 'userid': {
      qsa('.filter-submenu-item', $content).forEach(item => {
        item.addEventListener('click', () => {
          const value = (item as HTMLElement).dataset.value;
          if (!value) return;
          const currentUserId = getFilterUserId();
          setFilterUserId(currentUserId === value ? '' : value);
          applyAndClose();
        });
      });
      break;
    }
    
    case 'has-param': {
      const input = document.getElementById('has-param-input') as HTMLInputElement;
      const applyBtn = document.getElementById('has-param-apply') as HTMLButtonElement;
      
      if (input && applyBtn) {
        const applyParam = (): void => {
          const val = input.value.trim();
          if (!val) return;
          setFilterHasParam(val);
          applyAndClose();
        };
        
        applyBtn.addEventListener('click', applyParam);
        input.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter') applyParam();
        });
        
        setTimeout(() => input.focus(), 50);
      }
      
      qsa('.filter-submenu-quickpick', $content).forEach(pick => {
        pick.addEventListener('click', () => {
          setFilterHasParam((pick as HTMLElement).dataset.param!);
          applyAndClose();
        });
      });
      break;
    }
  }
}
