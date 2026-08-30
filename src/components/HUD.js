import React from 'react';

export default function HUD({ state, onSetSpeed, onTogglePause, onRestart }) {
  const { money, reputation, day, tick, speed, paused, gameOver, stats } = state;
  return (
    <div className="hud">
      <div className="hud-title">🛫 Flip Airport</div>
      <div className="hud-stats">
        <span className="stat">💰 ${money}</span>
        <span className="stat">⭐ {reputation}%</span>
        <span className="stat">📅 Day {day}</span>
        <span className="stat muted">
          ✅ {stats.completed} · 🚨 {stats.diverted}
        </span>
        <span className="stat muted">t{tick}</span>
      </div>
      <div className="hud-controls">
        {!gameOver && (
          <>
            <button className={paused ? 'active' : ''} onClick={onTogglePause}>
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            {[1, 2, 3].map((s) => (
              <button key={s} className={speed === s ? 'active' : ''} onClick={() => onSetSpeed(s)}>
                {s}x
              </button>
            ))}
          </>
        )}
        <button className="restart-btn" onClick={onRestart}>
          ⟲ Restart
        </button>
      </div>
    </div>
  );
}
