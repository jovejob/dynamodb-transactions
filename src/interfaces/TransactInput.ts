export enum TransactionType {
  CREDIT = "credit",
  DEBIT = "debit"
}

export interface TransactInput {
  userId: string;
  idempotentKey: string;
  amount: number;
  type: TransactionType;
}