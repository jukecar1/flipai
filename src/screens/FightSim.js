import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { WEIGHT_CLASS_MAP } from '../game/constants';
import { Panel, Button, Flag } from '../components/UI';

const SPEEDS = [1, 2, 4, 8];
const LANDED_TYPES = new Set(['landed', 'knockdown', 'takedown', 'submission']);

function buildTicks(sim) {
  const ticks = [];
  sim.roundsData.forEach(rd => {
    rd.beats.forEach(beat => ticks.push({ kind: 'beat', roundNum: rd.roundNum, beat }));
    ticks.push({ kind: 'roundEnd', roundNum: rd.roundNum, round: rd });
  });
  ticks.push({ kind: 'fightEnd' });
  return ticks;
}

const CATEGORY_LABEL = {
  strike: 'Sig. Strikes',
  groundStrike: 'Ground Strikes',
  takedown: 'Takedowns',
  submission: 'Sub. Attempts',
};

export default function FightSim() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const { activeFight, roster, worldPool } = state;

  const fighter = roster.find(f => f.id === activeFight?.fighterId);
  const opponent = useMemo(() => Object.values(worldPool).flat().find(f => f.id === activeFight?.opponentId), [worldPool, activeFight]);
  const fightMeta = state.scheduledFights.find(f => f.id === activeFight?.fightId);

  const ticks = useMemo(() => (activeFight ? buildTicks(activeFight.sim) : []), [activeFight]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [statsView, setStatsView] = useState('round'); // 'round' | 'fight'
  const [log, setLog] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!playing || index >= ticks.length) return undefined;
    const delay = 550 / speed;
    timerRef.current = setTimeout(() => {
      setIndex(i => Math.min(i + 1, ticks.length));
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [playing, speed, index, ticks.length]);

  useEffect(() => {
    const current = ticks[index - 1];
    if (current?.kind === 'beat' && current.beat.actor) {
      setLog(l => [{ ...current.beat, roundNum: current.roundNum, id: `${current.roundNum}-${index}` }, ...l].slice(0, 40));
    }
  }, [index, ticks]);

  if (!activeFight || !fighter || !opponent) {
    return (
      <div className="fe-fight-sim">
        <Panel title="No active fight">
          <p>Return to the hub to book a fight.</p>
        </Panel>
      </div>
    );
  }

  const currentTick = ticks[Math.max(0, index - 1)] || ticks[0];
  const currentRoundNum = currentTick?.roundNum || 1;
  const currentBeat = currentTick?.kind === 'beat' ? currentTick.beat : null;
  const isFinishMoment = currentBeat?.type === 'knockdown' || currentBeat?.type === 'submission';
  const completedRounds = ticks.slice(0, index).filter(t => t.kind === 'roundEnd').map(t => t.round);

  const posA = currentBeat?.posA || { x: 35, y: 50 };
  const posB = currentBeat?.posB || { x: 65, y: 50 };
  const damageA = currentBeat?.damageA ?? 0;
  const damageB = currentBeat?.damageB ?? 0;
  const secondsLeft = currentBeat?.t ?? 300;
  const position = currentBeat?.position || 'standing';
  const isFightOver = index >= ticks.length;

  const wc = WEIGHT_CLASS_MAP[fighter.weightClass];

  const skipToEnd = () => {
    setPlaying(false);
    setIndex(ticks.length);
    const allBeats = ticks.filter(t => t.kind === 'beat' && t.beat.actor).map((t, i) => ({ ...t.beat, roundNum: t.roundNum, id: `end-${i}` }));
    setLog(allBeats.slice(-40).reverse());
  };

  const finish = () => dispatch({ type: 'RESOLVE_FIGHT' });

  const beatsSoFar = ticks.slice(0, index).filter(t => t.kind === 'beat');
  const roundBeats = beatsSoFar.filter(t => t.roundNum === currentRoundNum);
  const relevantBeats = statsView === 'round' ? roundBeats : beatsSoFar;

  const tallyByCategory = key => {
    const totals = { strike: { landed: 0, thrown: 0 }, groundStrike: { landed: 0, thrown: 0 }, takedown: { landed: 0, thrown: 0 }, submission: { landed: 0, thrown: 0 } };
    relevantBeats.forEach(t => {
      const { beat } = t;
      if (beat.actor !== key || !beat.category || !totals[beat.category]) return;
      totals[beat.category].thrown++;
      if (LANDED_TYPES.has(beat.type)) totals[beat.category].landed++;
    });
    return totals;
  };
  const tallyA = tallyByCategory('A');
  const tallyB = tallyByCategory('B');
  const sumThrown = t => Object.values(t).reduce((s, c) => s + c.thrown, 0);
  const sumLanded = t => Object.values(t).reduce((s, c) => s + c.landed, 0);

  return (
    <div className="fe-fight-sim">
      <div className="fe-fs-header">
        <div>
          {fightMeta?.isTitle && <div className="fe-title-fight-badge">🏆 TITLE FIGHT</div>}
          <strong>{fightMeta ? `${activeFight.sim.rounds} rounds @ ${wc.name}` : wc.name}</strong>
          <div>{fighter.name} <Flag nationality={fighter.nationality} /> {fighter.record.wins}-{fighter.record.losses}-{fighter.record.draws}</div>
          <div>vs</div>
          <div>{opponent.name} <Flag nationality={opponent.nationality} /> {opponent.record.wins}-{opponent.record.losses}-{opponent.record.draws}</div>
        </div>
        <div className="fe-fs-header-right">
          {fightMeta && <div>{fightMeta.venue.name}, {fightMeta.venue.city}</div>}
          <div>Week {state.week}</div>
        </div>
      </div>

      <div className="fe-fs-body">
        <div className="fe-fs-controls">
          <Button variant="secondary" onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</Button>
          <div className="fe-speed-group">
            {SPEEDS.map(s => (
              <button key={s} className={`fe-speed-btn ${speed === s ? 'active' : ''}`} onClick={() => setSpeed(s)}>{s}x</button>
            ))}
          </div>
          <Button variant="secondary" onClick={skipToEnd} disabled={isFightOver}>Skip to Result</Button>
        </div>

        <div className="fe-fs-ring-col">
          <div className={`fe-cage ${isFinishMoment ? 'fe-cage-flash' : ''}`}>
            <div className="fe-cage-fence" />
            <div className="fe-cage-badge">FIGHT<br />EMPIRE</div>
            <div className={`fe-position-tag fe-position-${position}`}>{position === 'ground' ? 'On the ground' : 'Standing'}</div>
            <div
              className={`fe-fighter-dot fe-fighter-a ${currentBeat?.actor === 'A' ? 'fe-fighter-acting' : ''}`}
              style={{ left: `${posA.x}%`, top: `${posA.y}%`, filter: `saturate(${1 - damageA / 200})` }}
            >
              <span>{fighter.name.split(' ').slice(-1)[0]}</span>
            </div>
            <div
              className={`fe-fighter-dot fe-fighter-b ${currentBeat?.actor === 'B' ? 'fe-fighter-acting' : ''}`}
              style={{ left: `${posB.x}%`, top: `${posB.y}%`, filter: `saturate(${1 - damageB / 200})` }}
            >
              <span>{opponent.name.split(' ').slice(-1)[0]}</span>
            </div>
            {currentBeat && (
              <div className="fe-beat-caption">{currentBeat.text}</div>
            )}
          </div>
          <div className="fe-round-indicator">
            <div>FIGHT EMPIRE</div>
            <div>Round {currentRoundNum} of {activeFight.sim.rounds}</div>
            <div className="fe-clock">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</div>
            <div className="fe-scorecard-pips">
              {Array.from({ length: activeFight.sim.rounds }, (_, i) => {
                const rd = completedRounds.find(r => r.roundNum === i + 1);
                let cls = 'pending';
                if (rd) {
                  if (rd.scoreA === rd.scoreB) cls = 'draw';
                  else cls = rd.scoreA > rd.scoreB ? 'a' : 'b';
                }
                return <span key={i} className={`fe-pip fe-pip-${cls}`} />;
              })}
            </div>
          </div>
          <div className="fe-condition-row">
            <ConditionBar label={fighter.name} damage={damageA} side="left" />
            <ConditionBar label={opponent.name} damage={damageB} side="right" />
          </div>
        </div>

        <div className="fe-fs-side">
          <div className="fe-fs-tabs">
            <button className="fe-fs-tab active">Commentary</button>
          </div>
          <div className="fe-commentary-log">
            {log.map(item => (
              <div key={item.id} className="fe-commentary-item">
                R{item.roundNum} {Math.floor(item.t / 60)}:{String(item.t % 60).padStart(2, '0')} — {item.text}
              </div>
            ))}
          </div>

          <div className="fe-stats-toggle">
            <button className={statsView === 'round' ? 'active' : ''} onClick={() => setStatsView('round')}>This Round</button>
            <button className={statsView === 'fight' ? 'active' : ''} onClick={() => setStatsView('fight')}>Fight</button>
          </div>
          <div className="fe-live-stats">
            <div className="fe-live-stats-row fe-live-stats-head">
              <span>{fighter.name.split(' ').slice(-1)[0]}</span>
              <span>Output</span>
              <span>{opponent.name.split(' ').slice(-1)[0]}</span>
            </div>
            <div className="fe-live-stats-row">
              <span>{sumLanded(tallyA)}/{sumThrown(tallyA)}</span>
              <span>Total</span>
              <span>{sumLanded(tallyB)}/{sumThrown(tallyB)}</span>
            </div>
            {Object.keys(CATEGORY_LABEL).map(cat => (
              <div className="fe-live-stats-row" key={cat}>
                <span>{tallyA[cat].landed}/{tallyA[cat].thrown}</span>
                <span>{CATEGORY_LABEL[cat]}</span>
                <span>{tallyB[cat].landed}/{tallyB[cat].thrown}</span>
              </div>
            ))}
          </div>

          {isFightOver && (
            <Button variant="advance" onClick={finish} className="fe-confirm-btn">View Result</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConditionBar({ label, damage, side }) {
  return (
    <div className={`fe-condition fe-condition-${side}`}>
      <span>{label}</span>
      <div className="fe-condition-bar-track">
        <div className="fe-condition-bar-fill" style={{ width: `${Math.min(100, damage)}%` }} />
      </div>
    </div>
  );
}
