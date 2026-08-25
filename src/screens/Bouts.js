import React from 'react';
import { useGameState } from '../context/GameContext';
import { findFighterAnywhere } from '../game/gameReducer';
import { Panel, WeightPill, FighterNameButton } from '../components/UI';

const METHOD_LABELS = {
  KO: 'KO', TKO: 'TKO', SUB: 'Submission',
  UD: 'Unanimous Decision', SD: 'Split Decision', MD: 'Majority Decision',
  DRAW: 'Draw',
};

// Fight history only ever grows over a career — the full total still
// counts toward Career Stats either way, this just keeps the list itself
// from turning into an endless scroll of ancient prelims.
const VISIBLE_BOUTS = 50;

export default function Bouts() {
  const state = useGameState();
  const visible = state.fightHistory.slice(0, VISIBLE_BOUTS);

  return (
    <div className="fe-bouts">
      <Panel title={`FIGHT HISTORY (${state.fightHistory.length})`}>
        {state.fightHistory.length === 0 && <div className="fe-empty">No fights yet — book your first card from Make Fights.</div>}
        <div className="fe-bouts-list">
          {visible.map(fh => {
            const draw = fh.result.method === 'DRAW';
            const won = !draw && fh.result.winnerId === fh.fighterId;
            const fighter = findFighterAnywhere(state, fh.fighterId);
            const opponent = findFighterAnywhere(state, fh.opponentId);
            return (
              <div key={fh.id} className="fe-bout-row">
                <span className="fe-news-week">W{fh.week}</span>
                {fh.fighterWeightClass && <WeightPill id={fh.fighterWeightClass} />}
                {fh.isTitle && <span title="Title fight">🏆</span>}
                <span className="fe-fight-title">
                  {fighter ? <FighterNameButton fighter={fighter}>{fh.fighterName}</FighterNameButton> : (fh.fighterName || 'Your fighter')} v{' '}
                  {opponent ? <FighterNameButton fighter={opponent}>{fh.opponentName}</FighterNameButton> : (fh.opponentName || 'Unknown')}
                  {fh.eventName && <span className="fe-hint"> · {fh.eventName}</span>}
                </span>
                <span className={`fe-bout-result fe-bout-${draw ? 'draw' : won ? 'win' : 'loss'}`}>
                  {draw ? 'DRAW' : won ? 'WIN' : 'LOSS'} · {METHOD_LABELS[fh.result.method] || fh.result.method}
                </span>
              </div>
            );
          })}
        </div>
        {state.fightHistory.length > VISIBLE_BOUTS && (
          <p className="fe-hint fe-list-truncated-hint">Showing the {VISIBLE_BOUTS} most recent fights — {state.fightHistory.length - VISIBLE_BOUTS} earlier ones still count toward your career totals.</p>
        )}
      </Panel>
    </div>
  );
}
