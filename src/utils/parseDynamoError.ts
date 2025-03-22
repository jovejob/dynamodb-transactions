import { DuplicateTransactionError } from "../errors/DuplicateTransactionError";
import { InsufficientFundsError } from "../errors/InsufficientFundsError";

export function handleDynamoTransactionError(error: any): never {
  if (error.name === "TransactionCanceledException" && Array.isArray(error.CancellationReasons)) {
    const reasons = error.CancellationReasons.map((r: any) => r?.Code);

    // Order matters: match reasons[0] to Put, reasons[1] to Update
    const [putReason, updateReason] = reasons;

    if (putReason === "ConditionalCheckFailed") {
      console.log("Duplicate transaction detected, skipping.");
      throw new DuplicateTransactionError();
    }

    if (updateReason === "ConditionalCheckFailed") {
      throw new InsufficientFundsError();
    }
  }

  // Fallback: rethrow generic error
  console.error("Transaction failed:", error);
  throw new Error("Transaction could not be processed: " + error.message);
}
