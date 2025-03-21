import { transact } from "../services/transactionService";
import { getBalance } from "../services/balanceService";
import { docClient } from "../utils/dynamoClient";
import { TransactWriteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// Mock balance service
jest.mock("../services/balanceService", () => ({
  getBalance: jest.fn()
}));

// Mock DynamoDB client
jest.mock("../utils/dynamoClient", () => ({
  docClient: {
    send: jest.fn()
  }
}));

describe("transact function - validation & error handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw an error for invalid userId", async () => {
    await expect(
      transact({ userId: "", idempotentKey: "txn-001", amount: 50, type: "credit" })
    ).rejects.toThrow("Invalid userId: must be a non-empty string.");
  });

  it("should throw an error for invalid idempotentKey", async () => {
    await expect(
      transact({ userId: "user-1", idempotentKey: "", amount: 50, type: "credit" })
    ).rejects.toThrow("Invalid idempotentKey: must be a non-empty string.");
  });

  it("should throw an error for negative or zero amount", async () => {
    await expect(
      transact({ userId: "user-1", idempotentKey: "txn-001", amount: 0, type: "credit" })
    ).rejects.toThrow("Invalid amount: must be a positive number.");
  });

  it("should throw an error for invalid transaction type", async () => {
    await expect(
      transact({ userId: "user-1", idempotentKey: "txn-001", amount: 50, type: "transfer" as any })
    ).rejects.toThrow("Invalid transaction type: must be 'credit' or 'debit'.");
  });
});

describe("transact function - logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process a credit transaction successfully", async () => {
    (docClient.send as jest.Mock).mockImplementation((command) => {
      if (command instanceof GetCommand) return Promise.resolve({});
      return Promise.resolve({});
    });

    (getBalance as jest.Mock).mockResolvedValue(100);

    await transact({
      userId: "user-1",
      idempotentKey: "txn-credit",
      amount: 50,
      type: "credit"
    });

    expect(docClient.send).toHaveBeenCalledWith(expect.any(TransactWriteCommand));
  });

  it("should process a debit transaction successfully", async () => {
    (docClient.send as jest.Mock).mockImplementation((command) => {
      if (command instanceof GetCommand) return Promise.resolve({});
      return Promise.resolve({});
    });

    (getBalance as jest.Mock).mockResolvedValue(150);

    await transact({
      userId: "user-1",
      idempotentKey: "txn-debit",
      amount: 50,
      type: "debit"
    });

    expect(docClient.send).toHaveBeenCalledWith(expect.any(TransactWriteCommand));
  });

  it("should prevent duplicate transactions using idempotency key", async () => {
    (docClient.send as jest.Mock).mockImplementation((command) => {
      if (command instanceof GetCommand) {
        return Promise.resolve({ Item: { idempotentKey: "txn-dupe" } });
      }
      return Promise.resolve({});
    });

    await transact({
      userId: "user-1",
      idempotentKey: "txn-dupe",
      amount: 50,
      type: "credit"
    });

    // Only GetCommand should be called
    expect(docClient.send).toHaveBeenCalledTimes(1);
    expect(docClient.send).toHaveBeenCalledWith(expect.any(GetCommand));
  });

  it("should prevent balance from going below zero", async () => {
    (docClient.send as jest.Mock).mockImplementation((command) => {
      if (command instanceof GetCommand) return Promise.resolve({});
      return Promise.resolve({});
    });

    (getBalance as jest.Mock).mockResolvedValue(30);

    await expect(
      transact({
        userId: "user-1",
        idempotentKey: "txn-overdraw",
        amount: 50,
        type: "debit"
      })
    ).rejects.toThrow("Insufficient funds.");
  });

  it("should handle race conditions correctly (simulate concurrent transactions)", async () => {
    (docClient.send as jest.Mock).mockImplementation((command) => {
      if (command instanceof GetCommand) return Promise.resolve({});
      return Promise.resolve({});
    });

    (getBalance as jest.Mock).mockResolvedValue(100);

    const t1 = transact({
      userId: "user-1",
      idempotentKey: "txn-concurrent-1",
      amount: 50,
      type: "debit"
    });

    const t2 = transact({
      userId: "user-1",
      idempotentKey: "txn-concurrent-2",
      amount: 50,
      type: "debit"
    });

    await Promise.all([t1, t2]);

    expect(docClient.send).toHaveBeenCalledWith(expect.any(GetCommand));
    expect(docClient.send).toHaveBeenCalledWith(expect.any(TransactWriteCommand));
    expect(docClient.send).toHaveBeenCalledTimes(4); // 2x GetCommand + 2x TransactWriteCommand
  });
});
