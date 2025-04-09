/**
 * Email utility functions
 */

// The super admin email address - centralized to avoid hardcoding
export const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

/**
 * Normalize an email address by converting to lowercase
 * @param email Email address to normalize
 * @returns Normalized email address or empty string if input is undefined/null
 */
export function normalizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

/**
 * Compare two email addresses in a case-insensitive manner
 * @param email1 First email address to compare
 * @param email2 Second email address to compare
 * @returns True if emails match (case-insensitive), false otherwise
 */
export function isSameEmail(email1: string | undefined | null, email2: string | undefined | null): boolean {
  if (!email1 || !email2) return false;
  return normalizeEmail(email1) === normalizeEmail(email2);
}

/**
 * Check if an email address is valid
 * @param email Email address to validate
 * @returns True if email format is valid, false otherwise
 */
export function isValidEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a user is the super admin
 * @param email User's email address
 * @returns True if the email matches the super admin email, false otherwise
 */
export function isSuperAdmin(email: string | undefined | null): boolean {
  return isSameEmail(email, SUPER_ADMIN_EMAIL);
} 