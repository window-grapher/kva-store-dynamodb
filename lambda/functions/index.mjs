// Import DynamoDB client and commands
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Create an instance of the DynamoDB client
const dynamoDBClient = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

// Handler for incoming requests
export const handler = async (event) => {
  const httpMethod = event.requestContext.http.method;
  try {
    switch (httpMethod) {
      case 'GET':
        return await handleGetRequest(event);
      case 'POST':
        return await handlePostRequest(event);
      case 'DELETE':
        return await handleDeleteRequest(event);
      default:
        return createResponse(405, { message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error(error);
    return createResponse(500, { message: error.message });
  }
};

// Handle GET requests
async function handleGetRequest(event) {
  if (!event.queryStringParameters || !event.queryStringParameters.key) {
    return createResponse(400, { message: 'Key parameter is required' });
  }

  const keyParam = event.queryStringParameters.key;
  let limitParam = parseInt(event.queryStringParameters.limit);

  if (isNaN(limitParam) || limitParam < 1) {
    limitParam = undefined; // or set a default value
  }

  const params = {
    TableName: 'keyValueArrayStoreTable',
    KeyConditionExpression: '#key = :keyValue',
    ExpressionAttributeNames: { '#key': 'key' },
    ExpressionAttributeValues: { ':keyValue': keyParam },
    ScanIndexForward: false,
    ...(limitParam && { Limit: limitParam }),
  };

  const command = new QueryCommand(params);
  const data = await dynamoDB.send(command);

  return createResponse(200, data.Items);
}

// Handle POST requests
async function handlePostRequest(event) {
  const body = JSON.parse(event.body);
  const { key, readable = '*', owner = 'anonymous', data } = body;
  const created = new Date().toISOString(); // Get current date-time in ISO 8601 format

  const newItem = {
    TableName: 'keyValueArrayStoreTable',
    Item: {
      key,
      readable,
      owner,
      created,
      data,
    },
  };

  await dynamoDB.send(new PutCommand(newItem));

  return createResponse(200, { message: 'Item created successfully' });
}

// Handle DELETE requests
async function handleDeleteRequest(event) {
  if (!event.queryStringParameters || !event.queryStringParameters.key || !event.queryStringParameters.created) {
    return createResponse(400, { message: 'Key and created parameter are required' });
  }

  const { key, created } = event.queryStringParameters;

  const params = {
    TableName: 'keyValueArrayStoreTable',
    Key: { key, created },
  };

  await dynamoDB.send(new DeleteCommand(params));

  return createResponse(200, { message: 'Item deleted successfully' });
}

// Utility function for creating HTTP responses
function createResponse(statusCode, body) {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

export { handleGetRequest, handlePostRequest, handleDeleteRequest };
