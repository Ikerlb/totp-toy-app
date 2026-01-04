// Test script to compare our TOTP implementation with otplib
import { webcrypto } from 'crypto';
import { authenticator } from '@otplib/preset-default';

// Polyfill for Web Crypto in Node
const crypto = webcrypto;

// Our implementation (copied from totp.ts)
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");
}

// Base32 decode (RFC 4648)
function base32Decode(base32) {
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

async function computeHmacSha1(secret, counter) {
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, counter);
  return new Uint8Array(signature);
}

async function generateOTP(secret, timeCounter) {
  const secretBytes = base32Decode(secret);

  // Counter as 8-byte big-endian
  const counterBytes = new Uint8Array(8);
  const counterBigInt = BigInt(timeCounter);
  for (let i = 0; i < 8; i++) {
    counterBytes[7 - i] = Number((counterBigInt >> BigInt(i * 8)) & 0xffn);
  }

  const hmac = await computeHmacSha1(secretBytes, counterBytes);
  const offset = hmac[19] & 0x0f;
  const truncated =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return {
    otp: (truncated % 1000000).toString().padStart(6, "0"),
    secretBytes: bytesToHex(secretBytes),
    counterBytes: bytesToHex(counterBytes),
    hmac: bytesToHex(hmac),
    offset,
    truncated
  };
}

async function runTests() {
  console.log("=== TOTP Implementation Test ===\n");

  // Test 1: RFC 2202 HMAC-SHA1 test vector
  console.log("Test 1: RFC 2202 HMAC-SHA1 Test Vector");
  const testKey = new Uint8Array([0x4a, 0x65, 0x66, 0x65]); // "Jefe"
  const testData = new TextEncoder().encode("what do ya want for nothing?");
  const testHmac = await computeHmacSha1(testKey, testData);
  const expected = "EFFCDF6AE5EB2FA2D27416D5F184DF9C259A7C79";
  const got = bytesToHex(testHmac);
  console.log(`  Expected: ${expected}`);
  console.log(`  Got:      ${got}`);
  console.log(`  PASS: ${got === expected}\n`);

  // Test 2: Known base32 decoding
  console.log("Test 2: Base32 Decoding");
  const testBase32 = "GEZDGNBVGY3TQOJQ"; // Should decode to "1234567890"
  const decoded = base32Decode(testBase32);
  const decodedHex = bytesToHex(decoded);
  const expectedHex = "31323334353637383930"; // ASCII "1234567890"
  console.log(`  Input: ${testBase32}`);
  console.log(`  Expected: ${expectedHex}`);
  console.log(`  Got:      ${decodedHex}`);
  console.log(`  PASS: ${decodedHex === expectedHex}\n`);

  // Test 3: Compare with otplib for random secrets
  console.log("Test 3: Compare with otplib");
  const now = Math.floor(Date.now() / 1000);
  const timeCounter = Math.floor(now / 30);

  for (let i = 0; i < 5; i++) {
    const secret = authenticator.generateSecret();
    const otplibOtp = authenticator.generate(secret);
    const ourResult = await generateOTP(secret, timeCounter);

    const match = ourResult.otp === otplibOtp;
    console.log(`  Secret: ${secret}`);
    console.log(`  Counter: ${timeCounter}`);
    console.log(`  otplib OTP: ${otplibOtp}`);
    console.log(`  Our OTP:    ${ourResult.otp}`);
    console.log(`  Secret bytes: ${ourResult.secretBytes}`);
    console.log(`  HMAC: ${ourResult.hmac}`);
    console.log(`  PASS: ${match}`);
    if (!match) {
      console.log(`  *** MISMATCH! ***`);
    }
    console.log();
  }

  // Test 4: RFC 6238 test vector (time = 59, counter = 1)
  console.log("Test 4: RFC 6238 Test Vector (counter=1)");
  // Note: RFC uses 20-byte secret, we're using 10-byte
  const rfcSecret = "GEZDGNBVGY3TQOJQ"; // 10 bytes: "1234567890"
  const rfcResult = await generateOTP(rfcSecret, 1);
  console.log(`  Secret: ${rfcSecret}`);
  console.log(`  Counter: 1`);
  console.log(`  Our OTP: ${rfcResult.otp}`);
  console.log(`  HMAC: ${rfcResult.hmac}`);
  console.log();
}

runTests().catch(console.error);
