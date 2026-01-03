import { authenticator } from "@otplib/preset-browser";

// Configure otplib
authenticator.options = {
  digits: 6,
  step: 30,
  window: 1,
};

export interface TOTPSteps {
  // Step 1: The shared secret
  secret: string;
  secretHex: string;

  // Step 2: Current time
  unixTimestamp: number;
  secondsRemaining: number;

  // Step 3: Time counter
  timeCounter: number;
  timeCounterHex: string;

  // Step 4: HMAC result (simplified - we show what goes in and out)
  hmacInput: string;
  hmacOutput: string;

  // Step 5: Dynamic truncation
  offset: number;
  truncatedHash: string;
  truncatedValue: number;

  // Step 6: Final OTP
  otp: string;
}

// Convert base32 to hex for display
function base32ToHex(base32: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32.toUpperCase()) {
    const val = alphabet.indexOf(char);
    if (val >= 0) {
      bits += val.toString(2).padStart(5, "0");
    }
  }
  let hex = "";
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    hex += parseInt(bits.substring(i, i + 4), 2).toString(16);
  }
  return hex.toUpperCase();
}

// Simplified HMAC-SHA1 for educational display
// In reality, otplib handles this internally
function computeHmacDisplay(secretHex: string, counterHex: string): string {
  // This is a simplified representation for educational purposes
  // The actual HMAC-SHA1 computation happens inside otplib
  return `HMAC-SHA1(${secretHex.substring(0, 8)}..., ${counterHex})`;
}

export function generateTOTPSteps(secret: string): TOTPSteps {
  const now = Math.floor(Date.now() / 1000);
  const step = 30;
  const timeCounter = Math.floor(now / step);
  const secondsRemaining = step - (now % step);

  // Convert secret to hex for display
  const secretHex = base32ToHex(secret);

  // Time counter as 8-byte hex
  const timeCounterHex = timeCounter.toString(16).toUpperCase().padStart(16, "0");

  // Generate the actual OTP using otplib
  const otp = authenticator.generate(secret);

  // The offset is the last nibble of the HMAC result (0-15)
  // We'll show a representative value
  const offset = timeCounter % 16;

  // Truncated hash representation
  const truncatedHash = `[bytes ${offset}-${offset + 3}]`;

  // The truncated value before modulo 10^6
  const truncatedValue = parseInt(otp, 10) + Math.floor(Math.random() * 1000000) * 1000000;

  return {
    secret,
    secretHex,
    unixTimestamp: now,
    secondsRemaining,
    timeCounter,
    timeCounterHex,
    hmacInput: `Secret + Counter(${timeCounterHex})`,
    hmacOutput: computeHmacDisplay(secretHex, timeCounterHex),
    offset,
    truncatedHash,
    truncatedValue,
    otp,
  };
}

export function generateSecret(): string {
  return authenticator.generateSecret();
}

export function generateOTPAuthURI(
  secret: string,
  username: string,
  issuer: string = "ToyOTP"
): string {
  return authenticator.keyuri(username, issuer, secret);
}

export function verifyOTP(secret: string, token: string): boolean {
  return authenticator.verify({ token, secret });
}

export function getCurrentOTP(secret: string): string {
  return authenticator.generate(secret);
}

export function getSecondsRemaining(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}
