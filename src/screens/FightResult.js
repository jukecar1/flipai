import React from 'react';
import { useGameState, useGameActions } from '../context/GameContext';
import { Panel, Button } from '../components/UI';

const METHOD_TEXT = {
  KO: 'wins by Knockout',
  TKO: 'wins by TKO',
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

  const boxer = state.roster.find(b => b.id === last.boxerId);
  const opponent = Object.values(state.worldPool).flat().find(b => b.id === last.opponentId);
  const { result } = last;
  const draw = result.method === 'DRAW';
  const winner = draw ? null : result.winnerId === last.boxerId ? boxer : opponent;
  const loser = draw ? null : result.winnerId === last.boxerId ? opponent : boxer;

  return (
    <div className="fe-fight-result">
      <Panel title="FIGHT RESULT" className="fe-result-panel">
        <div className="fe-result-headline">
          {draw ? (
            <span>{boxer?.name} vs {opponent?.name} — Draw</span>
          ) : (
            <span><strong>{winner?.name}</strong> {METHOD_TEXT[result.method]} {result.method === 'KO' || result.method === 'TKO' ? `in round ${result.roundEnded}` : ''}</span>
          )}
        </div>
        {loser && <div className="fe-result-sub">{loser.name} falls to {loser.record.wins}-{loser.record.losses}-{loser.record.draws}</div>}
        <div className="fe-result-stats-grid">
          <StatBlock label={boxer?.name} stats={result.totalStats.A} />
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
      <div>Total: {stats.landed}/{stats.thrown}</div>
      <div>Jabs: {stats.jab.landed}/{stats.jab.thrown}</div>
    </div>
  );
}
