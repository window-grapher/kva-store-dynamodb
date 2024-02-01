import { handler, handleGetRequest, handlePostRequest, handleDeleteRequest } from '../lambda/functions/index.mjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: jest.fn(),
    }),
  },
  QueryCommand: jest.fn(),
  PutCommand: jest.fn(),
  DeleteCommand: jest.fn(),
}));

describe('DynamoDB Lambda Handler', () => {
  const mockSend = DynamoDBDocumentClient.from().send;

  beforeEach(() => {
    DynamoDBClient.mockClear();
    DynamoDBDocumentClient.from.mockClear();
    mockSend.mockClear();
    QueryCommand.mockClear();
    PutCommand.mockClear();
    DeleteCommand.mockClear();
  });

  it('should handle GET request', async () => {
    const event = {
      requestContext: { http: { method: 'GET' } },
      queryStringParameters: { key: 'testKey', limit: '10' }
    };
    mockSend.mockResolvedValue({ Items: [{ test: 'data' }] });

    const result = await handleGetRequest(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([{ test: 'data' }]);
    expect(QueryCommand).toHaveBeenCalledTimes(1);
  });

  it('should handle POST request', async () => {
    const event = {
      requestContext: { http: { method: 'POST' } },
      body: JSON.stringify({ key: 'testKey', data: 'testData' })
    };
    mockSend.mockResolvedValue({});

    const result = await handlePostRequest(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: 'Item created successfully' });
    expect(PutCommand).toHaveBeenCalledTimes(1);
  });

  it('should handle DELETE request', async () => {
    const event = {
      requestContext: { http: { method: 'DELETE' } },
      queryStringParameters: { key: 'testKey', created: '2024-02-01T00:00:00.000Z' }
    };
    mockSend.mockResolvedValue({});

    const result = await handleDeleteRequest(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: 'Item deleted successfully' });
    expect(DeleteCommand).toHaveBeenCalledTimes(1);
  });

  // it('should handle errors', async () => {
  //   const event = { requestContext: { http: { method: 'UNKNOWN' } } };
  //   const result = await handler(event);
  //   expect(result.statusCode).toBe(500);
  // });
});
