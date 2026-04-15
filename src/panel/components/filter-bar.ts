// ─── FILTER BAR COMPONENT ────────────────────────────────────────────────────

import { DOM } from '../utils/dom';
import { esc } from '../utils/format';
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
  syncHiddenProviders,
  resetFilters,
} from '../state';
import { updateFilterBarVisibility } from './provider-bar';
import { getCachedIcon } from '../utils/icon-builder';

type FilterPill = {
  type: string;
  label: string;
  colorClass: string;
  dotColor: string;
  provider?: string;
  onRemove: () => void;
};

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
        const clearFilter = DOM.clearFilter;
        if (clearFilter) clearFilter.style.display = 'none';
        applyFiltersCallback();
        updateActiveFilters(applyFiltersCallback);
      },
    });
  }

  // Event type filter
  if (filterEventType) {
    let label: string;
    if (filterEventType.startsWith('exact:')) {
      label = filterEventType.slice(6);
    } else {
      const labels: Record<string, string> = {
        page_view: 'Page views',
        purchase: 'Purchases',
        custom: 'Custom events',
      };
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
      },
    });
  }

  // HTTP Status filter
  if (filterStatus) {
    const labels: Record<string, string> = {
      '2xx': '2xx Success',
      '3xx': '3xx Redirect',
      '4xx': '4xx Error',
      '5xx': '5xx Error',
    };
    pills.push({
      type: 'status',
      label: `status: ${labels[filterStatus] || filterStatus}`,
      colorClass: 'filter-pill--status',
      dotColor: '#3ecf8e',
      onRemove: () => {
        setFilterStatus('');
        applyFiltersCallback();
        updateActiveFilters(applyFiltersCallback);
      },
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
      },
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
      },
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
      },
    });
  }

  // Hidden provider filters
  hiddenProviders.forEach((provider) => {
    pills.push({
      type: 'provider',
      label: provider,
      colorClass: 'filter-pill--provider',
      dotColor: '#ffa726',
      provider: provider,
      onRemove: () => {
        hiddenProviders.delete(provider);
        syncHiddenProviders();
        applyFiltersCallback();
        updateActiveFilters(applyFiltersCallback);
      },
    });
  });

  // Render pills using DocumentFragment to batch DOM appends
  const $activeFilters = DOM.activeFilters;
  if (!$activeFilters) return;
  $activeFilters.innerHTML = '';

  const fragment = document.createDocumentFragment();

  pills.forEach((p) => {
    const el = document.createElement('div');
    el.className = `filter-pill ${p.colorClass}`;

    if (p.type === 'provider') {
      el.setAttribute('data-tooltip', 'Provider hidden (click × to show again)');
    }

    if (p.type === 'provider' && p.provider) {
      // Provider pill — use brand icon instead of dot
      const iconSpan = document.createElement('span');
      iconSpan.className = 'filter-pill-icon';
      const iconFragment = getCachedIcon(p.provider);
      if (iconFragment) {
        iconSpan.appendChild(iconFragment.cloneNode(true));
      } else {
        // Fallback: colored dot if no icon available
        iconSpan.className = 'filter-pill-dot';
        iconSpan.style.background = p.dotColor;
      }

      const label = document.createElement('span');
      label.className = 'filter-pill-label';
      label.textContent = p.label;

      const removeBtn = document.createElement('span');
      removeBtn.className = 'filter-pill-remove';
      removeBtn.setAttribute('aria-label', 'Remove filter');
      removeBtn.textContent = '×';

      el.appendChild(iconSpan);
      el.appendChild(label);
      el.appendChild(removeBtn);
    } else {
      // Non-provider pill — use colored dot (existing behavior)
      el.innerHTML = `
        <span class="filter-pill-dot" style="background:${p.dotColor}"></span>
        <span class="filter-pill-label">${esc(p.label)}</span>
        <span class="filter-pill-remove" aria-label="Remove filter">&times;</span>
      `;
    }

    el.querySelector('.filter-pill-remove')?.addEventListener('click', p.onRemove);
    fragment.appendChild(el);
  });

  // Add "Clear all" button if there are multiple filters
  if (pills.length > 1) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'filter-clear-all';
    clearBtn.textContent = 'Clear all';
    clearBtn.addEventListener('click', () => {
      resetFilters();
      hiddenProviders.clear();
      syncHiddenProviders();
      (DOM.filterInput as HTMLInputElement).value = '';
      const clearFilter = DOM.clearFilter;
      if (clearFilter) clearFilter.style.display = 'none';
      applyFiltersCallback();
      updateActiveFilters(applyFiltersCallback);
    });
    fragment.appendChild(clearBtn);
  }

  $activeFilters.appendChild(fragment);

  updateFilterBarVisibility();
}
