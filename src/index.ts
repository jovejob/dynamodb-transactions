/**
 * This script demonstrates usage of getBalance and transact functions.
 * It is not part of the production code, but can be run to verify functionality
 * (we have the tests if u want to check more).
 */
import { getBalance } from "./services/balanceService";
import { transact } from "./services/transactionService";
import { docClient } from "./utils/dynamoClient";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { TransactionType } from "./interfaces/TransactInput";

async function ensureUserExists(userId: string) {
  await docClient.send(
    new PutCommand({
      TableName: "UserBalances",
      Item: {
        userId,
        balance: 100
      }
    })
  );
}

async function main() {
  const userId = "user-1";
  const idempotentKey = "txn-demo-123";

  await ensureUserExists(userId);

  const initial = await getBalance(userId);
  console.log(`Initial balance: ${initial}`);

  await transact({ userId, idempotentKey, amount: 50, type: TransactionType.CREDIT });

  const updated = await getBalance(userId);
  console.log(`Updated balance: ${updated}`);
}

main().catch((err) => {
  console.error("Demo script failed:", err);
  process.exit(1);
});