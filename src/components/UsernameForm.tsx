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
        <button type="submit" disabled={!username.trim()}>
          Continue
        </button>
      </div>
    </form>
  );
}
