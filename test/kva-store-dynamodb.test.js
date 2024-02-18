import axios from 'axios';

require('dotenv').config();

describe('Get, Add, Delete by anonymous', () => {
  const apiUrl = process.env.API_URL;
  const secretToken = process.env.SECRET_TOKEN;

  beforeEach(async () => {
    const response = await axios.get(`${apiUrl}?key=testKey`);
    expect(response.status).toBe(200);

    const items = response.data;

    items.forEach(async (item) => {
      const resp = await axios.delete(apiUrl, {
        data: { key: item.key, created: item.created },
        headers: { SecretToken: `${secretToken}` }
      });
    });
  });

  it('An empty array should be returned when a GET request is made in an empty state.', async () => {

    const response = await axios.get(`${apiUrl}?key=testKey&limit=100`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBe(0);
  });

  it('Data should be returned when making a GET request after adding data', async () => {
    // Add data
    await axios.post(apiUrl, { key: 'testKey', data: 'testData' });

    // Get added data
    const response = await axios.get(`${apiUrl}?key=testKey&limit=10`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual(expect.arrayContaining([expect.objectContaining({ data: 'testData', readable: '*', owner: 'anonymous' })]));
  });

  it('If you delete data while it exists, the data in the DB should be deleted.', async () => {
    // Add data
    await axios.post(apiUrl, { key: 'testKey', data: 'testData' });

    // Delete the data
    const response = await axios.get(`${apiUrl}?key=testKey`);
    const items = response.data;
    items.forEach(async (item) => {
      const resp = await axios.delete(apiUrl, {
        data: { key: item.key, created: item.created },
        headers: { SecretToken: `${secretToken}` }
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get the data after deleting it
    const afterResponse = await axios.get(`${apiUrl}?key=testKey`);
    expect(afterResponse.status).toBe(200);
    expect(Array.isArray(afterResponse.data)).toBe(true);
    expect(afterResponse.data.length).toBe(0);
  });
});

describe('Get, Add, Delete by authenticated user', () => {
  const apiUrl = process.env.API_URL;
  const secretToken = process.env.TEST_SECRET_TOKEN;

  beforeEach(async () => {
    const response = await axios.get(`${apiUrl}?key=authTestKey`, {
      headers: { SecretToken: `${secretToken}` }
    });
    expect(response.status).toBe(200);

    const items = response.data;

    for (const item of items) {
      await axios.delete(apiUrl, {
        data: { key: item.key, created: item.created },
        headers: { SecretToken: `${secretToken}` }
      });
    }
  });

  it('An empty array should be returned when a GET request is made by an authenticated user in an empty state.', async () => {
    const response = await axios.get(`${apiUrl}?key=authTestKey&limit=100`, {
      headers: { SecretToken: `${secretToken}` }
    });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBe(0);
  });

  it('Data should be returned when making a GET request after an authenticated user adds data', async () => {
    await axios.post(apiUrl, { key: 'authTestKey', data: 'authTestData' }, {
      headers: { SecretToken: `${secretToken}` }
    });

    const response = await axios.get(`${apiUrl}?key=authTestKey`, {
      headers: { SecretToken: `${secretToken}` }
    });
    const itme = response.data[0]
    expect(response.status).toBe(200);
    expect(itme.data).toBe('authTestData');
    expect(itme.readable).toBe('*');
    expect(itme.owner).toBe('testUser');
  });

  it('If an authenticated user deletes data while it exists, the data in the DB should be deleted.', async () => {
    await axios.post(apiUrl, { key: 'authTestKey', data: 'authTestData' }, {
      headers: { SecretToken: `${secretToken}` }
    });

    const response = await axios.get(`${apiUrl}?key=authTestKey`, {
      headers: { SecretToken: `${secretToken}` }
    });
    const items = response.data;
    for (const item of items) {
      await axios.delete(apiUrl, {
        data: { key: item.key, created: item.created },
        headers: { SecretToken: `${secretToken}` }
      });
    }

    const afterResponse = await axios.get(`${apiUrl}?key=authTestKey&limit=10`, {
      headers: { SecretToken: `${secretToken}` }
    });
    expect(afterResponse.status).toBe(200);
    expect(Array.isArray(afterResponse.data)).toBe(true);
    expect(afterResponse.data.length).toBe(0);
  });
});
