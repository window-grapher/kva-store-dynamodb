#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KvaStoreDynamodbStack } from '../lib/kva-store-dynamodb-stack';

const env = process.env.ENVIRONMENT || 'staging'; // 環境変数から環境を取得、デフォルトは 'staging'

const app = new cdk.App();
new KvaStoreDynamodbStack(app, `KvaStoreDynamodbStack-${env}`, {
  env: {
    region: 'ap-northeast-1',
  },
  envName: env,
});
