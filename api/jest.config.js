/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "..",
  roots: ["<rootDir>/api/src", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.integration.test.ts", "**/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/api/tsconfig.jest.json" }],
  },
  moduleNameMapper: {
    "^@domain/entities/(.*)$": "<rootDir>/api/src/domain/entities/$1",
    "^@domain/repositories/(.*)$": "<rootDir>/api/src/domain/repositories/$1",
    "^@domain/services/(.*)$": "<rootDir>/api/src/domain/services/$1",
    "^@domain/exceptions$": "<rootDir>/api/src/domain/exceptions",
    "^@domain/exceptions/(.*)$": "<rootDir>/api/src/domain/exceptions/$1",
    "^@domain/value-objects/(.*)$": "<rootDir>/api/src/domain/value-objects/$1",
    "^@domain/(.*)$": "<rootDir>/api/src/domain/$1",
    "^@application/(.*)$": "<rootDir>/api/src/application/$1",
    "^@infrastructure/(.*)$": "<rootDir>/api/src/infrastructure/$1",
    "^@presentation/(.*)$": "<rootDir>/api/src/presentation/$1",
    "^@shared/(.*)$": "<rootDir>/api/src/shared/$1",
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
    global: { branches: 85, functions: 95, lines: 95, statements: 95 },
  },
};
