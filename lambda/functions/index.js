const AWS = require('aws-sdk')
const dynamoDB = new AWS.DynamoDB.DocumentClient()

exports.handler = async (event) => {
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
    TableName: 'keyValueArrayStoreTable', // DynamoDBテーブル名
    KeyConditionExpression: '#key = :keyValue', // '#key'を使用
    ExpressionAttributeNames: {
      '#key': 'key' // '#key'は実際の属性名'key'を指す
    },
    ExpressionAttributeValues: {
      ':keyValue': keyParam
    },
    ScanIndexForward: false // 新しい順にソート
  }

  if (limitParam) {
    params.Limit = limitParam
  }

  const data = await dynamoDB.query(params).promise()

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
  const readable = body.readable
  const owner = body.owner
  const created = new Date().toISOString() // 現在の日時をISO 8601形式で取得
  const data = body.data

  const newItem = {
    TableName: 'keyValueArrayStoreTable', // DynamoDBテーブル名
    Item: {
      key: body.key,
      readable,
      owner,
      created, // 'created'フィールドに日時を設定
      data
      // その他のデータ項目...
    }
  }

  await dynamoDB.put(newItem).promise()

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
    TableName: 'keyValueArrayStoreTable', // DynamoDBテーブル名
    Key: {
      key,
      created
    }
  }

  await dynamoDB.delete(params).promise()

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
