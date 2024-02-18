# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## 追加開発する機能

- S3ストレージ上のファイル取得API
- JWTによる認証機能

ーーー

- API側でのデータ暗号化

## 予約語

systemSecretToken-xxx


## ユーザロール
|ユーザロール|`*`読み取り|書き込み|自己データ削除|他者データ削除|
|---|---|---|---|---|
|非認証ユーザ|true|true - anonymous|false|false|
|認証済みユーザ|true|true - user name|true|fase|
|管理者ユーザ|true|true - user name|true|true|

