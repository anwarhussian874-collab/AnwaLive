const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "support",
  "moderator",
  "root",
  "anwalive",
  "system"
]);

const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

export type UsernameValidationResult = {
  normalized: string;
  valid: boolean;
  reason?: string;
};

export const normalizeUsername = (username: string): string => username.trim().toLowerCase();

export const validateUsername = (username: string): UsernameValidationResult => {
  const normalized = normalizeUsername(username);

  if (!USERNAME_REGEX.test(normalized)) {
    return {
      normalized,
      valid: false,
      reason: "Username must be 3-20 chars and contain only a-z, 0-9, . or _"
    };
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      normalized,
      valid: false,
      reason: "Username is reserved"
    };
  }

  return { normalized, valid: true };
};
