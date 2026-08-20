import React, { useState } from 'react';
import { useGameState } from '../context/GameContext';
import { Panel } from '../components/UI';

export default function News() {
  const state = useGameState();
  const [selectedId, setSelectedId] = useState(state.news[0]?.id);
  const selected = state.news.find(n => n.id === selectedId) || state.news[0];

  return (
    <div className="fe-news-screen">
      <Panel title="NEWS FEED" className="fe-news-feed-panel">
        <div className="fe-news-full-list">
          {state.news.map(n => (
            <div key={n.id} className={`fe-news-full-item ${selected?.id === n.id ? 'selected' : ''}`} onClick={() => setSelectedId(n.id)}>
              <span className="fe-news-week">W{n.week}</span>
              {n.title}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title={selected?.title || 'News'} className="fe-news-detail-panel">
        {selected && (
          <>
            <div className="fe-hint">Published week {selected.week}</div>
            <p>{selected.body}</p>
          </>
        )}
      </Panel>
    </div>
  );
}
