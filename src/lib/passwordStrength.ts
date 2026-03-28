interface PasswordCheck {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

export function checkPasswordStrength(password: string): PasswordCheck {
  return {
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const checks = checkPasswordStrength(password);
  return checks.hasMinLength && checks.hasUppercase && checks.hasLowercase && checks.hasNumber;
}

export function getPasswordStrengthLevel(password: string): "weak" | "medium" | "strong" {
  if (!password) return "weak";
  const checks = checkPasswordStrength(password);
  const passed = [checks.hasMinLength, checks.hasUppercase, checks.hasLowercase, checks.hasNumber].filter(Boolean).length;
  if (passed <= 2) return "weak";
  if (passed === 3) return "medium";
  return "strong";
}
