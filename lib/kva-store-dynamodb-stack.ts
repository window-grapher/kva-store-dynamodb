import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'; // DynamoDBのインポート
import * as lambda from 'aws-cdk-lib/aws-lambda';    // Lambdaのインポート
import * as s3 from 'aws-cdk-lib/aws-s3';           // S3のインポート

export class KvaStoreDynamodbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDBテーブルの定義
    const table = new dynamodb.Table(this, 'keyValueArrayStoreTable', {
      partitionKey: { name: 'key', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created', type: dynamodb.AttributeType.STRING },
      tableName: 'keyValueArrayStoreTable',
      // その他の設定...
    });

    // Lambda関数の定義
    const myFunction = new lambda.Function(this, 'keyValueArrayStoreHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda/functions'),
      handler: 'index.handler',
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
      // バケット設定...
    });

    // S3バケットへの権限付与
    bucket.grantReadWrite(myFunction);
  }
}
