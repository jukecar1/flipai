import React from 'react';

function TaskBar({ label, task }) {
  const pct = task.total ? Math.round(((task.total - task.remaining) / task.total) * 100) : 100;
  return (
    <div className="task-bar">
      <span className="task-label">{label}</span>
      <div className="task-track">
        <div className="task-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function GatePlane({ plane, selected, onSelect, crews }) {
  const fuelCrew = crews.some((c) => c.gateId === plane.gateId && c.type === 'fuel');
  const rampCrew = crews.some((c) => c.gateId === plane.gateId && c.type === 'ramp');
  return (
    <div
      className={`gate-plane status-${plane.status} ${selected ? 'selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(plane.id);
      }}
    >
      <div className="plane-row">
        <span className="plane-icon">✈️</span>
        <span className="plane-callsign">{plane.callsign}</span>
      </div>
      {plane.status === 'atGate' && (
        <>
          <TaskBar label={`⛽${fuelCrew ? '👷' : ''}`} task={plane.fuelTask} />
          <TaskBar label={`🧳${rampCrew ? '👷' : ''}`} task={plane.rampTask} />
        </>
      )}
      {plane.status === 'ready' && <div className="ready-badge">READY — select then click runway</div>}
    </div>
  );
}

export default function AirportMap({ state, onSelectPlane, onClickGate, onClickRunway }) {
  const { gates, planes, runway, selected } = state;
  const runwayPlane = runway.occupantId ? planes[runway.occupantId] : null;
  const waitingForGate = Object.values(planes).filter((p) => p.status === 'waitingForGate');

  return (
    <div className="airport-map">
      <div className="terminal">
        {gates.map((g) => {
          const plane = g.planeId ? planes[g.planeId] : null;
          return (
            <div key={g.id} className="gate" onClick={() => onClickGate(g.id)}>
              <div className="gate-label">{g.id}</div>
              <div className="gate-slot">
                {plane ? (
                  <GatePlane
                    plane={plane}
                    selected={selected?.kind === 'plane' && selected.id === plane.id}
                    onSelect={onSelectPlane}
                    crews={state.crews}
                  />
                ) : (
                  <div className="gate-empty">open</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {waitingForGate.length > 0 && (
        <div className="taxiway-holding">
          <span className="taxiway-label">Taxiway (waiting for gate):</span>
          {waitingForGate.map((p) => (
            <span key={p.id} className="taxi-chip">
              ✈️ {p.callsign}
            </span>
          ))}
        </div>
      )}

      <div
        className={`runway ${runway.occupantId ? 'busy' : 'free'}`}
        onClick={onClickRunway}
        title="Click to clear a selected plane to land or depart"
      >
        <div className="runway-stripes" />
        <div className="runway-label">
          {runwayPlane ? (
            <span>
              ✈️ {runwayPlane.callsign} — {runway.mode === 'landing' ? 'landing' : 'departing'}
            </span>
          ) : (
            <span>Runway clear — click here to land/depart the selected plane</span>
          )}
        </div>
      </div>
    </div>
  );
}
