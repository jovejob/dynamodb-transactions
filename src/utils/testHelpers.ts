import { ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../utils/dynamoClient";

export async function clearTransactionsTable() {
  // Prevent accidental deletion in non-test environments
  if (process.env.NODE_ENV !== "test") {
    throw new Error("clearTransactionsTable should only be used in tests!");
  }

  const scanResult = await docClient.send(
    new ScanCommand({ TableName: "TransactionRecords", ProjectionExpression: "idempotentKey" })
  );

  const keys = scanResult.Items ?? [];

  for (const item of keys) {
    await docClient.send(
      new DeleteCommand({
        TableName: "TransactionRecords",
        Key: { idempotentKey: item.idempotentKey }
      })
    );
  }
}
