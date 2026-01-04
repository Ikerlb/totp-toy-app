import { useState, useEffect } from "react";
import { QRCodeDisplay } from "./components/QRCodeDisplay";
import { TOTPVisualizer } from "./components/TOTPVisualizer";
import { generateSecret } from "./lib/totp";
import "./App.css";

const STORAGE_KEY = "toy-otp-config";

interface Config {
  username: string;
  secret: string;
}

function loadConfig(): Config {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {
    username: "demo",
    secret: generateSecret(),
  };
}

function saveConfig(config: Config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function App() {
  const [config, setConfig] = useState<Config>(loadConfig);

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({ ...prev, username: e.target.value }));
  };

  const handleSecretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({ ...prev, secret: e.target.value.toUpperCase() }));
  };

  const handleGenerateNewKey = () => {
    setConfig((prev) => ({ ...prev, secret: generateSecret() }));
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Toy OTP</h1>
        <p className="subtitle">Learn How Time-Based One-Time Passwords Work</p>
      </header>

      <main className="main">
        <div className="config-bar">
          <div className="config-field">
            <label htmlFor="username">Label</label>
            <input
              id="username"
              type="text"
              value={config.username}
              onChange={handleUsernameChange}
              placeholder="demo"
            />
          </div>
          <div className="config-field config-field-secret">
            <label htmlFor="secret">Secret</label>
            <input
              id="secret"
              type="text"
              value={config.secret}
              onChange={handleSecretChange}
              placeholder="Base32 secret"
            />
            <button onClick={handleGenerateNewKey} className="generate-button">
              New Key
            </button>
          </div>
        </div>

        <div className="content-grid">
          <section className="section qr-section">
            <QRCodeDisplay secret={config.secret} username={config.username} />
          </section>

          <section className="section visualizer-section">
            <TOTPVisualizer secret={config.secret} />
          </section>
        </div>
      </main>

      <footer className="footer">
        <p>
          Educational project demonstrating RFC 6238 (TOTP) and RFC 4226 (HOTP)
        </p>
      </footer>
    </div>
  );
}

export default App;
