import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';

interface KvaStoreDynamodbStackProps extends cdk.StackProps {
  envName: string; // e.g. 'staging', 'production'
  adminUserSecretToken: string;
  authenticatedUserSecretToken: string;
}

export class KvaStoreDynamodbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: KvaStoreDynamodbStackProps) {
    super(scope, id, props);

    // e.g. `keyValueArrayStoreTable-staging`
    const tableName = `keyValueArrayStoreTable-${props.envName}`;
    const functionName = `keyValueArrayStoreHandler-${props.envName}`;
    const bucketName = `keyvaluearraystorebucket-${props.envName.toLowerCase()}`; // S3 bucket name is case-insensitive

    // DynamoDB table definition
    const table = new dynamodb.Table(this, 'keyValueArrayStoreTable', {
      partitionKey: { name: 'key', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created', type: dynamodb.AttributeType.STRING },
      tableName: tableName,
      // DynamoDB table settings...
    });

    // Add local secondary indexes
    const secondaryIndexes = ['readable', 'owner', 'id'];
    for (const indexName of secondaryIndexes) {
      table.addLocalSecondaryIndex({
        indexName: `${indexName}Index`,
        sortKey: { name: indexName, type: dynamodb.AttributeType.STRING },
        projectionType: dynamodb.ProjectionType.ALL,
      });
    }
    
    // Main handler function
    const myFunction = new lambda.Function(this, 'keyValueArrayStoreHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda/functions'),
      handler: 'index.handler',
      functionName: functionName,
      environment: {
        BRANCH_NAME: props.envName,
      }
      // lambda function settings...
    });

    // Function URL activation
    myFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      // function URL settings...
    });

    const functions = [myFunction];

    // Staging test data initialization for DynamoDB
    if (props.envName === 'staging') {      
      const initFunction = new lambda.Function(this, 'keyValueArrayStoreTestDataInitHandler', {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset('lambda/functions'),
        handler: 'init.handler',
        functionName: 'keyValueArrayStoreTestDataInitHandler',
        environment: {
          BRANCH_NAME: props.envName,
          ADMIN_USER_SECRET_TOKEN: props.adminUserSecretToken,
          AUTHENTICATED_USER_SECRET_TOKEN: props.authenticatedUserSecretToken,
        }
      });
      functions.push(initFunction);
    }

    // Create an S3 bucket
    const bucket = new s3.Bucket(this, 'keyValueArrayStoreBucket', {
      bucketName: bucketName,
      // Bucket settings...
    });
    
    // Add permissions
    for (const func of functions) {
      // DynamoDB table permission
      table.grantReadWriteData(func);

      // S3 bucket permission
      bucket.grantReadWrite(func);
    }
  }
}
