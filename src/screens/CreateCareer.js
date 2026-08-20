import React, { useMemo, useState } from 'react';
import { useGameActions } from '../context/GameContext';
import { CITIES, cityLabel, suggestPromotionNames } from '../game/namePool';
import { makeRosterCandidates } from '../game/generateFighter';
import { GYM_LEVELS, STARTING_FUNDS, cityTierForPopulation, startingFundsForPopulation } from '../game/constants';
import { Button, Panel, WeightPill, Flag, Avatar } from '../components/UI';

const ROSTER_SIZE = GYM_LEVELS[0].rosterLimit;
const DEFAULT_CITY = CITIES.find(c => c.id === 'jacksonville-fl') || CITIES[0];

const ARCHETYPE_LABELS = {
  striker: 'Striker',
  wrestler: 'Wrestler',
  allrounder: 'All-rounder',
};

const TIER_ICON = { town: '🏘️', city: '🏙️', metro: '🌆', megacity: '🌃' };

export default function CreateCareer({ slot }) {
  const { startNewCareer, goTo } = useGameActions();
  const [step, setStep] = useState('details');
  const [managerName, setManagerName] = useState('');
  const [promotionName, setPromotionName] = useState('');
  const [hq, setHq] = useState(DEFAULT_CITY.id);
  const [citySearch, setCitySearch] = useState('');
  const [suggestions, setSuggestions] = useState(() => suggestPromotionNames('', DEFAULT_CITY.city));

  const [pool, setPool] = useState(() => makeRosterCandidates());
  const [selectedIds, setSelectedIds] = useState([]);
  const [championId, setChampionId] = useState('');

  const selectedCity = CITIES.find(c => c.id === hq) || DEFAULT_CITY;
  const hqTier = cityTierForPopulation(selectedCity.pop);
  const hqFunds = startingFundsForPopulation(selectedCity.pop);

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter(c => cityLabel(c).toLowerCase().includes(q));
  }, [citySearch]);

  const canContinue = managerName.trim().length > 0;
  const canStart = selectedIds.length === ROSTER_SIZE;

  const rerollSuggestions = (name = managerName, city = selectedCity.city) => setSuggestions(suggestPromotionNames(name, city));

  const rerollPool = () => {
    setPool(makeRosterCandidates());
    setSelectedIds([]);
  };

  const toggleFighter = id => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= ROSTER_SIZE) return prev;
      return [...prev, id];
    });
  };

  const handleStart = () => {
    if (!canStart) return;
    const selectedFighters = pool.filter(f => selectedIds.includes(f.id));
    startNewCareer(slot, {
      managerName: managerName.trim(),
      promotionName: (promotionName.trim() || `${managerName.trim()} MMA`),
      hq,
      selectedFighters,
      championFighterId: championId || undefined,
    });
  };

  if (step === 'champion') {
    const drafted = pool.filter(f => selectedIds.includes(f.id));
    return (
      <div className="fe-draft-screen">
        <Panel title="NAME YOUR CHAMPION (OPTIONAL)" className="fe-draft-panel">
          <p className="fe-hint">
            Start with one of your drafted fighters already holding their division's belt — or skip and let every
            title open vacant, up for grabs the normal way.
          </p>
          <div className="fe-draft-grid">
            {drafted.map(f => {
              const selected = championId === f.id;
              return (
                <div
                  key={f.id}
                  className={`fe-draft-card ${selected ? 'selected' : ''}`}
                  onClick={() => setChampionId(selected ? '' : f.id)}
                >
                  <div className="fe-draft-card-head">
                    <Avatar fighter={f} size={28} champion={selected} />
                    <WeightPill id={f.weightClass} />
                    <Flag nationality={f.nationality} />
                    <span className="fe-boxer-name-text" title={f.name}>{f.name}</span>
                    <span className="fe-draft-check">{selected ? '👑' : ''}</span>
                  </div>
                  <div className="fe-draft-card-meta">
                    <span>{ARCHETYPE_LABELS[f.archetype]}</span>
                    <span>Age {f.age}</span>
                    <span className="fe-ovr">OVR {f.overall}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="fe-row-actions">
            <Button variant="secondary" onClick={() => setStep('roster')}>Back</Button>
            <Button variant="advance" onClick={handleStart}>
              {championId ? 'Start Career with Champion' : 'Start Career (No Champion)'}
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  if (step === 'roster') {
    return (
      <div className="fe-draft-screen">
        <Panel
          title={`DRAFT YOUR ROSTER (${selectedIds.length}/${ROSTER_SIZE})`}
          className="fe-draft-panel"
          right={<button type="button" className="fe-link" onClick={rerollPool}>🎲 New Prospects</button>}
        >
          <p className="fe-hint">
            Pick {ROSTER_SIZE} fighters to build your starting roster — that's your active limit until you upgrade the gym.
            Mix of styles and weight classes is up to you.
          </p>
          <div className="fe-draft-grid">
            {pool.map(f => {
              const selected = selectedIds.includes(f.id);
              const disabled = !selected && selectedIds.length >= ROSTER_SIZE;
              return (
                <div
                  key={f.id}
                  className={`fe-draft-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                  onClick={() => !disabled && toggleFighter(f.id)}
                >
                  <div className="fe-draft-card-head">
                    <Avatar fighter={f} size={28} />
                    <WeightPill id={f.weightClass} />
                    <Flag nationality={f.nationality} />
                    <span className="fe-boxer-name-text" title={f.name}>{f.name}</span>
                    <span className="fe-draft-check">{selected ? '✓' : ''}</span>
                  </div>
                  <div className="fe-draft-card-meta">
                    <span>{ARCHETYPE_LABELS[f.archetype]}</span>
                    <span>Age {f.age}</span>
                    <span className="fe-ovr">OVR {f.overall}</span>
                  </div>
                  <div className="fe-draft-card-stats">
                    <span>STR {f.stats.striking}</span>
                    <span>WR {f.stats.wrestling}</span>
                    <span>SUB {f.stats.submission}</span>
                    <span>CHIN {f.stats.chin}</span>
                    <span>CAR {f.stats.cardio}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="fe-row-actions">
            <Button variant="secondary" onClick={() => setStep('details')}>Back</Button>
            <Button variant="advance" onClick={() => canStart && setStep('champion')} disabled={!canStart}>
              Continue {canStart ? '' : `(${selectedIds.length}/${ROSTER_SIZE})`}
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="fe-start-screen">
      <Panel title="New Promotion" className="fe-create-panel">
        <label className="fe-field">
          <span>Manager name</span>
          <input
            value={managerName}
            onChange={e => { setManagerName(e.target.value); rerollSuggestions(e.target.value, selectedCity.city); }}
            placeholder="e.g. Jordan Reyes"
            maxLength={30}
          />
        </label>
        <label className="fe-field">
          <span>Promotion name</span>
          <input value={promotionName} onChange={e => setPromotionName(e.target.value)} placeholder="e.g. Reyes Fighting Championship" maxLength={40} />
        </label>
        <div className="fe-suggestion-chips">
          {suggestions.map(s => (
            <button key={s} type="button" className="fe-chip" onClick={() => setPromotionName(s)}>{s}</button>
          ))}
          <button type="button" className="fe-chip fe-chip-reroll" onClick={() => rerollSuggestions()}>🎲 More</button>
        </div>

        <div className="fe-subheading">Headquarters City</div>
        <p className="fe-hint">Any city in the country — the bigger the market, the more you launch with.</p>
        <div className="fe-hq-selected">
          <span className="fe-hq-selected-icon">{TIER_ICON[hqTier.id]}</span>
          <div>
            <strong>{cityLabel(selectedCity)}</strong>
            <span className="fe-hint">{hqTier.label} · {selectedCity.pop.toLocaleString()} residents</span>
          </div>
          <span className="fe-hq-funds">${hqFunds.toLocaleString()}<span className="fe-hint"> starting funds</span></span>
        </div>
        <input
          className="fe-full-select fe-hq-search"
          value={citySearch}
          onChange={e => setCitySearch(e.target.value)}
          placeholder="Search any US city — or a state, e.g. TX"
        />
        <div className="fe-venue-list fe-hq-list">
          {filteredCities.length === 0 && <div className="fe-empty">No city matches "{citySearch}".</div>}
          {filteredCities.map(c => {
            const tier = cityTierForPopulation(c.pop);
            return (
              <div
                key={c.id}
                className={`fe-venue-row ${hq === c.id ? 'selected' : ''}`}
                onClick={() => { setHq(c.id); rerollSuggestions(managerName, c.city); }}
              >
                <div>
                  <strong>{cityLabel(c)}</strong>
                  <span>{TIER_ICON[tier.id]} {tier.label} · {c.pop.toLocaleString()} residents</span>
                </div>
                <span className="fe-venue-fee">${startingFundsForPopulation(c.pop).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        <p className="fe-hint">You'll start with ${hqFunds.toLocaleString()} (base ${STARTING_FUNDS.toLocaleString()}) and draft {ROSTER_SIZE} fighters to build your roster.</p>
        <div className="fe-row-actions">
          <Button variant="secondary" onClick={() => goTo('start')}>Back</Button>
          <Button variant="advance" onClick={() => canContinue && setStep('roster')} disabled={!canContinue}>Continue</Button>
        </div>
      </Panel>
    </div>
  );
}
