import { useState } from "react";

interface UsernameFormProps {
  onSubmit: (username: string) => void;
}

export function UsernameForm({ onSubmit }: UsernameFormProps) {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="username-form">
      <h2>Enter Username</h2>
      <p className="description">
        Enter a username to generate a new TOTP secret for this session.
      </p>
      <div className="input-group">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          autoFocus
        />
        <button type="submit" disabled={!username.trim()} aria-label="Continue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </form>
  );
}
