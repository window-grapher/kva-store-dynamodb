const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        if (!event.queryStringParameters || !event.queryStringParameters.key) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Key parameter is required" }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        const keyParam = event.queryStringParameters.key;
        let limitParam = parseInt(event.queryStringParameters.limit);

        if (isNaN(limitParam) || limitParam < 1) {
            limitParam = undefined; // またはデフォルト値を設定
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
        };

        if (limitParam) {
            params.Limit = limitParam;
        }

        const data = await dynamoDB.query(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
