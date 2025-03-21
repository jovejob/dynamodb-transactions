import { docClient } from "../utils/dynamoClient";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = "UserBalances";

export async function getBalance(userId: string): Promise<number> {
  try {
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId: must be a non-empty string.");
    }

    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId }
      })
    );

    if (response.Item && response.Item.balance !== undefined) {
      return response.Item.balance;
    }

    // Task 1: If user doesn't exist, return default balance (100 USD)
    return 100;
  } catch (error) {
    console.error("Error fetching balance:", error);
    throw new Error("Could not retrieve user balance");
  }
}
