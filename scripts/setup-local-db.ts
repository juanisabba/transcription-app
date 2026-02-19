/**
 * Script de inicialización para DynamoDB Local.
 * Crea las tablas:
 * - vocali-users-dev: UserRepository.findByEmail (GSI email-index)
 * - vocali-transcriptions-dev: TranscriptionRepository.findByUserId (PK: userId, SK: id)
 *
 * Uso: pnpm run setup:local-db
 * Requiere: DynamoDB Local corriendo en http://localhost:8000
 */

import {
  type CreateTableCommandInput,
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

const ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE ?? "vocali-users-dev";
const TRANSCRIPTIONS_TABLE =
  process.env.DYNAMODB_TRANSCRIPTIONS_TABLE ?? "vocali-transcriptions-dev";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "eu-west-1",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local",
  },
});

async function ensureTable(
  tableName: string,
  createParams: CreateTableCommandInput
) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`[setup-local-db] La tabla "${tableName}" ya existe.`);
  } catch {
    console.log(`[setup-local-db] Creando tabla "${tableName}"...`);
    await client.send(new CreateTableCommand(createParams));
    console.log(`[setup-local-db] Tabla "${tableName}" creada correctamente.`);
  }
}

async function main() {
  console.log(`[setup-local-db] Conectando a DynamoDB en: ${ENDPOINT}`);

  await ensureTable(USERS_TABLE, {
    TableName: USERS_TABLE,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" },
    ],
    KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "email-index",
        KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  });

  await ensureTable(TRANSCRIPTIONS_TABLE, {
    TableName: TRANSCRIPTIONS_TABLE,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "id", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "status-index",
        KeySchema: [{ AttributeName: "status", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  });
}

main().catch((err) => {
  console.error("[setup-local-db] Error:", err);
  process.exit(1);
});
