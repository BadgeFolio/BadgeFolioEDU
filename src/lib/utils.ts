/**
 * Compares two email addresses in a case-insensitive manner
 * @param email1 First email address to compare
 * @param email2 Second email address to compare
 * @returns True if emails match (case-insensitive), false otherwise
 */
export function isSameEmail(email1: string | undefined | null, email2: string | undefined | null): boolean {
  if (!email1 || !email2) return false;
  return email1.toLowerCase() === email2.toLowerCase();
} 