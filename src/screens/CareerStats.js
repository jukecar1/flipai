import React from 'react';
import { useGameState } from '../context/GameContext';
import { prestigeTierLabel } from '../game/gameReducer';
import { Panel } from '../components/UI';

export default function CareerStats() {
  const state = useGameState();
  const { record, meta, fightHistory, hallOfFame, titles } = state;

  const finishes = fightHistory.filter(fh => fh.fighterId && fh.result.winnerId === fh.fighterId && ['KO', 'TKO', 'SUB'].includes(fh.result.method)).length;
  const wins = record.wins || 0;
  const finishRate = wins > 0 ? Math.round((finishes / wins) * 100) : 0;

  const biggestNight = fightHistory.reduce((best, fh) => {
    const hype = (fh.fighterFollowerDelta || 0) + (fh.opponentFollowerDelta || 0);
    return !best || hype > best.hype ? { ...fh, hype } : best;
  }, null);

  const currentTitleCount = Object.values(titles || {}).filter(Boolean).length;

  const stats = [
    { label: 'Record', value: `${record.wins}-${record.losses}-${record.draws}` },
    { label: 'Finish Rate', value: `${finishRate}%` },
    { label: 'Weeks in Business', value: state.week },
    { label: 'Reputation', value: prestigeTierLabel(state.prestige) },
    { label: 'Prestige Points', value: state.prestige.toLocaleString() },
    { label: 'Current Funds', value: `$${state.funds.toLocaleString()}` },
    { label: 'All-Time Earnings', value: `$${(meta.totalEarnings || 0).toLocaleString()}` },
    { label: 'Titles Won (All-Time)', value: meta.titlesWon || 0 },
    { label: 'Titles Held Now', value: currentTitleCount },
    { label: 'Hall of Fame', value: (hallOfFame || []).length },
    { label: 'Roster Size', value: state.roster.length },
    { label: 'Gym Level', value: meta.gymLevel },
  ];

  return (
    <div className="fe-career-stats">
      <Panel title={`${meta.promotionName.toUpperCase()} — CAREER STATS`}>
        <div className="fe-stats-grid">
          {stats.map(s => (
            <div key={s.label} className="fe-stat-tile">
              <span className="fe-stat-label">{s.label}</span>
              <span className="fe-stat-value">{s.value}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="BIGGEST NIGHT">
        {!biggestNight ? (
          <div className="fe-empty">No fights yet — your biggest night is still ahead of you.</div>
        ) : (
          <p className="fe-hint">
            Week {biggestNight.week}: <strong>{biggestNight.fighterName}</strong> vs <strong>{biggestNight.opponentName}</strong>
            {biggestNight.isTitle ? ' — a title fight' : ''} moved {biggestNight.hype.toLocaleString()} combined followers overnight,
            the biggest reaction your promotion has drawn.
          </p>
        )}
      </Panel>
    </div>
  );
}
