import React from 'react';

function ApproachQueue({ planes, selected, onSelect }) {
  const list = Object.values(planes)
    .filter((p) => ['holding', 'landing'].includes(p.status))
    .sort((a, b) => a.fuelPatience - b.fuelPatience);

  return (
    <div className="panel">
      <h3>Approach Queue</h3>
      {list.length === 0 && <div className="empty-hint">No inbound traffic right now.</div>}
      <ul className="approach-list">
        {list.map((p) => {
          const pct = Math.max(0, Math.round((p.fuelPatience / 45) * 100));
          return (
            <li
              key={p.id}
              className={`approach-item ${p.emergency ? 'emergency' : ''} ${
                selected?.kind === 'plane' && selected.id === p.id ? 'selected' : ''
              } ${p.status === 'landing' ? 'landing' : ''}`}
              onClick={() => p.status === 'holding' && onSelect(p.id)}
            >
              <div className="approach-top">
                <span>✈️ {p.callsign}</span>
                <span className="plane-size">{p.label}</span>
              </div>
              <div className="fuel-track">
                <div className="fuel-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="approach-hint">
                {p.status === 'landing' ? 'Landing…' : p.emergency ? 'Low fuel — land now!' : 'Click to select, then click runway'}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CrewPanel({ crews, selected, onSelectCrew, onUnassign, onBuyCrew, crewCost, canAfford, atMax }) {
  return (
    <div className="panel">
      <h3>Ground Crew</h3>
      <div className="crew-grid">
        {crews.map((c) => (
          <div
            key={c.id}
            className={`crew-chip ${c.type} ${c.gateId ? 'busy' : 'idle'} ${
              selected?.kind === 'crew' && selected.id === c.id ? 'selected' : ''
            }`}
            onClick={() => (c.gateId ? onUnassign(c.id) : onSelectCrew(c.id))}
            title={c.gateId ? `Working ${c.gateId} — click to recall` : 'Idle — click, then click a gate to dispatch'}
          >
            {c.type === 'fuel' ? '⛽' : '🧳'} {c.gateId ? `@ ${c.gateId}` : 'idle'}
          </div>
        ))}
      </div>
      <button className="shop-btn" disabled={!canAfford || atMax} onClick={onBuyCrew}>
        Hire crew — ${crewCost}
      </button>
    </div>
  );
}

function EventLog({ log }) {
  return (
    <div className="panel log-panel">
      <h3>Event Log</h3>
      <ul className="log-list">
        {log.map((entry, i) => (
          <li key={i} className={`log-entry log-${entry.kind}`}>
            <span className="log-tick">t{entry.tick}</span> {entry.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Sidebar({ state, onSelectPlane, onSelectCrew, onUnassignCrew, onBuyGate, onBuyCrew }) {
  const { planes, selected, crews, gates, money, gateCost, crewCost } = state;
  return (
    <div className="sidebar">
      <ApproachQueue planes={planes} selected={selected} onSelect={onSelectPlane} />
      <CrewPanel
        crews={crews}
        selected={selected}
        onSelectCrew={onSelectCrew}
        onUnassign={onUnassignCrew}
        onBuyCrew={onBuyCrew}
        crewCost={crewCost}
        canAfford={money >= crewCost}
        atMax={crews.length >= 8}
      />
      <div className="panel">
        <h3>Terminal</h3>
        <div>{gates.length} gates open</div>
        <button className="shop-btn" disabled={money < gateCost || gates.length >= 8} onClick={onBuyGate}>
          Build gate — ${gateCost}
        </button>
      </div>
      <EventLog log={state.log} />
    </div>
  );
}
