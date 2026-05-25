export class DuplicateLegalRefError extends Error {
  readonly legalRef: string;

  constructor(legalRef: string) {
    super(`duplicate legalRef: ${legalRef}`);
    this.name = "DuplicateLegalRefError";
    this.legalRef = legalRef;
  }
}
