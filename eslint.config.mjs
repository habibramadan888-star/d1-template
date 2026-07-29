import js from "@eslint/js";

export default [
  {
    ignores: [
      "node_modules/**",
      ".wrangler/**",
      ".wrangler-dryrun/**",
      "deploy-worker/src/index.embedded.js",
      "deploy-worker/public/**",
      "*.html"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "script",
      globals: {
        console: "readonly",
        crypto: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        Uint8Array: "readonly",
        ArrayBuffer: "readonly",
        btoa: "readonly",
        atob: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        Blob: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-redeclare": "off",
      "no-useless-escape": "off"
    }
  },
  {
    files: ["deploy-worker/src/index.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-redeclare": "off",
      "no-useless-escape": "off"
    }
  }
];
