import globals from 'globals';

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
    files: ['*.js', '*.mjs', 'lambda/functions/**/*.js', 'lambda/functions/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.es2021,
        ...globals.node,
        process: 'readonly',
        console: 'readonly'
      }
    },
    rules: {
      // Style rules
      'indent': ['error', 2], // Enforce 2-space indentation
      'quotes': ['error', 'single'], // Enforce single quotes
      'semi': ['error', 'always'], // Enforce semicolons at the end of statements
      'linebreak-style': ['error', 'unix'], // Enforce Unix linebreaks (LF)
    
      // Variable rules
      'no-unused-vars': ['warn'], // Warn about unused variables
      'no-undef': ['error'], // Error on the use of undefined variables
    
      // Code quality rules
      'eqeqeq': ['error', 'always'], // Enforce the use of strict equality (===)
      'curly': ['error', 'all'], // Enforce curly braces for all control structures
      'no-console': ['warn'], // Warn on the use of console.log
    
      // ES6+ rules
      'prefer-const': ['error'], // Enforce the use of const where possible
      'arrow-spacing': ['error', { 'before': true, 'after': true }] // Enforce spacing before and after arrow functions
    }
  }
];
