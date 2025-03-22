# DynamoDB Transactions - TypeScript Assessment

This project implements a transaction-safe balance management system using AWS DynamoDB, written in TypeScript, with clear functionality, strong type safety, and test coverage.

---

## Tasks Covered

### Task 1: Get Current Balance

- Retrieves current user balance from DynamoDB.
- Returns default balance of `100` if user is not found.

```ts
await getBalance('user-id-123');
// 100 (if user doesn't exist)
```

### Task 2: Transact Function

- Handles `credit` and `debit` transactions.
- Fully **idempotent** (via `idempotentKey`).
- Prevents **overdraft** (balance can't go below 0).
- **Race-condition safe** using DynamoDB's `TransactWriteCommand`.

```ts
await transact({
  userId: 'user-123',
  idempotentKey: 'txn-456',
  amount: 50,
  type: TransactionType.CREDIT,
});
```

---

## Tech Stack

- **TypeScript**
- **Jest** for testing
- **AWS SDK v3** (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- **DynamoDB Local** via Docker
- Custom **error classes** and **transaction type enums**

---

## Running Tests

```bash
# Run full test suite after setting up DynamoDB
npm run test:full

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

---

## Local Development with Docker

### Start local DynamoDB and app:

```bash
docker-compose up --build
```

This will:

1. Start `amazon/dynamodb-local` on port `8000`
2. Build and run the Node.js app
3. Auto-run setup script to create tables
4. Run `src/index.ts` as entrypoint

---

## Project Structure

```
.
├── Dockerfile
├── docker-compose.yml
├── scripts/setupTables.ts          # Creates DynamoDB tables
├── src/
│   ├── errors/                     # Custom error classes
│   ├── interfaces/                # TransactInput + enum
│   ├── services/                  # Core logic
│   ├── tests/                     # Unit + integration tests
│   └── utils/                     # DynamoDB client + error handling
```

---

## Type Safety

- `TransactInput` interface defines the input contract
- `TransactionType` enum ensures correct usage of `'credit'` | `'debit'`
- Input validation in both `getBalance` and `transact`

---

## Evaluation Checklist

| Criteria             | Status | Notes                               |
| -------------------- | ------ | ----------------------------------- |
| Get balance function | done   | Returns default 100 if user missing |
| Transact function    | done   | Credits, debits, validates          |
| Idempotency          | done   | Prevents duplicates                 |
| Race conditions      | done   | Atomic transactions                 |
| Code quality         | done   | Modular, typed, tested              |
| Error handling       | done   | Validation + custom errors          |
| Test coverage        | done   | Unit & integration tests            |

---

## Environment Variables

`.env`, `.env.local`, and `.env.docker` are used for configuration.

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
DYNAMO_ENDPOINT=http://localhost:8000
NODE_ENV=test
```

---

## Author

Jove Trajkoski

---
