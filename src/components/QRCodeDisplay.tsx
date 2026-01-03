import { QRCodeSVG } from "qrcode.react";
import { generateOTPAuthURI } from "../lib/totp";

interface QRCodeDisplayProps {
  secret: string;
  username: string;
}

export function QRCodeDisplay({ secret, username }: QRCodeDisplayProps) {
  const otpauthURI = generateOTPAuthURI(secret, username);

  return (
    <div className="qr-code-display">
      <h3>Scan with Google Authenticator</h3>
      <div className="qr-container">
        <QRCodeSVG value={otpauthURI} size={200} level="M" />
      </div>
      <div className="uri-display">
        <p className="label">OTPAuth URI:</p>
        <code className="uri">{otpauthURI}</code>
      </div>
    </div>
  );
}
