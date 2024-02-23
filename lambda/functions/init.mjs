// Import DynamoDB client and commands
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Set the name of the DynamoDB table
const branchName = process.env.BRANCH_NAME;
const tableName = `keyValueArrayStoreTable-${branchName}`;

// Secret token
const adminUserToken = process.env.ADMIN_USER_SECRET_TOKEN;
const authenticatedUserToken = process.env.AUTHENTICATED_USER_SECRET_TOKEN;

// Handler for incoming requests
export const handler = async (event) => {
  try {
    // Log
    console.log(`Initializing the table: ${tableName}`);

    // clear all data in DynamoDB
    const dynamoDBClient = new DynamoDBClient({});
    
    // Scan the table to get all items
    const scanResult = await dynamoDBClient.send(new ScanCommand({
      TableName: tableName,
    }));

    console.log(`Scanning ${tableName} - ${scanResult.Items.length} items found.`);

    // Delete all items from the table
    if (scanResult.Items) {
      for (const item of scanResult.Items) {
        await dynamoDBClient.send(new DeleteCommand({ TableName: tableName, Key: { key:item.key, created:item.created } }));
        console.log(`Item deleted: ${item.key.S}`);
      }
    }

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
      console.log(`Item added: ${item.key}`);
    }
  } catch (err) {
    console.error(err);
  }
};
