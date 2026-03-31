import { generateBrunoCollection } from '../../src/generators/bruno.js';

const PARSED_GET = {
  baseUrl: 'https://my-bucket.s3.amazonaws.com/uploads/photo.jpg',
  protocol: 'https',
  host: 'my-bucket.s3.amazonaws.com',
  pathname: '/uploads/photo.jpg',
  params: [
    { name: 'X-Amz-Algorithm', value: 'AWS4-HMAC-SHA256' },
    { name: 'X-Amz-Expires', value: '3600' },
    { name: 'X-Amz-Signature', value: 'abcdef' },
  ],
  method: 'GET',
};

const PARSED_POST = { ...PARSED_GET, method: 'POST' };

describe('generateBrunoCollection – GET', () => {
  let collection;
  beforeEach(() => {
    collection = generateBrunoCollection(PARSED_GET);
  });

  test('has version "1"', () => {
    expect(collection.version).toBe('1');
  });

  test('uses default collection name', () => {
    expect(collection.name).toBe('S3 Presigned URL');
  });

  test('accepts custom collection name', () => {
    const c = generateBrunoCollection(PARSED_GET, 'My Custom Name');
    expect(c.name).toBe('My Custom Name');
  });

  test('contains exactly one item', () => {
    expect(collection.items).toHaveLength(1);
  });

  test('item type is http-request', () => {
    expect(collection.items[0].type).toBe('http-request');
  });

  test('request method is GET', () => {
    expect(collection.items[0].request.method).toBe('GET');
  });

  test('request url matches baseUrl', () => {
    expect(collection.items[0].request.url).toBe(PARSED_GET.baseUrl);
  });

  test('params are mapped correctly', () => {
    const { params } = collection.items[0].request;
    expect(params).toHaveLength(3);
    expect(params[0]).toEqual({ name: 'X-Amz-Algorithm', value: 'AWS4-HMAC-SHA256', enabled: true });
  });

  test('body mode is none for GET', () => {
    expect(collection.items[0].request.body.mode).toBe('none');
  });
});

describe('generateBrunoCollection – POST', () => {
  let collection;
  beforeEach(() => {
    collection = generateBrunoCollection(PARSED_POST);
  });

  test('request method is POST', () => {
    expect(collection.items[0].request.method).toBe('POST');
  });

  test('body mode is multipartForm', () => {
    expect(collection.items[0].request.body.mode).toBe('multipartForm');
  });

  test('multipartForm contains all params', () => {
    const { multipartForm } = collection.items[0].request.body;
    expect(multipartForm).toHaveLength(3);
    expect(multipartForm[0]).toEqual({
      name: 'X-Amz-Algorithm',
      value: 'AWS4-HMAC-SHA256',
      enabled: true,
      type: 'text',
    });
  });

  test('query params array is empty for POST', () => {
    expect(collection.items[0].request.params).toHaveLength(0);
  });
});
