'use strict';

/**
 * Decodes common HTML entities and percent-encoded characters in a string.
 *
 * @param {string} str
 * @returns {string}
 */
function decodeHtmlEntities(str) {
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
function parsePresignedUrl(rawUrl) {
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
 * Parses an AWS S3 pre-signed URL into a structured JSON object with all
 * known fields named explicitly so that callers can consume them directly.
 *
 * @param {string} rawUrl - The pre-signed S3 URL to parse.
 * @returns {{
 *   url: string,
 *   baseUrl: string,
 *   protocol: string,
 *   host: string,
 *   bucket: string | null,
 *   key: string,
 *   pathname: string,
 *   region: string | null,
 *   algorithm: string | null,
 *   credential: string | null,
 *   accessKeyId: string | null,
 *   credentialDate: string | null,
 *   date: string | null,
 *   expires: string | null,
 *   signedHeaders: string | null,
 *   signature: string | null,
 *   securityToken: string | null,
 *   params: Record<string, string>
 * }}
 */
function parsePresignedUrlToJson(rawUrl) {
  const base = parsePresignedUrl(rawUrl);

  // Flat params map: { paramName: paramValue }
  const params = {};
  for (const { name, value } of base.params) {
    params[name] = value;
  }

  // Extract bucket and region from the host.
  // Virtual-hosted style: <bucket>.s3.<region>.amazonaws.com
  // or legacy path-style: s3.<region>.amazonaws.com  (no bucket in host)
  let bucket = null;
  let region = null;
  const hostMatch = base.host.match(
    /^(?:(.+?)\.)?s3(?:[.-]([a-z0-9-]+))?\.amazonaws\.com$/i
  );
  if (hostMatch) {
    bucket = hostMatch[1] || null;
    // Exclude the bare "s3" label — that means us-east-1 (no explicit region)
    region = hostMatch[2] && hostMatch[2] !== 's3' ? hostMatch[2] : null;
  }

  // key is the object path without the leading "/"
  const key = base.pathname.replace(/^\//, '');

  // Split X-Amz-Credential into accessKeyId and credentialDate
  const credential = params['X-Amz-Credential'] || null;
  let accessKeyId = null;
  let credentialDate = null;
  let credentialRegion = null;
  if (credential) {
    const parts = credential.split('/');
    accessKeyId = parts[0] || null;
    credentialDate = parts[1] || null;
    credentialRegion = parts[2] || null;
  }

  // Fall back to the region from the credential scope if not in the hostname
  if (!region && credentialRegion) {
    region = credentialRegion;
  }

  return {
    url: rawUrl,
    baseUrl: base.baseUrl,
    protocol: base.protocol,
    host: base.host,
    bucket,
    key,
    pathname: base.pathname,
    region,
    algorithm: params['X-Amz-Algorithm'] || null,
    credential,
    accessKeyId,
    credentialDate,
    date: params['X-Amz-Date'] || null,
    expires: params['X-Amz-Expires'] || null,
    signedHeaders: params['X-Amz-SignedHeaders'] || null,
    signature: params['X-Amz-Signature'] || null,
    securityToken: params['X-Amz-Security-Token'] || null,
    params,
  };
}

module.exports = { parsePresignedUrl, parsePresignedUrlToJson, decodeHtmlEntities };
