/**
 * Generates a cURL command string for the given parsed pre-signed URL.
 *
 * - GET  mode: all query parameters are appended to the URL as a query string.
 * - POST mode: all query parameters are sent as multipart form fields
 *              (`--form` / `-F` flags).
 *
 * @param {{
 *   baseUrl: string,
 *   params: Array<{name: string, value: string}>,
 *   method: 'GET' | 'POST'
 * }} parsed
 * @returns {string} A ready-to-run cURL command
 */
export function generateCurlCommand(parsed) {
  const { baseUrl, params, method } = parsed;

  if (method === 'GET') {
    return buildGetCommand(baseUrl, params);
  }
  return buildPostCommand(baseUrl, params);
}

function shellEscape(value) {
  // Wrap in single quotes and escape any embedded single quotes.
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function buildGetCommand(baseUrl, params) {
  const query = params
    .map(
      (p) =>
        `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`
    )
    .join('&');

  const fullUrl = params.length ? `${baseUrl}?${query}` : baseUrl;

  return `curl --request GET \\\n  --url ${shellEscape(fullUrl)}`;
}

function buildPostCommand(baseUrl, params) {
  const formFlags = params
    .map((p) => `  --form ${shellEscape(`${p.name}=${p.value}`)}`)
    .join(' \\\n');

  const parts = [`curl --request POST \\\n  --url ${shellEscape(baseUrl)}`];
  if (formFlags) {
    parts.push(formFlags);
  }

  return parts.join(' \\\n');
}
