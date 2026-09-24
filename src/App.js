import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { SERIES, STATUSES, seedTopics, SCRIPT_FORMULA, PRODUCTION_RULES } from './data/topics';

const STORAGE_KEY = 'how-money-works-topics';

function loadTopics() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore corrupt storage, fall back to seed data
  }
  return seedTopics;
}

const STATUS_LABEL = {
  idea: 'Idea',
  scripted: 'Scripted',
  recorded: 'Recorded',
  published: 'Published',
};

function App() {
  const [topics, setTopics] = useState(loadTopics);
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [newTitle, setNewTitle] = useState('');
  const [newSeries, setNewSeries] = useState(SERIES[0].id);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
    } catch {
      // best-effort persistence only
    }
  }, [topics]);

  const counts = useMemo(() => {
    const c = { idea: 0, scripted: 0, recorded: 0, published: 0 };
    topics.forEach((t) => (c[t.status] = (c[t.status] || 0) + 1));
    return c;
  }, [topics]);

  const visibleTopics = useMemo(
    () => (seriesFilter === 'all' ? topics : topics.filter((t) => t.seriesId === seriesFilter)),
    [topics, seriesFilter]
  );

  const seriesName = (id) => SERIES.find((s) => s.id === id)?.name ?? id;

  const advanceStatus = (id) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const idx = STATUSES.indexOf(t.status);
        const next = STATUSES[Math.min(idx + 1, STATUSES.length - 1)];
        return { ...t, status: next };
      })
    );
  };

  const addTopic = (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setTopics((prev) => [
      ...prev,
      { id: Date.now(), seriesId: newSeries, title, status: 'idea', notes: '' },
    ]);
    setNewTitle('');
  };

  return (
    <div className="App">
      <header className="Header">
        <h1>How Money Works</h1>
        <p className="Tagline">
          Fast Shorts on business, real estate, construction, and money. Post daily, follow the winners.
        </p>
      </header>

      <section className="StatsBar">
        {STATUSES.map((s) => (
          <div className="StatCard" key={s}>
            <span className="StatCount">{counts[s] || 0}</span>
            <span className="StatLabel">{STATUS_LABEL[s]}</span>
          </div>
        ))}
      </section>

      <main className="Main">
        <div className="BoardColumn">
          <div className="FilterRow">
            <button
              className={seriesFilter === 'all' ? 'FilterButton active' : 'FilterButton'}
              onClick={() => setSeriesFilter('all')}
            >
              All series
            </button>
            {SERIES.map((s) => (
              <button
                key={s.id}
                className={seriesFilter === s.id ? 'FilterButton active' : 'FilterButton'}
                onClick={() => setSeriesFilter(s.id)}
                title={s.description}
              >
                {s.name}
              </button>
            ))}
          </div>

          <form className="AddForm" onSubmit={addTopic}>
            <select value={newSeries} onChange={(e) => setNewSeries(e.target.value)}>
              {SERIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="New topic idea..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <button type="submit">Add</button>
          </form>

          <div className="TopicGrid">
            {visibleTopics.map((t) => (
              <div className="TopicCard" key={t.id}>
                <span className={`Badge Badge-${t.status}`}>{STATUS_LABEL[t.status]}</span>
                <h3>{t.title}</h3>
                <p className="SeriesTag">{seriesName(t.seriesId)}</p>
                {t.notes && <p className="Notes">{t.notes}</p>}
                {t.status !== 'published' && (
                  <button className="AdvanceButton" onClick={() => advanceStatus(t.id)}>
                    Mark as {STATUS_LABEL[STATUSES[STATUSES.indexOf(t.status) + 1]]}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="Sidebar">
          <div className="SidebarCard">
            <h2>Shorts formula</h2>
            {SCRIPT_FORMULA.map((step) => (
              <div className="FormulaStep" key={step.label}>
                <div className="FormulaHeader">
                  <strong>{step.label}</strong>
                  <span>{step.time}</span>
                </div>
                <p>{step.guidance}</p>
              </div>
            ))}
          </div>

          <div className="SidebarCard">
            <h2>Don't make it feel like AI</h2>
            <ul className="RulesList">
              {PRODUCTION_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>

          <div className="SidebarCard">
            <h2>Cadence</h2>
            <p>Post 2-3 Shorts a day for the first 30 days (~60 videos). Let view data pick the winning topics, then double down.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
