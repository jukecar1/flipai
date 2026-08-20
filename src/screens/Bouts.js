import React from 'react';
import { useGameState } from '../context/GameContext';
import { Panel, WeightPill } from '../components/UI';

const METHOD_LABELS = {
  KO: 'KO', TKO: 'TKO', SUB: 'Submission',
  UD: 'Unanimous Decision', SD: 'Split Decision', MD: 'Majority Decision',
  DRAW: 'Draw',
};

export default function Bouts() {
  const state = useGameState();

  return (
    <div className="fe-bouts">
      <Panel title={`FIGHT HISTORY (${state.fightHistory.length})`}>
        {state.fightHistory.length === 0 && <div className="fe-empty">No fights yet — book your first card from Make Fights.</div>}
        <div className="fe-bouts-list">
          {state.fightHistory.map(fh => {
            const draw = fh.result.method === 'DRAW';
            const won = !draw && fh.result.winnerId === fh.fighterId;
            return (
              <div key={fh.id} className="fe-bout-row">
                <span className="fe-news-week">W{fh.week}</span>
                {fh.fighterWeightClass && <WeightPill id={fh.fighterWeightClass} />}
                {fh.isTitle && <span title="Title fight">🏆</span>}
                <span className="fe-fight-title">{fh.fighterName || 'Your fighter'} v {fh.opponentName || 'Unknown'}</span>
                <span className={`fe-bout-result fe-bout-${draw ? 'draw' : won ? 'win' : 'loss'}`}>
                  {draw ? 'DRAW' : won ? 'WIN' : 'LOSS'} · {METHOD_LABELS[fh.result.method] || fh.result.method}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
