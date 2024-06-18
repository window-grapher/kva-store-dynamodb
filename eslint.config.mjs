
export default [
  {
    ignores: [
      'dist.js',
      'node_modules',
      'cdk.out',
      'tool/*',
      'jest.config.js',
    ]
  },
  {
    files: ['*.js', '*.mjs','lambda/functions/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        browser: 'readonly',
        commonjs: 'readonly',
        es2021: 'readonly',
        node: 'readonly'
      }
    },
    rules: {
      // スタイル関連のルール
      'indent': ['error', 2], // インデントを2スペースに設定
      'quotes': ['error', 'single'], // シングルクォートを強制
      'semi': ['error', 'always'], // 文の末尾にセミコロンを強制
      'linebreak-style': ['error', 'unix'], // Unix系の改行（LF）を強制

      // 変数関連のルール
      'no-unused-vars': ['warn'], // 未使用の変数を警告
      'no-undef': ['error'], // 定義されていない変数の使用をエラーにする

      // コード品質関連のルール
      'eqeqeq': ['error', 'always'], // 必ず厳密等価演算子（===）を使用する
      'curly': ['error', 'all'], // すべての制御構造に中括弧を強制
      'no-console': ['warn'], // console.logの使用を警告

      // ES6+関連のルール
      'prefer-const': ['error'], // 可能な場合はconstを使用する
      'arrow-spacing': ['error', { 'before': true, 'after': true }] // アロー関数の前後にスペースを強制
    }
  }
];
