import { getBalance } from "../services/balanceService";
import { docClient } from "../utils/dynamoClient";
import { GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

jest.mock("../utils/dynamoClient", () => ({
  docClient: {
    send: jest.fn()
  }
}));

describe("getBalance function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return user balance if found in DB", async () => {
    (docClient.send as jest.Mock).mockResolvedValue({
      Item: { balance: 200 }
    });

    const balance = await getBalance("user-1");
    expect(balance).toBe(200);

    expect(docClient.send).toHaveBeenCalledWith(expect.any(GetCommand));
  });

  it("should return default balance (100) if user is not found", async () => {
    (docClient.send as jest.Mock).mockResolvedValue({}); // No Item

    const balance = await getBalance("user-2");
    expect(balance).toBe(100);
  });

  it("should handle errors gracefully", async () => {
    (docClient.send as jest.Mock).mockRejectedValue(new Error("DB error"));

    await expect(getBalance("user-3")).rejects.toThrow("Could not retrieve user balance");
  });
});
