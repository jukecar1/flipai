import { gameReducer, newCareerState, drawMultiplier } from './gameReducer';
import { FIGHT_TYPES, GYM_LEVELS, rosterLimitForGym } from './constants';

function baseState() {
  const state = newCareerState({ managerName: 'Test', promotionName: 'Test FC', hq: 'Testville' });
  const champFighter = {
    ...state.roster[0],
    id: 'champ1',
    name: 'Test Champion',
    weightClass: 'FLW',
    overall: 15,
    injuryWeeks: 0,
    fatigue: 0,
    title: null,
  };
  return { ...state, roster: [champFighter, ...state.roster.slice(1)] };
}

const opponent = {
  id: 'opp1',
  name: 'Test Opponent',
  weightClass: 'FLW',
  nationality: { name: 'USA', flag: '🇺🇸' },
  overall: 10,
  record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 },
  stats: { striking: 10, wrestling: 10, submission: 10, chin: 10, cardio: 10 },
  purseFloor: 1000,
  promotionId: null,
  champion: false,
  fatigue: 0,
  injuryWeeks: 0,
  xp: 0,
};

const venue = { id: 'v1', name: 'Test Arena', city: 'Testville', country: 'USA', tier: 'arena', capacity: 5000, fee: 1000, indoor: true };

function emptySideStats() {
  return {
    strikes: { thrown: 10, landed: 5 },
    groundStrikes: { thrown: 0, landed: 0 },
    takedowns: { thrown: 1, landed: 1 },
    submissions: { thrown: 0, landed: 0 },
    controlBeats: 0,
  };
}

function bookMainEvent(state, fighterId) {
  return gameReducer(state, { type: 'SCHEDULE_FIGHT', fighterId, opponent, fightType: FIGHT_TYPES.MAIN_EVENT, venue });
}

function resolveWithResult(state, fightId, fighterId, oppId, method, winnerId) {
  const activeState = {
    ...state,
    activeFight: {
      fightId,
      fighterId,
      opponentId: oppId,
      sim: {
        fighterAId: fighterId,
        fighterBId: oppId,
        rounds: 3,
        roundsData: [{ roundNum: 1, beats: [], landedA: 5, landedB: 2, scoreA: 10, scoreB: 9, endDamageA: 0, endDamageB: 20 }],
        result: {
          winnerId,
          loserId: winnerId ? (winnerId === fighterId ? oppId : fighterId) : null,
          method,
          roundEnded: 3,
          cards: { A: [29, 29, 29], B: [28, 28, 28] },
          totalStats: { A: emptySideStats(), B: emptySideStats() },
        },
      },
    },
  };
  return gameReducer(activeState, { type: 'RESOLVE_FIGHT' });
}

test('a high-overall fighter booking a Main Event against a vacant division gets a title fight', () => {
  const state = bookMainEvent(baseState(), 'champ1');
  expect(state.scheduledFights).toHaveLength(1);
  expect(state.scheduledFights[0].isTitle).toBe(true);
});

test('winning a title fight crowns the fighter and flags them on the roster', () => {
  let state = bookMainEvent(baseState(), 'champ1');
  const fight = state.scheduledFights[0];
  state = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');

  expect(state.titles.FLW).toBeTruthy();
  expect(state.titles.FLW.holderId).toBe('champ1');
  expect(state.titles.FLW.defenses).toBe(0);
  expect(state.roster.find(f => f.id === 'champ1').title).toBe('Flyweight');
});

test('a successful defense increments the defense count', () => {
  let state = bookMainEvent(baseState(), 'champ1');
  let fight = state.scheduledFights[0];
  state = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  expect(state.roster.find(f => f.id === 'champ1').injuryWeeks).toBe(0); // no injury with 0 damage taken

  state = bookMainEvent(state, 'champ1');
  fight = state.scheduledFights[0];
  expect(fight.isTitle).toBe(true); // still a title fight — defending their own belt
  state = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'TKO', 'champ1');

  expect(state.titles.FLW.defenses).toBe(1);
});

test('losing a title fight vacates the belt', () => {
  let state = bookMainEvent(baseState(), 'champ1');
  let fight = state.scheduledFights[0];
  state = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  expect(state.titles.FLW.holderId).toBe('champ1');

  state = bookMainEvent(state, 'champ1');
  fight = state.scheduledFights[0];
  state = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'KO', 'opp1');

  expect(state.titles.FLW).toBeNull();
  expect(state.roster.find(f => f.id === 'champ1').title).toBeNull();
});

test('a fighter below the title threshold never gets a title fight', () => {
  let state = baseState();
  state = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, overall: 8 } : f)) };
  state = bookMainEvent(state, 'champ1');
  expect(state.scheduledFights[0].isTitle).toBe(false);
});

test('winning a fight grows followers; losing shrinks them (floored at 0)', () => {
  const winState = { ...baseState() };
  const winStateWithFollowers = { ...winState, roster: winState.roster.map(f => (f.id === 'champ1' ? { ...f, followers: 1000 } : f)) };
  const bookedWin = bookMainEvent(winStateWithFollowers, 'champ1');
  const won = resolveWithResult(bookedWin, bookedWin.scheduledFights[0].id, 'champ1', 'opp1', 'UD', 'champ1');
  expect(won.roster.find(f => f.id === 'champ1').followers).toBeGreaterThan(1000);

  const loseState = { ...baseState() };
  const loseStateWithFollowers = { ...loseState, roster: loseState.roster.map(f => (f.id === 'champ1' ? { ...f, followers: 5 } : f)) };
  const bookedLoss = bookMainEvent(loseStateWithFollowers, 'champ1');
  const lost = resolveWithResult(bookedLoss, bookedLoss.scheduledFights[0].id, 'champ1', 'opp1', 'KO', 'opp1');
  expect(lost.roster.find(f => f.id === 'champ1').followers).toBeGreaterThanOrEqual(0);
  expect(lost.roster.find(f => f.id === 'champ1').followers).toBeLessThan(6); // a tiny starting base can't go negative
});

test('drawMultiplier scales purse potential with combined followers, capped', () => {
  expect(drawMultiplier(0, 0)).toBe(1);
  expect(drawMultiplier(20000, 20000)).toBeCloseTo(2, 5);
  expect(drawMultiplier(1000000, 1000000)).toBeCloseTo(2.5, 5); // capped at +1.5x
});

test('a big follower spike (title win by finish) generates a trending news item', () => {
  let state = bookMainEvent(baseState(), 'champ1');
  const fight = state.scheduledFights[0];
  state = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'KO', 'champ1');
  expect(state.news.some(n => n.category === 'trending')).toBe(true);
});

test('a bigger combined following books a bigger purse for the same card', () => {
  let state = baseState();
  const bigFollowerState = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, followers: 30000 } : f)) };
  const smallPurse = bookMainEvent(state, 'champ1').scheduledFights[0].purse;
  const bigPurse = bookMainEvent(bigFollowerState, 'champ1').scheduledFights[0].purse;
  expect(bigPurse).toBeGreaterThan(smallPurse);
});

test('starting a career with hand-picked fighters uses exactly that roster', () => {
  const drafted = [
    { id: 'd1', name: 'Draft One', weightClass: 'HW', stats: {}, record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 }, followers: 0 },
    { id: 'd2', name: 'Draft Two', weightClass: 'LW', stats: {}, record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 }, followers: 0 },
  ];
  const state = newCareerState({ managerName: 'Test', promotionName: 'Test FC', hq: 'Testville', selectedFighters: drafted });
  expect(state.roster.map(f => f.id)).toEqual(['d1', 'd2']);
  expect(state.roster.every(f => f.signed)).toBe(true);
});

test('a new career starts at gym level 1 with the level-1 roster limit', () => {
  const state = baseState();
  expect(state.meta.gymLevel).toBe(1);
  expect(rosterLimitForGym(state.meta.gymLevel)).toBe(GYM_LEVELS[0].rosterLimit);
});

test('signing a scouted prospect adds them to the roster and spends funds', () => {
  const state = baseState();
  const prospect = { id: 'scouted1', name: 'Scouted Fighter', weightClass: 'FLW', stats: { striking: 8, wrestling: 8, submission: 8, chin: 8, cardio: 8 }, overall: 8, record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 }, followers: 0, purseFloor: 1000, age: 22 };
  const next = gameReducer(state, { type: 'SIGN_SCOUTED_PROSPECT', fighter: prospect });
  expect(next.roster.some(f => f.id === 'scouted1')).toBe(true);
  expect(next.funds).toBe(state.funds - 1500);
});

test('a full roster cannot sign another scouted prospect', () => {
  let state = baseState();
  const limit = rosterLimitForGym(state.meta.gymLevel);
  // Pad the roster up to the gym's limit with filler fighters.
  const filler = Array.from({ length: limit - state.roster.length }, (_, i) => ({
    id: `filler${i}`, name: `Filler ${i}`, weightClass: 'FLW', stats: {}, record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 }, followers: 0,
  }));
  state = { ...state, roster: [...state.roster, ...filler] };
  expect(state.roster.length).toBe(limit);

  const prospect = { id: 'overflow1', name: 'Overflow Fighter', weightClass: 'FLW', stats: {}, record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 }, followers: 0 };
  const next = gameReducer(state, { type: 'SIGN_SCOUTED_PROSPECT', fighter: prospect });
  expect(next.roster.length).toBe(limit);
});

test('upgrading the gym raises the roster limit and spends funds', () => {
  const state = { ...baseState(), funds: GYM_LEVELS[1].upgradeCost };
  const next = gameReducer(state, { type: 'UPGRADE_GYM' });
  expect(next.meta.gymLevel).toBe(2);
  expect(next.funds).toBe(0);
  expect(rosterLimitForGym(next.meta.gymLevel)).toBe(GYM_LEVELS[1].rosterLimit);
});

test('upgrading the gym without enough funds does nothing', () => {
  const state = { ...baseState(), funds: GYM_LEVELS[1].upgradeCost - 1 };
  const next = gameReducer(state, { type: 'UPGRADE_GYM' });
  expect(next.meta.gymLevel).toBe(1);
  expect(next.funds).toBe(state.funds);
});
