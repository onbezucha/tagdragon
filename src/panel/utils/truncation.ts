/**
 * Set up truncation tooltips on all .param-value elements within a container.
 * Uses the custom tooltip system (data-tooltip attribute).
 *
 * Call this AFTER content is inserted into the DOM so that scrollWidth/clientWidth
 * measurements can be computed.
 */
export function setupTruncationTooltips(container: HTMLElement): void {
  const elements = container.querySelectorAll('.param-value');
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    // Check if element is actually truncated
    if (htmlEl.scrollWidth > htmlEl.clientWidth + 2) {
      htmlEl.setAttribute('data-tooltip', htmlEl.textContent || '');
      htmlEl.style.cursor = 'help';
    } else {
      htmlEl.removeAttribute('data-tooltip');
      htmlEl.style.cursor = '';
    }
  });
}
