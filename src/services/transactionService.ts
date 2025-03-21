import { docClient } from "../utils/dynamoClient";
import { TransactWriteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getBalance } from "./balanceService";

const TABLE_NAME = "UserBalances";
const TRANSACTION_TABLE = "TransactionRecords";

type TransactionType = "credit" | "debit";

// Internal-only low-level logic (expects validated input)
async function transactInternal(
  userId: string,
  idempotentKey: string,
  amount: number,
  type: TransactionType
): Promise<void> {
  try {
    // Prevent duplicate transactions using idempotentKey
    const existingTransaction = await docClient.send(
      new GetCommand({
        TableName: TRANSACTION_TABLE,
        Key: { idempotentKey }
      })
    );

    if (existingTransaction.Item) {
      console.log("Duplicate transaction detected, skipping.");
      return;
    }

    // Retrieve user balance safely
    const userBalance = await getBalance(userId);

    // Prevent balance from going below zero
    let newBalance = type === "credit" ? userBalance + amount : userBalance - amount;
    if (newBalance < 0) {
      throw new Error("Insufficient funds.");
    }

    // Use TransactWriteCommand for atomic transaction handling
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TRANSACTION_TABLE,
            Item: { idempotentKey, userId, amount, type }
          }
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { userId },
            UpdateExpression: "SET balance = :newBalance",
            ConditionExpression: "balance >= :amount OR attribute_not_exists(balance)",
            ExpressionAttributeValues: {
              ":newBalance": newBalance,
              ":amount": amount
            }
          }
        }
      ]
    }));

    console.log(`Transaction successful: ${type} ${amount} for user ${userId}`);
  } catch (error: any) {
    console.error("Transaction failed:", error);
    throw new Error("Transaction could not be processed: " + error.message);
  }
}

// Public-facing validated entry point
export async function transact(raw: any): Promise<void> {
  const { userId, idempotentKey, amount, type } = raw;

  // Input validation
  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid userId: must be a non-empty string.");
  }
  if (!idempotentKey || typeof idempotentKey !== "string") {
    throw new Error("Invalid idempotentKey: must be a non-empty string.");
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Invalid amount: must be a positive number.");
  }
  if (type !== "credit" && type !== "debit") {
    throw new Error("Invalid transaction type: must be 'credit' or 'debit'.");
  }

  // Safe cast
  const safeType = type as TransactionType;

  // Call the internal logic
  return transactInternal(userId, idempotentKey, amount, safeType);
}
