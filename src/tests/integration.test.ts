import { transact } from "../services/transactionService";
import { getBalance } from "../services/balanceService";
import { docClient } from "../utils/dynamoClient";
import { PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

import { TransactionType } from "../interfaces/TransactInput";
import { clearTransactionsTable } from "../utils/testHelpers";

const TEST_USER_ID = "test-user";
const TRANSACTION_TABLE = "TransactionRecords";
const USER_BALANCE_TABLE = "UserBalances";

// todo move/Helper to clean up test transaction keys
const deleteTransactions = async (...keys: string[]) => {
  for (const key of keys) {
    await docClient.send(
      new DeleteCommand({
        TableName: TRANSACTION_TABLE,
        Key: { idempotentKey: key }
      })
    );
  }
};

describe("Integration Tests (Real DynamoDB)", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test"; // for safety check

    await clearTransactionsTable();

    // Ensure the test user exists initially
    await docClient.send(new PutCommand({
      TableName: USER_BALANCE_TABLE,
      Item: { userId: TEST_USER_ID, balance: 100 }
    }));
  });

  beforeEach(async () => {
    // Reset user balance before each test
    await docClient.send(new PutCommand({
      TableName: USER_BALANCE_TABLE,
      Item: { userId: TEST_USER_ID, balance: 100 }
    }));
  });

  afterAll(async () => {
    await clearTransactionsTable();

    // Cleanup after all tests
    await docClient.send(new DeleteCommand({
      TableName: USER_BALANCE_TABLE,
      Key: { userId: TEST_USER_ID }
    }));
  });

  it("should retrieve the correct balance from DynamoDB", async () => {
    const balance = await getBalance(TEST_USER_ID);
    expect(balance).toBe(100);
  });

  it("should process a credit transaction successfully", async () => {
    await transact({ userId: TEST_USER_ID, idempotentKey: "txn-credit-1", amount: 50, type: TransactionType.CREDIT });
    const newBalance = await getBalance(TEST_USER_ID);
    expect(newBalance).toBe(150);
  });

  it("should process a debit transaction successfully", async () => {
    await transact({ userId: TEST_USER_ID, idempotentKey: "txn-debit-1", amount: 30, type: TransactionType.DEBIT });
    const newBalance = await getBalance(TEST_USER_ID);
    expect(newBalance).toBe(70);
  });

  it("should prevent a duplicate transaction (idempotency check)", async () => {
    await transact({ userId: TEST_USER_ID, idempotentKey: "txn-idem-1", amount: 20, type: TransactionType.CREDIT });
    const balanceAfterFirst = await getBalance(TEST_USER_ID);

    try {
      await transact({ userId: TEST_USER_ID, idempotentKey: "txn-idem-1", amount: 20, type: TransactionType.CREDIT }); // Duplicate
    } catch (err: any) {
      expect(err.message).toContain("Duplicate transaction detected");
    }

    const balanceAfterDuplicate = await getBalance(TEST_USER_ID);
    expect(balanceAfterFirst).toBe(balanceAfterDuplicate); // Should be unchanged
  });


  it("should prevent overdrawing the balance (balance should not go below 0)", async () => {
    const before = await getBalance(TEST_USER_ID);

    await expect(
      transact({
        userId: TEST_USER_ID,
        idempotentKey: "txn-overdraw-1",
        amount: 1000,
        type: TransactionType.DEBIT
      })
    ).rejects.toThrow("Insufficient funds.");

    const after = await getBalance(TEST_USER_ID);
    expect(after).toBe(before); // balance remains unchanged
  });

  it("should handle concurrent transactions correctly (prevent race conditions)", async () => {
    const before = await getBalance(TEST_USER_ID);

    const t1 = transact({
      userId: TEST_USER_ID,
      idempotentKey: "txn-concurrent-1",
      amount: 30,
      type: TransactionType.DEBIT
    });

    const t2 = transact({
      userId: TEST_USER_ID,
      idempotentKey: "txn-concurrent-2",
      amount: 30,
      type: TransactionType.DEBIT
    });

    await Promise.allSettled([t1, t2]);

    const after = await getBalance(TEST_USER_ID);
    const delta = before - after;

    expect([30, 60]).toContain(delta); // one or both succeeded
  });
});
