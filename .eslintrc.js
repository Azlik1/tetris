module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'indent': ['warn', 2],
    'quotes': ['warn', 'single'],
    'semi': ['warn', 'always'],
    'comma-dangle': ['warn', 'never'],
    'no-multiple-empty-lines': ['warn', { max: 2 }]
  },
  globals: {
    io: 'readonly'
  },
  overrides: [
    {
      files: ['frontend/**/*.js'],
      env: {
        browser: true
      }
    },
    {
      files: ['backend/**/*.js'],
      env: {
        node: true
      }
    }
  ]
};
