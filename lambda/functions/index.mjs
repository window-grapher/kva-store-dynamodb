// Import DynamoDB client and commands
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { verify } from 'jsonwebtoken';
import axios from 'axios';

// Set the name of the DynamoDB table
const branchName = process.env.BRANCH_NAME;
const tableName = `keyValueArrayStoreTable-${branchName}`;

// Create an instance of the DynamoDB client
const dynamoDBClient = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

// Google public keys URL
const GOOGLE_PUBLIC_KEYS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// Cache Google's public keys
let cachedGooglePublicKeys = null;

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

  const key = event.queryStringParameters.key;
  let limitParam = parseInt(event.queryStringParameters.limit);
  
  if (key.startsWith('system')) {
    return createResponse(400, { message: 'Key "system*" is invalid.' });
  }

  if (isNaN(limitParam) || limitParam < 1 || limitParam > 100) {
    limitParam = 100; // or set a default value
  }

  const params = {
    TableName: tableName,
    KeyConditionExpression: '#key = :keyValue',
    ExpressionAttributeNames: { '#key': 'key' },
    ExpressionAttributeValues: { ':keyValue': key },
    ScanIndexForward: false,
    ...(limitParam && { Limit: limitParam }),
  };

  const command = new QueryCommand(params);
  const data = await dynamoDB.send(command);

  return createResponse(200, data.Items ?? []);
}

// Handle POST requests
async function handlePostRequest(event) {
  const body = JSON.parse(event.body);
  const { key, readable = '*', owner = 'anonymous', data } = body;
  const created = new Date().toISOString(); // Get current date-time in ISO 8601 format

  if (key.startsWith('system')) {
    return createResponse(400, { message: 'Key "system*" is invalid.' });
  }

  const newItem = {
    TableName: tableName,
    Item: {
      key,
      readable,
      owner,
      created,
      data,
    },
  };

  await dynamoDB.send(new PutCommand(newItem));

  return createResponse(200, { message: 'Item added successfully' });
}

// Handle DELETE requests
async function handleDeleteRequest(event) {
  const body = JSON.parse(event.body);
  if (!body?.key || !body?.created) {
    return createResponse(400, { message: 'Key and created parameter are required' });
  }

  const { key, created } = body;
  
  if (key.startsWith('system')) {
    return createResponse(400, { message: 'Key "system*" is invalid.' });
  }

  const params = {
    TableName: tableName,
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

// Authorize the request
export const authorize = async (event) => {
  const secretToken = event.headers.SecretToken;
  const tokenStr = event.headers.Authorization;

  // authorized by SecretToken
  if(secretToken){
    const key = 'systemSecretToken-' + secretToken;
    const limitParam = 1;
    const params = {
      TableName: tableName,
      KeyConditionExpression: '#key = :keyValue',
      ExpressionAttributeNames: { '#key': 'key' },
      ExpressionAttributeValues: { ':keyValue': key },
      ScanIndexForward: false,
      ...(limitParam && { Limit: limitParam }),
    };
  
    const command = new QueryCommand(params);
    const data = await dynamoDB.send(command);
    if (data.Items && data.Items.length === 1) {
      return {
        status: 'ok',
        isAuthorized: true,
        user: JSON.stringify(data.Items[0].data).user,
        message: 'Authorized by SecretToken',
      }
    } else {
      return {
        status: 'failed',
        isAuthorized: false,
        user: 'anonymous',
        message: 'Unauthorized: SecretToken is invalid',
      }
    }
  }

  // authorized by JWT token
  if (tokenStr?.startsWith('Bearer ')) {

    // Get the token from the Authorization header
    const token = tokenStr.split(' ')[1];

    try {
      // Uninitialized or expired cache of public keys, get the public keys
      if (!cachedGooglePublicKeys) {
        const response = await axios.get(GOOGLE_PUBLIC_KEYS_URL);
        cachedGooglePublicKeys = response.data;
      }

      for(const key in cachedGooglePublicKeys){
        const publicKey = cachedGooglePublicKeys[key];
        const JWT_SECRET_KEY = publicKey;
        const decoded = verify(token, JWT_SECRET_KEY);
        return {
          status: 'ok',
          isAuthorized: true,
          user: decoded.user,
          message: 'Authorized by JWT',
        }
      }

      return {
        status: 'failed',
        isAuthorized: false,
        user: 'anonymous',
        message: `Unauthorized: JWT is not authorized`,
      }

    } catch (error) {
      // failed to verify the token or token is expired
      return {
        status: 'failed',
        isAuthorized: false,
        user: 'anonymous',
        message: `Unauthorized: ${error.message}`,
      }
    }
  }

  // not authorized
  return {
    status: 'ok',
    isAuthorized: false,
    user: 'anonymous',
    message: 'Unauthorized',
  }
}

export { handleGetRequest, handlePostRequest, handleDeleteRequest };
