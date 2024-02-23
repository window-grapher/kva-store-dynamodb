// Import DynamoDB client and commands
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import jwt from 'jsonwebtoken';
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
let lastUpdatedTime = null;

// Handler for incoming requests
export const handler = async (event) => {
  try {
    const httpMethod = event?.requestContext?.http?.method;
    const path = event?.requestContext?.http?.path;
    if(!httpMethod || !path) return createResponse(400, { message: 'Bad Request' });

    if (path === '/auth') {
      try {
        return await handleAuthRequest(event);
      } catch (error) {
        console.error(error);
        return createResponse(500, { message: error.message });
      }
    } else {
      switch (httpMethod) {
        case 'GET':
          return await handleGetRequest(event);
        case 'POST':
          return await handlePostRequest(event);
        case 'DELETE':
          return await handleDeleteRequest(event);
        case 'OPTIONS':
          // Respond to CORS pre-flight request
          return createResponse(204, {}, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE'
          });
        default:
          return createResponse(405, { message: 'Method Not Allowed' });
      }
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

  const auth = await authorize(event);
  const key = event.queryStringParameters.key;
  let limitParam = parseInt(event.queryStringParameters.limit);
  
  // Get startDate and endDate
  const start = event.queryStringParameters.start;
  const end = event.queryStringParameters.end;

  if (key.startsWith('system')) {
    return createResponse(400, { message: 'Key "system*" is invalid.' });
  }

  if (isNaN(limitParam) || limitParam < 1 || limitParam > 100) {
    limitParam = 100; // or set a default value
  }

  const id = event.queryStringParameters.id;
  
  let params = {}

  if (id) {
    params = {
      TableName: tableName,
      IndexName: 'idIndex',
      KeyConditionExpression: '#key = :keyValue AND #id = :idValue',
      ExpressionAttributeNames: { '#key': 'key', '#id': 'id' },
      ExpressionAttributeValues: { ':keyValue': key, ':idValue': id },
      ScanIndexForward: false,
      ...(limitParam && { Limit: limitParam }),
    };
  } else {
    params = {
      TableName: tableName,
      KeyConditionExpression: '#key = :keyValue' + 
        (start && end ? ' AND #created BETWEEN :startDate AND :endDate' : 
         start ? ' AND #created >= :startDate' : 
         end ? ' AND #created <= :endDate' : ''),
      ExpressionAttributeNames: { 
        '#key': 'key',
        ...(start || end ? { '#created': 'created' } : {})
      },
      ExpressionAttributeValues: { 
        ':keyValue': key,
        ...(start && { ':startDate': start }),
        ...(end && { ':endDate': end })
      },
      ScanIndexForward: false,
      ...(limitParam && { Limit: limitParam }),
    };
  }

  const command = new QueryCommand(params);
  const data = await dynamoDB.send(command);

  const items = (data.Items ?? []).filter(item => item.readable === '*' || (item.owner === auth.user && auth.user !== 'anonymous') || auth.role === 'admin');

  return createResponse(200, items);
}

// Handle POST requests
async function handlePostRequest(event) {

  const auth = await authorize(event);
  const body = JSON.parse(event.body);
  const { key, readable = '*', data, id } = body;
  const owner = auth.user;
  const created = new Date().toISOString(); // Get current date-time in ISO 8601 format

  if (key.startsWith('system')) {
    return createResponse(400, { message: 'Key "system*" is invalid.' });
  }
  if (key.startsWith(`privateKey`) && !key.startsWith(`privateKey-${auth.user}`)) {
    // Only authenticated users can add private data
    return createResponse(403, { message: `Only xxx can add "privateKey-xxx".` });
  }

  const newItem = {
    TableName: tableName,
    Item: {
      key,
      readable,
      owner,
      created,
      data,
      id,
    },
  };

  await dynamoDB.send(new PutCommand(newItem));

  return createResponse(200, { message: 'Item added successfully', owner: owner });
}

// Handle DELETE requests
async function handleDeleteRequest(event) {
  const auth = await authorize(event);
  if (!auth.isAuthorized) {
    return createResponse(401, { message: 'Unauthorized' });
  }

  const body = JSON.parse(event.body);
  const { key, created, id } = body;

  if (key.startsWith('system') || auth.role === 'anonymous') {
    return createResponse(400, { message: 'Key "system*" is invalid or unauthorized action.' });
  }

  if(id){
    // Only the owner of the item can delete it
    const queryCommand = new QueryCommand({
      TableName: tableName,
      IndexName: 'idIndex',
      KeyConditionExpression: '#key = :keyValue AND #id = :idValue',
      ExpressionAttributeNames: {
        '#key': 'key',
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':keyValue': key,
        ':idValue': id
      },
    });
    const queryResult = await dynamoDB.send(queryCommand);
    const items = queryResult.Items.filter(item => { return item.owner === auth.user || auth.role === 'admin'});
    if(items.length === 0){
      return createResponse(403, { message: 'Forbidden: You can only delete your own items.' });
    }
    for(const item of items){
      await dynamoDB.send(new DeleteCommand({ TableName: tableName, Key: { key, created: item.created } }));
    }
    return createResponse(200, { message: 'Item deleted successfully' });
  } else {
    // Only the owner of the item can delete it
    const item = await dynamoDB.send(new GetCommand({ TableName: tableName, Key: { key, created } }));
    if (item.Item && (item.Item.owner === auth.user || auth.role === 'admin')) {
      await dynamoDB.send(new DeleteCommand({ TableName: tableName, Key: { key, created } }));
      return createResponse(200, { message: 'Item deleted successfully' });
    } else {
      return createResponse(403, { message: 'Forbidden: You can only delete your own items.' });
    }
  }
}

// Handle Auth requests
async function handleAuthRequest(event) {
  const auth = await authorize(event);
  if (!auth.isAuthorized) {
    return createResponse(401, { message: 'Unauthorized' });
  }

  // Assuming the user's info and role are contained in the auth object
  // Modify as needed to fit your user info structure
  const userInfo = {
    user: auth.user,
    role: auth.role
  };

  return createResponse(200, userInfo);
}

// Utility function for creating HTTP responses with CORS enabled
function createResponse(statusCode, body) {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE',
    },
  };
}

// Authorize the request
export const authorize = async (event) => {
  
  const secretToken = event?.headers?.secrettoken;
  const tokenStr = event?.headers?.authorization;

  let errorMessage = '';

  // authorized by SecretToken
  if(secretToken){
    try {
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
      const user = JSON.parse(data.Items[0].data).user;
      
      const role = await checkUserRole(user);

      if (data.Items && data.Items.length === 1) {
        return {
          status: 'ok',
          isAuthorized: true,
          user: user,
          role: role ?? 'authenticatedUser',
          message: 'Authorized by SecretToken',
        }
      }
      errorMessage = 'Unauthorized: SecretToken is invalid';
    } catch (error) {
      console.error({error});
      errorMessage = `Unauthorized: ${error.message}`;
    }
    return {
      status: 'failed',
      isAuthorized: false,
      user: 'anonymous',
      role: 'anonymous',
      message: errorMessage,
    }
  }

  // authorized by JWT token
  if (tokenStr?.startsWith('Bearer ')) {

    // Get the token from the Authorization header
    const token = tokenStr.split(' ')[1];

    try {
      // if the public key cache is uninitialized, expired, or updated more than an hour ago, get the public keys
      if (!cachedGooglePublicKeys || !lastUpdatedTime || (Date.now() - lastUpdatedTime) > 3600000) {
        const response = await axios.get(GOOGLE_PUBLIC_KEYS_URL, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        cachedGooglePublicKeys = response.data;
        lastUpdatedTime = Date.now();
      }

      // Get the kid from the token
      const unverifiedToken = jwt.decode(token, { complete: true });
      const kid = unverifiedToken?.header.kid;

      // Select the appropriate public key
      const publicKey = cachedGooglePublicKeys[kid];
      if (!publicKey) {
        throw new Error('Invalid token: kid not recognized');
      }

      // Verify the token
      const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

      const role = await checkUserRole(decoded.email);
      return {
        status: 'ok',
        isAuthorized: true,
        user: decoded.email,
        role: role ?? 'authenticatedUser',
        message: 'Authorized by JWT',
      };
    } catch (error) {
      console.error({error});
      // failed to verify the token or token is expired
      return {
        status: 'failed',
        isAuthorized: false,
        user: 'anonymous',
        role: 'anonymous',
        message: `Unauthorized: ${error.message}`,
      }
    }
  }

  // not authorized
  return {
    status: 'ok',
    isAuthorized: false,
    user: 'anonymous',
    role: 'anonymous',
    message: 'Unauthorized',
  }
}

// Check user role
export const checkUserRole = async (userId) => {
  if(userId === 'anonymous') return null;
  const key = `systemUser-${userId}`;
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
  if (data.Items && data.Items.length === 1 && data.Items[0].data) {
    return JSON.parse(data.Items[0].data)?.role;
  }
  return null;
}

export { handleGetRequest, handlePostRequest, handleDeleteRequest };
