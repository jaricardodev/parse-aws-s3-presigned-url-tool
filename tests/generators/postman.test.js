import { generatePostmanCollection } from '../../src/generators/postman.js';

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

describe('generatePostmanCollection – GET', () => {
  let collection;
  beforeEach(() => {
    collection = generatePostmanCollection(PARSED_GET);
  });

  test('schema is Postman v2.1', () => {
    expect(collection.info.schema).toBe(
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    );
  });

  test('uses default collection name', () => {
    expect(collection.info.name).toBe('S3 Presigned URL');
  });

  test('accepts custom collection name', () => {
    const c = generatePostmanCollection(PARSED_GET, 'My Custom Name');
    expect(c.info.name).toBe('My Custom Name');
  });

  test('contains exactly one item', () => {
    expect(collection.item).toHaveLength(1);
  });

  test('request method is GET', () => {
    expect(collection.item[0].request.method).toBe('GET');
  });

  test('url contains query params', () => {
    const { query } = collection.item[0].request.url;
    expect(query).toHaveLength(3);
    expect(query[0]).toEqual({ key: 'X-Amz-Algorithm', value: 'AWS4-HMAC-SHA256' });
  });

  test('url host is split into array', () => {
    expect(collection.item[0].request.url.host).toEqual([
      'my-bucket',
      's3',
      'amazonaws',
      'com',
    ]);
  });

  test('url path is split into array', () => {
    expect(collection.item[0].request.url.path).toEqual(['uploads', 'photo.jpg']);
  });

  test('url protocol is https', () => {
    expect(collection.item[0].request.url.protocol).toBe('https');
  });
});

describe('generatePostmanCollection – POST', () => {
  let collection;
  beforeEach(() => {
    collection = generatePostmanCollection(PARSED_POST);
  });

  test('request method is POST', () => {
    expect(collection.item[0].request.method).toBe('POST');
  });

  test('body mode is formdata', () => {
    expect(collection.item[0].request.body.mode).toBe('formdata');
  });

  test('formdata contains all params', () => {
    const { formdata } = collection.item[0].request.body;
    expect(formdata).toHaveLength(3);
    expect(formdata[0]).toEqual({
      key: 'X-Amz-Algorithm',
      value: 'AWS4-HMAC-SHA256',
      type: 'text',
    });
  });

  test('url has no query params for POST', () => {
    expect(collection.item[0].request.url.query).toBeUndefined();
  });
});
