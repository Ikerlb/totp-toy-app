interface CountdownProps {
  seconds: number;
}

export function Countdown({ seconds }: CountdownProps) {
  const percentage = (seconds / 30) * 100;
  const isLow = seconds <= 5;

  return (
    <div className={`countdown ${isLow ? "low" : ""}`}>
      <div className="countdown-bar">
        <div
          className="countdown-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="countdown-text">{seconds}s</span>
    </div>
  );
}
