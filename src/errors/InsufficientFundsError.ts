export class InsufficientFundsError extends Error {
  constructor() {
    super("Insufficient funds.");
    this.name = "InsufficientFundsError";
  }
}
