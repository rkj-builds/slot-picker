/**
 * Indian mobile numbers: +91 and ten digits starting 6–9. People type them
 * every way ("098765 43210", "+91-98765-43210", "9876543210"); we keep one
 * canonical form ("+919876543210") and print it grouped ("+91 98765 43210").
 */

export type PhoneProblem = "empty" | "too-short" | "too-long" | "not-mobile" | "not-digits";

export function normalizeIndianPhone(input: string): string | null {
  return checkIndianPhone(input).phone;
}

export function checkIndianPhone(input: string): { phone: string | null; problem: PhoneProblem | null } {
  const trimmed = input.trim();
  if (trimmed === "") return { phone: null, problem: "empty" };
  if (/[^\d\s()+-]/.test(trimmed)) return { phone: null, problem: "not-digits" };
  let digits = trimmed.replaceAll(/\D/g, "");
  if (trimmed.startsWith("+")) {
    if (!digits.startsWith("91")) return { phone: null, problem: "not-mobile" };
    digits = digits.slice(2);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length < 10) return { phone: null, problem: "too-short" };
  if (digits.length > 10) return { phone: null, problem: "too-long" };
  if (!/^[6-9]/.test(digits)) return { phone: null, problem: "not-mobile" };
  return { phone: `+91${digits}`, problem: null };
}

export function describePhoneProblem(problem: PhoneProblem): string {
  switch (problem) {
    case "empty":
      return "Enter your mobile number.";
    case "too-short":
      return "That is too short. A mobile number has 10 digits.";
    case "too-long":
      return "That is too long. A mobile number has 10 digits after +91.";
    case "not-mobile":
      return "Indian mobile numbers start with 6, 7, 8 or 9.";
    case "not-digits":
      return "Use digits only.";
  }
}

/** "+919876543210" → "+91 98765 43210". */
export function formatPhone(phone: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return match ? `+91 ${match[1]} ${match[2]}` : phone;
}
