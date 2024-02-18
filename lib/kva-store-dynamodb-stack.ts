import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';

interface KvaStoreDynamodbStackProps extends cdk.StackProps {
  envName: string; // 環境名を示す新しいプロパティ
}

export class KvaStoreDynamodbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: KvaStoreDynamodbStackProps) {
    super(scope, id, props);

    // リソース名に環境名を含める
    const tableName = `keyValueArrayStoreTable-${props.envName}`;
    const functionName = `keyValueArrayStoreHandler-${props.envName}`;
    const bucketName = `keyvaluearraystorebucket-${props.envName.toLowerCase()}`; // S3バケット名は小文字のみ

    // DynamoDBテーブルの定義
    const table = new dynamodb.Table(this, 'keyValueArrayStoreTable', {
      partitionKey: { name: 'key', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created', type: dynamodb.AttributeType.STRING },
      tableName: tableName,
      // その他の設定...
    });
    // ローカルセカンダリインデックスの追加
    const secondaryIndexes = ['readable', 'owner', 'path', 'data', 'id'];
    for (const indexName of secondaryIndexes) {
      table.addLocalSecondaryIndex({
        indexName: `${indexName}Index`,
        sortKey: { name: indexName, type: dynamodb.AttributeType.STRING },
        projectionType: dynamodb.ProjectionType.ALL, // 必要に応じて変更
      });
    }
    
    // Lambda関数の定義
    const myFunction = new lambda.Function(this, 'keyValueArrayStoreHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda/functions'),
      handler: 'index.handler',
      functionName: functionName, // 関数名に環境名を含める
      environment: {
        BRANCH_NAME: props.envName, // ここでブランチ名を設定
      }
      // その他の設定...
    });
    // 関数URLの有効化
    myFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE, // 認証のタイプを設定
      // その他の設定...
    });

    // DynamoDBテーブルへの権限付与
    table.grantReadWriteData(myFunction);

    // S3バケットの定義
    const bucket = new s3.Bucket(this, 'keyValueArrayStoreBucket', {
      bucketName: bucketName, // バケット名に環境名を含める
      // バケット設定...
    });

    // DynamoDBテーブルへの権限付与
    table.grantReadWriteData(myFunction);

    // S3バケットへの権限付与
    bucket.grantReadWrite(myFunction);
  }
}
