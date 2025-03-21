// scripts/setupTables.ts

import {
  CreateTableCommand,
  ListTablesCommand,
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: "local",
  endpoint: process.env.DYNAMO_ENDPOINT || "http://localhost:8000",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fakeMyKeyId",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fakeSecretAccessKey"
  }
});

async function createTableIfNotExists(command: CreateTableCommand) {
  const tables = await client.send(new ListTablesCommand({}));
  const name = command.input.TableName!;
  if (!tables.TableNames?.includes(name)) {
    console.log(`Creating table: ${name}`);
    await client.send(command);
  } else {
    console.log(`Table "${name}" already exists.`);
  }
}

async function main() {
  await createTableIfNotExists(
    new CreateTableCommand({
      TableName: "UserBalances",
      AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
      KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    })
  );

  await createTableIfNotExists(
    new CreateTableCommand({
      TableName: "TransactionRecords",
      AttributeDefinitions: [{ AttributeName: "idempotentKey", AttributeType: "S" }],
      KeySchema: [{ AttributeName: "idempotentKey", KeyType: "HASH" }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    })
  );

  console.log("All tables ready!");
}

main().catch((err) => {
  console.error("Error setting up tables:", err);
  process.exit(1);
});
