import { authenticator } from "@otplib/preset-browser";

// Fix for browser preset's broken createRandomBytes and keyEncoder
function createRandomBytes(size: number): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  // Return hex string
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Base32 encode (RFC 4648)
function base32Encode(bytes: number[]): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, "0");
    result += alphabet[parseInt(chunk, 2)];
  }
  return result;
}

// keyEncoder: convert hex string to base32
function keyEncoder(secret: string, _encoding: string): string {
  // secret is a hex string, convert to bytes then base32
  const bytes: number[] = [];
  for (let i = 0; i < secret.length; i += 2) {
    bytes.push(parseInt(secret.substring(i, i + 2), 16));
  }
  return base32Encode(bytes);
}

// Base32 decode (RFC 4648)
function base32DecodeToBytes(base32: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32.toUpperCase()) {
    const val = alphabet.indexOf(char);
    if (val >= 0) {
      bits += val.toString(2).padStart(5, "0");
    }
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

// keyDecoder: convert base32 to hex string
function keyDecoder(encodedSecret: string, _encoding: string): string {
  const bytes = base32DecodeToBytes(encodedSecret);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Configure otplib with fixed functions
(authenticator as any).options = {
  digits: 6,
  step: 30,
  window: 1,
  createRandomBytes,
  keyEncoder,
  keyDecoder,
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

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert base32 secret to Uint8Array using our keyDecoder (same as otplib)
function base32ToBytes(base32String: string): Uint8Array {
  const hex = keyDecoder(base32String, "hex");
  return hexToBytes(hex);
}

// Safely extract ArrayBuffer from Uint8Array (handles views correctly)
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

// Compute HMAC-SHA1 using Web Crypto API
async function computeHmacSha1(secret: Uint8Array, counter: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, toArrayBuffer(counter));
  return new Uint8Array(signature);
}

// Convert bytes to hex string for display
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");
}

export async function generateTOTPSteps(secret: string): Promise<TOTPSteps> {
  const now = Math.floor(Date.now() / 1000);
  const step = 30;
  const timeCounter = Math.floor(now / step);
  const secondsRemaining = step - (now % step);

  // Convert secret to hex for display
  const secretHex = base32ToHex(secret);

  // Time counter as 8-byte big-endian
  const timeCounterHex = timeCounter.toString(16).toUpperCase().padStart(16, "0");
  // Use BigInt for correct 64-bit handling (JS bitshift wraps at 32 bits)
  const counterBigInt = BigInt(timeCounter);
  const counterBytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    counterBytes[7 - i] = Number((counterBigInt >> BigInt(i * 8)) & 0xffn);
  }

  // Compute the actual HMAC-SHA1
  const secretBytes = base32ToBytes(secret);
  const hmacResult = await computeHmacSha1(secretBytes, counterBytes);
  const hmacHex = bytesToHex(hmacResult);

  // Dynamic truncation: offset is the last nibble (4 bits) of the hash
  const offset = hmacResult[19] & 0x0f;

  // Extract 4 bytes starting at offset and mask the high bit
  const truncatedValue =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  // Truncated hash representation showing the actual bytes
  const truncatedBytes = hmacHex.substring(offset * 2, (offset + 4) * 2);

  // Compute OTP: truncatedValue mod 10^6, padded to 6 digits
  const otp = (truncatedValue % 1000000).toString().padStart(6, "0");

  // Debug: verify against otplib
  const otplibOtp = authenticator.generate(secret);

  if (otp !== otplibOtp) {
    console.warn(`OTP mismatch! Ours: ${otp}, otplib: ${otplibOtp}`);
    console.warn(`Secret bytes (${secretBytes.length}): ${bytesToHex(secretBytes)}`);
    console.warn(`Counter bytes (${counterBytes.length}): ${bytesToHex(counterBytes)}`);
    console.warn(`HMAC: ${hmacHex}`);
    console.warn(`Offset: ${offset}, TruncatedValue: ${truncatedValue}`);
  }

  return {
    secret,
    secretHex,
    unixTimestamp: now,
    secondsRemaining,
    timeCounter,
    timeCounterHex,
    hmacInput: `Secret + Counter(${timeCounterHex})`,
    hmacOutput: hmacHex,
    offset,
    truncatedHash: truncatedBytes,
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
