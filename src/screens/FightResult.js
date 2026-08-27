import React from 'react';
import { useGameState, useGameActions } from '../context/GameContext';
import { Panel, Button, Followers } from '../components/UI';

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
        {last.eventName && <div className="fe-result-event-name">{last.eventName}</div>}
        {last.isTitle && <div className="fe-title-fight-badge">🏆 TITLE FIGHT</div>}
        {last.isInterimTitle && <div className="fe-title-fight-badge fe-interim-title-badge">🥈 INTERIM TITLE</div>}
        {last.isLegacyFight && <div className="fe-title-fight-badge fe-legacy-badge">🎖️ LEGACY FIGHT</div>}
        {last.isRematch && <div className="fe-title-fight-badge fe-rematch-badge">🔁 REMATCH</div>}
        <div className="fe-result-headline">
          {draw ? (
            <span>{fighter?.name} vs {opponent?.name} — Draw</span>
          ) : (
            <span><strong>{winner?.name}</strong> {METHOD_TEXT[result.method]} {result.method === 'KO' || result.method === 'TKO' || result.method === 'SUB' ? `in round ${result.roundEnded}` : ''}</span>
          )}
        </div>
        {loser && <div className="fe-result-sub">{loser.name} falls to {loser.record.wins}-{loser.record.losses}-{loser.record.draws}</div>}
        {last.controversial && (
          <p className="fe-hint fe-hint-warn">Judges spark controversy with this scorecard — not everyone at ringside agrees.</p>
        )}
        {typeof last.earned === 'number' && (
          <div className="fe-result-payout">
            <span>💰 Payout: ${last.earned.toLocaleString()}</span>
            {last.bonusAmount > 0 && (
              <span className="fe-gold">+ ${last.bonusAmount.toLocaleString()} {last.bonus === 'potn' ? 'Performance of the Night' : 'Fight of the Night'}</span>
            )}
            {last.sponsorEarned > 0 && <span>+ ${last.sponsorEarned.toLocaleString()} sponsor money</span>}
          </div>
        )}
        <div className="fe-result-stats-grid">
          <StatBlock label={fighter?.name} stats={result.totalStats.A} followers={fighter?.followers} delta={last.fighterFollowerDelta} />
          <StatBlock label={opponent?.name} stats={result.totalStats.B} followers={opponent?.followers} delta={last.opponentFollowerDelta} />
        </div>
        <Button variant="advance" onClick={() => goTo('hub')} className="fe-confirm-btn">Back to Hub</Button>
      </Panel>
    </div>
  );
}

function StatBlock({ label, stats, followers, delta }) {
  return (
    <div className="fe-stat-block">
      <h4>{label}</h4>
      <div>Sig. Strikes: {stats.strikes.landed}/{stats.strikes.thrown}</div>
      <div>Ground Strikes: {stats.groundStrikes.landed}/{stats.groundStrikes.thrown}</div>
      <div>Takedowns: {stats.takedowns.landed}/{stats.takedowns.thrown}</div>
      <div>Sub. Attempts: {stats.submissions.thrown}</div>
      {typeof delta === 'number' && (
        <div className="fe-follower-delta">
          <Followers count={followers} />
          <span className={delta >= 0 ? 'fe-delta-up' : 'fe-delta-down'}>{delta >= 0 ? '+' : ''}{delta.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
