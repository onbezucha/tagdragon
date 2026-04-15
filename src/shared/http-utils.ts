/**
 * Convert headers array to object with lowercase keys.
 * Works with both chrome.webRequest.HttpHeader and HAR header formats.
 */
export function headersToObj(
  headers: Array<{ name: string; value?: string }> = []
): Record<string, string> {
  return headers.reduce(
    (acc, { name, value }) => {
      acc[name.toLowerCase()] = value ?? '';
      return acc;
    },
    {} as Record<string, string>
  );
}
