// Import DynamoDB client and commands
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Set the name of the DynamoDB table
const branchName = process.env.BRANCH_NAME;
const tableName = `keyValueArrayStoreTable-${branchName}`;

// Secret token
const adminUserToken = process.env.ADMIN_USER_SECRET_TOKEN;
const authenticatedUserToken = process.env.AUTHENTECATED_USER_SECRET_TOKEN;

// Handler for incoming requests
export const handler = async (event) => {
  try {
    // clear all data in DynamoDB
    const dynamoDBClient = new DynamoDBClient({});

    // Delete all items from the table
    const deleteAllItems = {
      TableName: tableName,
    };
    await dynamoDBClient.send(new DeleteAllCommand(deleteAllItems));

    // Import data
    const items = [
      {
        key: `systemSecretToken-${authenticatedUserToken}`,
        readable: 'system',
        owner: 'system',
        created: new Date().toISOString(),
        data: '{"user":"testUser"}',
      },
      {
        key: `systemSecretToken-${adminUserToken}`,
        readable: 'system',
        owner: 'system',
        created: new Date().toISOString(),
        data: '{"user":"adminTest@kva-store.api.takoyaki3.com"}',
      },
      {
        key: `systemUser-adminTest@kva-store.api.takoyaki3.com`,
        readable: 'system',
        owner: 'system',
        created: new Date().toISOString(),
        data: '{"role":"admin"}',
      }
    ];

    // Put items into the table
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const newItem = {
        TableName: tableName,
        Item: item,
      };
      await dynamoDBClient.send(new PutCommand(newItem));
    }
  } catch (err) {
    console.error(err);
  }
};
