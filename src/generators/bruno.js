import { randomUUID } from 'crypto';

/**
 * Generates a Bruno collection JSON that can be imported into Bruno.
 *
 * @param {{
 *   baseUrl: string,
 *   params: Array<{name: string, value: string}>,
 *   method: 'GET' | 'POST'
 * }} parsed
 * @param {string} collectionName
 * @returns {object} Bruno collection object
 */
export function generateBrunoCollection(parsed, collectionName = 'S3 Presigned URL') {
  const { baseUrl, params, method } = parsed;

  let request;
  if (method === 'GET') {
    request = buildGetRequest(baseUrl, params);
  } else {
    request = buildPostRequest(baseUrl, params);
  }

  return {
    version: '1',
    name: collectionName,
    uid: randomUUID().replace(/-/g, '').slice(0, 21),
    items: [
      {
        uid: randomUUID().replace(/-/g, '').slice(0, 21),
        type: 'http-request',
        name: `S3 ${method} Request`,
        request,
      },
    ],
  };
}

function buildGetRequest(baseUrl, params) {
  return {
    url: baseUrl,
    method: 'GET',
    headers: [],
    params: params.map((p) => ({ name: p.name, value: p.value, enabled: true })),
    body: { mode: 'none' },
    auth: { mode: 'none' },
  };
}

function buildPostRequest(baseUrl, params) {
  return {
    url: baseUrl,
    method: 'POST',
    headers: [],
    params: [],
    body: {
      mode: 'multipartForm',
      multipartForm: params.map((p) => ({
        name: p.name,
        value: p.value,
        enabled: true,
        type: 'text',
      })),
    },
    auth: { mode: 'none' },
  };
}
