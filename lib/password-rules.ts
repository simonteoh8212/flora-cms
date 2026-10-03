/**
 * Password validation rules & generator (Client and Server safe)
 */

export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters long.",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter (A-Z).",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one number (0-9).",
    };
  }

  return { isValid: true };
}

/**
 * Generates a clean, readable temporary password that satisfies all rules:
 * Minimum 8 chars, at least 1 uppercase, at least 1 number.
 * e.g., "Flora7249W"
 */
export function generateTemporaryPassword(): string {
  const prefixes = ["Flora", "Bloom", "Petal", "Rose", "Daisy"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${prefix}${randomNum}${randomChar}`;
}
