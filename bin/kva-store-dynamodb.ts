#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KvaStoreDynamodbStack } from '../lib/kva-store-dynamodb-stack';

// Get the environment from the environment variable, default is 'staging'
const env = process.env.ENVIRONMENT || 'staging';

// Get the secret tokens from the environment variables
const adminUserSecretToken : string = process.env.ADMIN_USER_SECRET_TOKEN || 'admin';
const authenticatedUserSecretToken : string = process.env.AUTHENTICATED_USER_SECRET_TOKEN || 'authenticated';

const app = new cdk.App();
new KvaStoreDynamodbStack(app, `KvaStoreDynamodbStack-${env}`, {
  env: {
    region: 'ap-northeast-1',
  },
  envName: env,
  adminUserSecretToken: adminUserSecretToken,
  authenticatedUserSecretToken: authenticatedUserSecretToken,
});
