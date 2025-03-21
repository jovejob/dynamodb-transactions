import { getBalance } from "./services/balanceService";
import { transact } from "./services/transactionService";
import { docClient } from "./utils/dynamoClient";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

console.log("App started... running test script.");

async function ensureUserExists(userId: string) {
  try {
    console.log(`Ensuring user ${userId} exists with balance 100...`);
    await docClient.send(
      new PutCommand({
        TableName: "UserBalances",
        Item: {
          userId,
          balance: 100
        }
      })
    );
    console.log(`User ${userId} ensured.`);
  } catch (err) {
    console.error("Failed to ensure user:", err);
    throw err;
  }
}

async function test() {
  try {
    const userId = "user-1";
    const idempotentKey = "txn-123";

    await ensureUserExists(userId);

    console.log("Fetching initial balance...");
    const balance = await getBalance(userId);
    console.log("Initial Balance:", balance);

    console.log("Processing credit transaction...");
    await transact({ userId, idempotentKey, amount: 50, type: "credit" });

    console.log("Fetching new balance...");
    const updatedBalance = await getBalance(userId);
    console.log("Updated Balance:", updatedBalance);
  } catch (e) {
    console.error("test() failed:", e);
  }
}

test().catch((err) => {
  console.error("Unhandled error in test():", err);
  process.exit(1);
});