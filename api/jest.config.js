/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "..",
  roots: ["<rootDir>/api/src", "<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.integration.test.ts", "**/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/api/tsconfig.jest.json" }],
  },
  moduleNameMapper: {
    "^@domain/entities/(.*)$": [
      "<rootDir>/api/src/domain/entities/$1",
      "<rootDir>/src/domain/entities/$1",
    ],
    "^@domain/repositories/(.*)$": [
      "<rootDir>/api/src/domain/repositories/$1",
      "<rootDir>/src/domain/repositories/$1",
    ],
    "^@domain/services/(.*)$": "<rootDir>/src/domain/services/$1",
    "^@domain/exceptions$": "<rootDir>/src/domain/exceptions",
    "^@domain/exceptions/(.*)$": "<rootDir>/src/domain/exceptions/$1",
    "^@domain/value-objects/(.*)$": "<rootDir>/src/domain/value-objects/$1",
    "^@domain/(.*)$": "<rootDir>/src/domain/$1",
    "^@application/(.*)$": "<rootDir>/src/application/$1",
    "^@infrastructure/(.*)$": "<rootDir>/src/infrastructure/$1",
    "^@presentation/(.*)$": "<rootDir>/src/presentation/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^uuid$": "<rootDir>/api/node_modules/uuid",
    "^@aws-sdk/client-dynamodb$": "<rootDir>/api/node_modules/@aws-sdk/client-dynamodb",
    "^@aws-sdk/lib-dynamodb$": "<rootDir>/api/node_modules/@aws-sdk/lib-dynamodb",
    "^jsonwebtoken$": "<rootDir>/api/node_modules/jsonwebtoken",
    "^jwks-rsa$": "<rootDir>/api/node_modules/jwks-rsa",
  },
  collectCoverageFrom: [
    "src/application/use-cases/**/*.ts",
    "!**/__tests__/**",
    "!**/node_modules/**",
    "!**/index.ts",
  ],
  coverageThreshold: {
    global: { branches: 90, functions: 95, lines: 95, statements: 95 },
  },
};
