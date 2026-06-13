module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true,
    },
    extends: [
        "eslint:recommended",
        "node",
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: "module",
    },
    rules: {
        // Error prevention
        "no-console": "warn",
        "no-debugger": "error",
        "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        "no-undef": "error",
        "no-unreachable": "error",
        
        // Code style
        "indent": ["error", 4],
        "linebreak-style": ["error", "unix"],
        "quotes": ["error", "double"],
        "semi": ["error", "always"],
        "comma-dangle": ["error", "always-multiline"],
        
        // Best practices
        "eqeqeq": "error",
        "no-eval": "error",
        "no-implied-eval": "error",
        "no-new-func": "error",
        "no-return-assign": "error",
        "no-self-compare": "error",
        "no-throw-literal": "error",
        "prefer-const": "error",
        "no-var": "error",
        
        // Node.js specific
        "node/no-unpublished-require": "off",
        "node/no-missing-require": "error",
        "node/no-extraneous-require": "error",
        
        // Security
        "no-unsafe-finally": "error",
        "no-unsafe-optional-chaining": "error",
    },
    overrides: [
        {
            files: ["**/*.test.js", "**/*.spec.js"],
            env: {
                jest: true,
            },
            rules: {
                "no-console": "off",
            },
        },
    ],
};