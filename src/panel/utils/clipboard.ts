/**
 * Copy text to clipboard with fallback for restricted contexts.
 * Returns true on success, false on failure.
 */
import { CHECK_SVG, COPY_FLASH_MS } from '@/shared/constants';

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback: temporary textarea
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Show brief visual feedback on a button element after copy.
 * Changes button text to checkmark briefly, or shows a pulse animation.
 */
export function showCopyFeedback(button: HTMLElement, success: boolean): void {
  if (success) {
    const original = button.innerHTML;
    button.innerHTML = `${CHECK_SVG} Copied!`;
    button.classList.add('copied');
    setTimeout(() => {
      button.innerHTML = original;
      button.classList.remove('copied');
    }, COPY_FLASH_MS);
  } else {
    button.classList.add('copy-fail');
    setTimeout(() => button.classList.remove('copy-fail'), 1500);
    const statusEl = document.getElementById('status-stats');
    if (statusEl) {
      const original = statusEl.textContent;
      statusEl.textContent = 'Copy failed — clipboard access denied';
      setTimeout(() => {
        statusEl.textContent = original;
      }, 3000);
    }
  }
}
