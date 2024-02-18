import axios from 'axios';

require('dotenv').config();

describe('Get, Add, Delete by anonymous', () => {
  const apiUrl = process.env.API_URL;
  const secretToken = process.env.SECRET_TOKEN; // シークレットトークンも環境変数から取得

  it('データ一覧を取得し、全てのデータを削除する', async () => {
    // データ一覧を取得
    const response = await axios.get(`${apiUrl}?key=testKey&limit=10`);
    expect(response.status).toBe(200);

    // データを削除
    await Promise.all(
      response.data.map(async (item) => {
        await axios.delete(apiUrl, {
          body: JSON.stringify({ key: 'testKey', created: item.created }),
          headers: { SecretToken: `${secretToken}`}
        });
      })
    );
  });

  it('空の状態でGETリクエストを投げた場合に空の配列を返すべき', async () => {

    const response = await axios.get(`${apiUrl}?key=testKey&limit=100`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBe(0);
  });

  it('データを追加した後にGETリクエストを投げた場合にデータを返すべき', async () => {
    // データを追加
    await axios.post(apiUrl, { key: 'testKey', data: 'testData' });

    // 追加したデータを取得
    const response = await axios.get(`${apiUrl}?key=testKey&limit=10`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual(expect.arrayContaining([expect.objectContaining({ data: 'testData', readable: '*', owner: 'anonymous' })]));
  });

  it('データが存在する状態で削除を行うとDB内のデータが削除されるべき', async () => {
    // データを削除
    await axios.delete(apiUrl, {
      data: { key: 'testKey' },
      headers: { SecretToken: `${secretToken}` }
    });

    // 削除後のデータを取得
    const response = await axios.get(`${apiUrl}?key=testKey&limit=10`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBe(0);
  });
});
