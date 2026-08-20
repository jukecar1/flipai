import React, { useState } from 'react';
import { useGameState } from '../context/GameContext';
import { Panel, NewsCategoryIcon } from '../components/UI';

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
              <NewsCategoryIcon category={n.category} />
              <span className="fe-news-week">W{n.week}</span>
              <span className="fe-boxer-name-text">{n.title}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title={selected?.title || 'News'} className="fe-news-detail-panel" right={selected && <NewsCategoryIcon category={selected.category} />}>
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
