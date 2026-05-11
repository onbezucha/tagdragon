// ─── ADOBE REDIRECT UTILITIES ──────────────────────────────────────────────
// Pure validation and helper functions extracted for testability.

const ALLOWED_REDIRECT_HOSTNAMES = ['assets.adobedtm.com', 'assets.adobedtm.com.ostrk.org'];

/**
 * Validate that redirect URLs meet security requirements.
 * Returns an error message string if validation fails, or null if valid.
 */
export function validateRedirectUrls(fromUrl: string, toUrl: string): string | null {
  // Validate toUrl: must be HTTPS with allowed hostname
  try {
    const parsedTo = new URL(toUrl);
    if (parsedTo.protocol !== 'https:') {
      return 'Only HTTPS redirect targets are allowed';
    }
    if (!ALLOWED_REDIRECT_HOSTNAMES.includes(parsedTo.hostname)) {
      return 'Invalid redirect target hostname';
    }
  } catch {
    return 'Invalid redirect URL';
  }

  // Validate fromUrl: must be parseable and HTTPS
  try {
    const parsedFrom = new URL(fromUrl);
    if (parsedFrom.protocol !== 'https:') {
      return 'Only HTTPS source URLs are allowed';
    }
  } catch {
    return 'Invalid source URL';
  }

  // Reject fromUrl containing declarativeNetRequest special characters
  if (/[*^|?\\]/.test(fromUrl)) {
    return 'Source URL contains invalid characters (*, ^, |, ?, \\)';
  }

  return null;
}

/**
 * Build a deduplicated list of cookies from two cookie arrays.
 * Deduplication key: name|domain|path|storeId
 */
export function deduplicateCookies(
  byCookies: chrome.cookies.Cookie[],
  byDomain: chrome.cookies.Cookie[]
): chrome.cookies.Cookie[] {
  const seen = new Set<string>();
  return [...byCookies, ...byDomain].filter((c) => {
    const key = `${c.name}|${c.domain}|${c.path}|${c.storeId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Build the cookie URL from a cookie object.
 * Uses https:// for secure cookies, http:// otherwise.
 * Strips leading dot from domain.
 */
export function buildCookieUrl(cookie: chrome.cookies.Cookie): string {
  const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
  return `${cookie.secure ? 'https' : 'http'}://${domain}${cookie.path}`;
}
