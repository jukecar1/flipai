import { gameReducer, newCareerState } from './gameReducer';
import { FIGHT_TYPES } from './constants';

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
