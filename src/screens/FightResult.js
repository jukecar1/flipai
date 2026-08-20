import React from 'react';
import { useGameState, useGameActions } from '../context/GameContext';
import { Panel, Button } from '../components/UI';

const METHOD_TEXT = {
  KO: 'wins by Knockout',
  TKO: 'wins by TKO',
  SUB: 'wins by Submission',
  UD: 'wins by Unanimous Decision',
  SD: 'wins by Split Decision',
  MD: 'wins by Majority Decision',
  DRAW: 'Draw',
};

export default function FightResult() {
  const state = useGameState();
  const { goTo } = useGameActions();
  const last = state.fightHistory[0];

  if (!last) {
    goTo('hub');
    return null;
  }

  const fighter = state.roster.find(f => f.id === last.fighterId);
  const opponent = Object.values(state.worldPool).flat().find(f => f.id === last.opponentId);
  const { result } = last;
  const draw = result.method === 'DRAW';
  const winner = draw ? null : result.winnerId === last.fighterId ? fighter : opponent;
  const loser = draw ? null : result.winnerId === last.fighterId ? opponent : fighter;

  return (
    <div className="fe-fight-result">
      <Panel title="FIGHT RESULT" className="fe-result-panel">
        <div className="fe-result-headline">
          {draw ? (
            <span>{fighter?.name} vs {opponent?.name} — Draw</span>
          ) : (
            <span><strong>{winner?.name}</strong> {METHOD_TEXT[result.method]} {result.method === 'KO' || result.method === 'TKO' || result.method === 'SUB' ? `in round ${result.roundEnded}` : ''}</span>
          )}
        </div>
        {loser && <div className="fe-result-sub">{loser.name} falls to {loser.record.wins}-{loser.record.losses}-{loser.record.draws}</div>}
        <div className="fe-result-stats-grid">
          <StatBlock label={fighter?.name} stats={result.totalStats.A} />
          <StatBlock label={opponent?.name} stats={result.totalStats.B} />
        </div>
        <Button variant="advance" onClick={() => goTo('hub')} className="fe-confirm-btn">Back to Hub</Button>
      </Panel>
    </div>
  );
}

function StatBlock({ label, stats }) {
  return (
    <div className="fe-stat-block">
      <h4>{label}</h4>
      <div>Sig. Strikes: {stats.strikes.landed}/{stats.strikes.thrown}</div>
      <div>Ground Strikes: {stats.groundStrikes.landed}/{stats.groundStrikes.thrown}</div>
      <div>Takedowns: {stats.takedowns.landed}/{stats.takedowns.thrown}</div>
      <div>Sub. Attempts: {stats.submissions.thrown}</div>
    </div>
  );
}
