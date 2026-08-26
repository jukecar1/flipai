import React from 'react';
import { useGameState } from '../context/GameContext';
import { findFighterAnywhere } from '../game/gameReducer';
import { Panel, Avatar, formatFollowers, FighterNameButton } from '../components/UI';

const CHIRP_ICONS = {
  result: '🥊',
  beef: '🔥',
  departure: '🚪',
  signing: '✍️',
  ppv: '🎬',
  callout: '📣',
  rival: '🗯️',
};

const CHIRP_LABELS = {
  result: 'Fight reaction',
  beef: 'Beef',
  departure: 'Departure',
  signing: 'Signing',
  ppv: 'PPV hype',
  callout: 'Callout',
  rival: 'Rival chatter',
};

export default function Chirp() {
  const state = useGameState();
  const posts = state.socialFeed || [];

  return (
    <div className="fe-chirp-screen">
      <Panel title="🐦 CHIRP" className="fe-chirp-panel">
        <p className="fe-hint">
          What your fighters are saying — auto-generated reactions to wins, losses, contracts, and how they really feel about the company.
        </p>
        {posts.length === 0 && (
          <div className="fe-empty">Nothing yet — book some fights and see what the roster has to say.</div>
        )}
        <div className="fe-chirp-feed">
          {posts.map(p => {
            const fighter = findFighterAnywhere(state, p.fighterId);
            return (
              <div key={p.id} className={`fe-chirp-post fe-chirp-${p.category}`}>
                <Avatar fighter={{ name: p.fighterName, weightClass: p.weightClass }} size={38} />
                <div className="fe-chirp-body">
                  <div className="fe-chirp-head">
                    {fighter ? <FighterNameButton fighter={fighter} className="fe-chirp-name" /> : <span className="fe-chirp-name">{p.fighterName}</span>}
                    <span className="fe-chirp-handle">{p.handle}</span>
                    <span className="fe-chirp-week">· Wk {p.week}</span>
                    <span className="fe-chirp-category" title={CHIRP_LABELS[p.category] || 'Post'}>{CHIRP_ICONS[p.category] || '💬'}</span>
                  </div>
                  <p className="fe-chirp-text">{p.text}</p>
                  <div className="fe-chirp-foot">
                    <span className="fe-chirp-likes">❤️ {formatFollowers(p.likes)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
