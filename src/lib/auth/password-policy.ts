export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_SPECIAL_PATTERN = /[^A-Za-z0-9\s]/;

export type PasswordRequirement = "length" | "uppercase" | "lowercase" | "number" | "special";

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  "length",
  "uppercase",
  "lowercase",
  "number",
  "special",
];

export function passwordChecks(value: string): Record<PasswordRequirement, boolean> {
  return {
    length: value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: PASSWORD_SPECIAL_PATTERN.test(value),
  };
}

export function missingPasswordRequirements(value: string): PasswordRequirement[] {
  const checks = passwordChecks(value);
  return PASSWORD_REQUIREMENTS.filter((requirement) => !checks[requirement]);
}

export function isStrongPassword(value: string): boolean {
  return missingPasswordRequirements(value).length === 0;
}
