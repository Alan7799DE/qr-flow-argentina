import { checkPasswordStrength, getPasswordStrengthLevel } from "@/lib/passwordStrength";

const strengthColors = {
  weak: "bg-destructive",
  medium: "bg-warning",
  strong: "bg-success",
};

const strengthLabels = {
  weak: "Débil",
  medium: "Media",
  strong: "Fuerte",
};

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const checks = checkPasswordStrength(password);
  const level = getPasswordStrengthLevel(password);
  const barWidth = level === "weak" ? "33%" : level === "medium" ? "66%" : "100%";

  const missing: string[] = [];
  if (!checks.hasMinLength) missing.push("Mínimo 8 caracteres");
  if (!checks.hasUppercase) missing.push("Una letra mayúscula");
  if (!checks.hasLowercase) missing.push("Una letra minúscula");
  if (!checks.hasNumber) missing.push("Un número");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strengthColors[level]}`}
            style={{ width: barWidth }}
          />
        </div>
        <span className={`text-xs font-medium ${
          level === "weak" ? "text-destructive" : level === "medium" ? "text-warning" : "text-success"
        }`}>
          {strengthLabels[level]}
        </span>
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Falta: {missing.join(", ")}
        </p>
      )}
    </div>
  );
}
