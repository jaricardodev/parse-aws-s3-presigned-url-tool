/**
 * Parses an AWS S3 pre-signed URL into its components.
 *
 * @param {string} rawUrl - The pre-signed S3 URL to parse.
 * @returns {{
 *   baseUrl: string,
 *   protocol: string,
 *   host: string,
 *   pathname: string,
 *   params: Array<{name: string, value: string}>
 * }}
 */
export function parsePresignedUrl(rawUrl) {
  const url = new URL(rawUrl);

  const params = [];
  for (const [name, value] of url.searchParams.entries()) {
    params.push({ name, value: decodeHtmlEntities(value) });
  }

  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;

  return {
    baseUrl,
    protocol: url.protocol.replace(':', ''),
    host: url.host,
    pathname: url.pathname,
    params,
  };
}

/**
 * Decodes common HTML entities and percent-encoded characters in a string.
 *
 * @param {string} str
 * @returns {string}
 */
export function decodeHtmlEntities(str) {
  // &amp; is processed last so that the resulting '&' characters cannot
  // trigger any of the earlier named-entity or numeric-entity patterns
  // (which would be double-unescaping).
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&amp;/g, '&');
}
