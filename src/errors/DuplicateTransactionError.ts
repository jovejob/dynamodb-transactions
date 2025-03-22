export class DuplicateTransactionError extends Error {
  constructor() {
    super("Duplicate transaction detected.");
    this.name = "DuplicateTransactionError";
  }
}
