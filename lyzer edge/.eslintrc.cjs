module.exports = {
  env: {
    browser: true,
    node: true,
    es2022: true
  },
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended"
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  rules: {
    "prettier/prettier": "warn",
    "no-unused-vars": "warn",
    "no-empty": ["error", { "allowEmptyCatch": true }],
    "no-constant-condition": "warn",
    "no-useless-escape": "warn",
    "no-inner-declarations": "warn"
  }
};
