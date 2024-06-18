import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const data = JSON.parse(await fs.readFile(new URL('./data.json', import.meta.url), 'utf-8'));

// Create an instance of the DynamoDB client
const dynamoDBClient = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

for (const key in data) {
  console.log(key);
  const items = data[key];

  // itemsが配列であることを確認
  if (!Array.isArray(items)) {
    console.error('items is not an array');
  }

  for(let i = 0; i < items.length; i++) {
    const item = items[i];
    let { readable, owner, created_at, data, path, id } = item;
    if(!readable) readable = '*';
    if(!owner) owner = 'anonymous';
    if(!created_at) created_at = new Date().toISOString();
    const created = created_at;

    const newItem = {
      TableName: 'keyValueArrayStoreTable-production',
      Item: {
        key,
        readable,
        owner,
        created,
        data,
      },
    };
    if (path) {
      newItem.Item.path = path;
    }
    if (id) {
      newItem.Item.id = id;
    }
  
    const resp = await dynamoDB.send(new PutCommand(newItem));
  }
}
