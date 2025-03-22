import { docClient } from "../utils/dynamoClient";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { getBalance } from "./balanceService";
import { InsufficientFundsError } from "../errors/InsufficientFundsError";
import { TransactInput, TransactionType } from "../interfaces/TransactInput";
import { handleDynamoTransactionError } from "../utils/parseDynamoError";

const USER_BALANCE_TABLE = "UserBalances";
const TRANSACTION_TABLE = "TransactionRecords";

async function transactInternal(
  userId: string,
  idempotentKey: string,
  amount: number,
  type: TransactionType
): Promise<void> {
  try {
    // Retrieve user balance from DynamoDB (from Task 1)
    const currentBalance = await getBalance(userId);

    const newBalance =
      type === TransactionType.CREDIT
        ? currentBalance + amount
        : currentBalance - amount;

    if (newBalance < 0) {
      // Prevent balance from dropping below zero (from Task 2)
      throw new InsufficientFundsError();
    }

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TRANSACTION_TABLE,
              Item: { idempotentKey, userId, amount, type },
              ConditionExpression: "attribute_not_exists(idempotentKey)"
              // Enforce idempotency - no duplicate transactions (from Task 2)
            }
          },
          {
            Update: {
              TableName: USER_BALANCE_TABLE,
              Key: { userId },
              UpdateExpression: "SET balance = :newBalance",
              ConditionExpression: "balance >= :amount OR attribute_not_exists(balance)",
              ExpressionAttributeValues: {
                ":newBalance": newBalance,
                ":amount": amount
              }
              // Ensure atomic update to prevent race conditions (from Task 2)
            }
          }
        ]
      })
    );

    console.log(`Transaction successful: ${type} ${amount} for user ${userId}`);
  } catch (error: any) {
    // Catch and map DynamoDB transaction failure reasons (for Task2)
    handleDynamoTransactionError(error);
  }
}

export async function transact(raw: TransactInput): Promise<void> {
  // Input validation (Task 2)
  const { userId, idempotentKey, amount, type } = raw;

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid userId: must be a non-empty string.");
  }
  if (!idempotentKey || typeof idempotentKey !== "string") {
    throw new Error("Invalid idempotentKey: must be a non-empty string.");
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Invalid amount: must be a positive number.");
  }
  if (!Object.values(TransactionType).includes(type)) {
    throw new Error("Invalid transaction type: must be 'credit' or 'debit'.");
  }

  return transactInternal(userId, idempotentKey, amount, type);
}
