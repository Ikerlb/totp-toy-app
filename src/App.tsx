import { useState } from "react";
import { UsernameForm } from "./components/UsernameForm";
import { QRCodeDisplay } from "./components/QRCodeDisplay";
import { TOTPVisualizer } from "./components/TOTPVisualizer";
import { generateSecret } from "./lib/totp";
import "./App.css";

interface UserState {
  username: string;
  secret: string;
}

function App() {
  const [user, setUser] = useState<UserState | null>(null);

  const handleUsernameSubmit = (username: string) => {
    setUser({
      username,
      secret: generateSecret(),
    });
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Toy OTP</h1>
        <p className="subtitle">Learn How Time-Based One-Time Passwords Work</p>
      </header>

      <main className="main">
        {!user ? (
          <UsernameForm onSubmit={handleUsernameSubmit} />
        ) : (
          <div className="authenticated">
            <div className="user-bar">
              <span>
                Logged in as: <strong>{user.username}</strong>
              </span>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>

            <div className="content-grid">
              <section className="section qr-section">
                <QRCodeDisplay secret={user.secret} username={user.username} />
              </section>

              <section className="section visualizer-section">
                <TOTPVisualizer secret={user.secret} />
              </section>
            </div>
          </div>
        )}
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
