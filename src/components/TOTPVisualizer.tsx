import { useEffect, useState } from "react";
import { generateTOTPSteps } from "../lib/totp";
import type { TOTPSteps } from "../lib/totp";
import { Countdown } from "./Countdown";

interface TOTPVisualizerProps {
  secret: string;
}

export function TOTPVisualizer({ secret }: TOTPVisualizerProps) {
  const [steps, setSteps] = useState<TOTPSteps | null>(null);
  const [prevOTP, setPrevOTP] = useState<string>("");
  const [highlight, setHighlight] = useState(false);
  const [showOTP, setShowOTP] = useState(false);

  useEffect(() => {
    // Initial load
    generateTOTPSteps(secret).then(setSteps);

    const interval = setInterval(async () => {
      const newSteps = await generateTOTPSteps(secret);
      setSteps(newSteps);

      // Highlight when OTP changes
      if (newSteps.otp !== prevOTP) {
        setPrevOTP(newSteps.otp);
        setHighlight(true);
        setTimeout(() => setHighlight(false), 500);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [secret, prevOTP]);

  if (!steps) {
    return <div className="totp-visualizer">Loading...</div>;
  }

  return (
    <div className="totp-visualizer">
      <h3>How TOTP Works - Step by Step</h3>

      <div className="step">
        <div className="step-header">
          <span className="step-number">1</span>
          <span className="step-title">Shared Secret</span>
        </div>
        <div className="step-content">
          <div>Base32: <code className="secret">{steps.secret}</code></div>
          <div className="hex-display">
            Hex: <code>{steps.secretHex}</code>
          </div>
          <p className="explanation">
            This is the secret key shared between you and the authenticator app.
            It's encoded in Base32 for easy QR code scanning.
          </p>
        </div>
      </div>

      <div className="step">
        <div className="step-header">
          <span className="step-number">2</span>
          <span className="step-title">Current Unix Timestamp</span>
        </div>
        <div className="step-content">
          <code className="timestamp">{steps.unixTimestamp}</code>
          <Countdown seconds={steps.secondsRemaining} />
          <p className="explanation">
            Seconds since January 1, 1970 (Unix epoch).
            The code refreshes every 30 seconds.
          </p>
        </div>
      </div>

      <div className="step">
        <div className="step-header">
          <span className="step-number">3</span>
          <span className="step-title">Time Counter (T)</span>
        </div>
        <div className="step-content">
          <div className="formula">
            T = floor({steps.unixTimestamp} / 30) = <code>{steps.timeCounter}</code>
          </div>
          <div className="hex-display">
            Hex: <code>{steps.timeCounterHex}</code>
          </div>
          <p className="explanation">
            Divide timestamp by 30 to get the time counter.
            This ensures the same code for 30 seconds.
          </p>
        </div>
      </div>

      <div className="step">
        <div className="step-header">
          <span className="step-number">4</span>
          <span className="step-title">HMAC-SHA1 Hash</span>
        </div>
        <div className="step-content">
          <div className="formula">
            HMAC-SHA1(<code className="secret">{steps.secretHex}</code>, <code>{steps.timeCounterHex}</code>) =
          </div>
          <div className="hmac-display">
            <code>{steps.hmacOutput}</code>
          </div>
          <p className="explanation">
            Compute HMAC-SHA1 using the secret key and time counter.
            This produces a 20-byte (160-bit) hash.
          </p>
        </div>
      </div>

      <div className="step">
        <div className="step-header">
          <span className="step-number">5</span>
          <span className="step-title">Dynamic Truncation</span>
        </div>
        <div className="step-content">
          <div className="truncation-display">
            <div>Offset: <code>{steps.offset}</code> (last nibble of hash)</div>
            <div>Extract 4 bytes starting at offset: <code>{steps.truncatedHash}</code></div>
            <div>31-bit integer: <code>{steps.truncatedValue}</code></div>
          </div>
          <p className="explanation">
            The offset is the last nibble (4 bits) of the hash, giving a value 0-15.
            Extract 4 bytes starting at that offset (hash[offset:offset+4]),
            interpret as a big-endian 31-bit integer.
          </p>
        </div>
      </div>

      <div className="step final-step">
        <div className="step-header">
          <span className="step-number">6</span>
          <span className="step-title">Final OTP Code</span>
        </div>
        <div className="step-content">
          <div className="formula">
            {steps.truncatedValue} mod 10<sup>6</sup> =
          </div>
          <div className={`otp-display ${highlight ? "highlight" : ""}`}>
            {showOTP ? steps.otp : "••••••"}
            <button
              className="toggle-otp-button"
              onClick={() => setShowOTP(!showOTP)}
              type="button"
              aria-label={showOTP ? "Hide OTP" : "Show OTP"}
            >
              {showOTP ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          <p className="explanation">
            Take modulo 10^6 to get a 6-digit code.
            Compare with your authenticator app!
          </p>
        </div>
      </div>
    </div>
  );
}
