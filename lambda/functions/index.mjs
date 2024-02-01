// DynamoDBクライアントのインポート
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'

// DynamoDBクライアントのインスタンスを作成
const dynamoDBClient = new DynamoDBClient({})
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient)

export const handler = async (event) => {
  const httpMethod = event.requestContext.http.method
  try {
    // POSTリクエストの処理
    switch (httpMethod) {
      case 'GET':
        return await handleGetRequest(event)
      case 'POST':
        return await handlePostRequest(event)
      case 'DELETE':
        return await handleDeleteRequest(event)
    }
  } catch (error) {
    console.error(error)
    return errorResponse(error.message)
  }
}

async function handleGetRequest (event) {
  if (!event.queryStringParameters || !event.queryStringParameters.key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Key parameter is required' }),
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }

  const keyParam = event.queryStringParameters.key
  let limitParam = parseInt(event.queryStringParameters.limit)

  if (isNaN(limitParam) || limitParam < 1) {
    limitParam = undefined // またはデフォルト値を設定
  }

  const params = {
    TableName: 'keyValueArrayStoreTable',
    KeyConditionExpression: '#key = :keyValue',
    ExpressionAttributeNames: {
      '#key': 'key'
    },
    ExpressionAttributeValues: {
      ':keyValue': keyParam
    },
    ScanIndexForward: false
  }

  if (limitParam) {
    params.Limit = limitParam
  }

  const command = new QueryCommand(params)
  const data = await dynamoDB.send(command)

  return {
    statusCode: 200,
    body: JSON.stringify(data.Items),
    headers: {
      'Content-Type': 'application/json'
    }
  }
}

async function handlePostRequest (event) {
  const body = JSON.parse(event.body)
  const readable = body.readable ?? '*'
  const owner = body.owner ?? 'anonymous'
  const created = new Date().toISOString() // 現在の日時をISO 8601形式で取得
  const data = body.data

  const newItem = {
    TableName: 'keyValueArrayStoreTable',
    Item: {
      key: body.key,
      readable,
      owner,
      created,
      data
    }
  }

  const command = new PutCommand(newItem)
  await dynamoDB.send(command)

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Item created successfully' }),
    headers: {
      'Content-Type': 'application/json'
    }
  }
}

async function handleDeleteRequest (event) {
  // DELETEリクエストでidパラメータが必要です
  if (!event.queryStringParameters || !event.queryStringParameters.key || !event.queryStringParameters.created) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'key and created parameter is required' }),
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }

  const key = event.queryStringParameters.key
  const created = event.queryStringParameters.created

  const params = {
    TableName: 'keyValueArrayStoreTable',
    Key: {
      key,
      created
    }
  }

  const command = new DeleteCommand(params)
  await dynamoDB.send(command)

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Item deleted successfully' }),
    headers: {
      'Content-Type': 'application/json'
    }
  }
}

function errorResponse (errorMessage) {
  return {
    statusCode: 500,
    body: JSON.stringify({ message: errorMessage }),
    headers: {
      'Content-Type': 'application/json'
    }
  }
}

export { handleGetRequest, handlePostRequest, handleDeleteRequest }