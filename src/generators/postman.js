import { randomUUID } from 'crypto';

/**
 * Generates a Postman Collection v2.1 JSON that can be imported into Postman.
 *
 * @param {{
 *   baseUrl: string,
 *   protocol: string,
 *   host: string,
 *   pathname: string,
 *   params: Array<{name: string, value: string}>,
 *   method: 'GET' | 'POST'
 * }} parsed
 * @param {string} collectionName
 * @returns {object} Postman collection object
 */
export function generatePostmanCollection(parsed, collectionName = 'S3 Presigned URL') {
  const { baseUrl, protocol, host, pathname, params, method } = parsed;

  const hostParts = host.split('.');
  const pathParts = pathname.split('/').filter(Boolean);

  let request;
  if (method === 'GET') {
    request = buildGetRequest(baseUrl, protocol, hostParts, pathParts, params);
  } else {
    request = buildPostRequest(baseUrl, protocol, hostParts, pathParts, params);
  }

  return {
    info: {
      name: collectionName,
      _postman_id: randomUUID(),
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      {
        name: `S3 ${method} Request`,
        request,
        response: [],
      },
    ],
  };
}

function buildGetRequest(rawUrl, protocol, host, path, params) {
  const rawWithQuery =
    rawUrl +
    (params.length
      ? '?' + params.map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`).join('&')
      : '');

  return {
    method: 'GET',
    header: [],
    url: {
      raw: rawWithQuery,
      protocol,
      host,
      path,
      query: params.map((p) => ({ key: p.name, value: p.value })),
    },
  };
}

function buildPostRequest(rawUrl, protocol, host, path, params) {
  return {
    method: 'POST',
    header: [],
    body: {
      mode: 'formdata',
      formdata: params.map((p) => ({ key: p.name, value: p.value, type: 'text' })),
    },
    url: {
      raw: rawUrl,
      protocol,
      host,
      path,
    },
  };
}
