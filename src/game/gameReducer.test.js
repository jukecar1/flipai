import { gameReducer, newCareerState, drawMultiplier, winProbability, prestigeUpsetFactor } from './gameReducer';
import {
  FIGHT_TYPES, GYM_LEVELS, rosterLimitForGym, RETIREMENT_AGE, AMATEUR_SIGN_COST, AMATEUR_PROMOTION_WINS, AMATEUR_POOL_LIMIT, WEEKS_PER_YEAR,
  CARD_MAX_FIGHTS, SUPER_FIGHT_SANCTION_FEE, WEIGHT_MOVE_COST, TRAINING_XP_PER_STAT_POINT, POACH_COST_MULTIPLIER, CONTRACT_RENEWAL_MULTIPLIER,
  STARTING_FUNDS, ageCurveMultiplier, effectiveOverall,
} from './constants';
import { CITIES } from './namePool';

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

// PREPARE_FIGHT_SIM (and the round-by-round actions built on it) look the
// opponent up live via findFighterAnywhere(state, opponentId), so tests
// that actually simulate a fight need the fixture present in the world
// pool — real bookings always source their opponent from there already.
function withLiveOpponent(state) {
  return { ...state, worldPool: { ...state.worldPool, FLW: [...(state.worldPool.FLW || []), opponent] } };
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
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  state = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');

  expect(state.titles.FLW).toBeTruthy();
  expect(state.titles.FLW.holderId).toBe('champ1');
  expect(state.titles.FLW.defenses).toBe(0);
  expect(state.roster.find(f => f.id === 'champ1').title).toBe('Flyweight');
});

test('a successful defense increments the defense count', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
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
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
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
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
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

test('retiring a champion vacates the belt and removes them from the roster', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  state = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  expect(state.titles.FLW.holderId).toBe('champ1');

  const next = gameReducer(state, { type: 'RETIRE_FIGHTER', fighterId: 'champ1' });
  expect(next.roster.some(f => f.id === 'champ1')).toBe(false);
  expect(next.titles.FLW).toBeNull();
});

test('a retiring fighter with a great record is inducted into the Hall of Fame', () => {
  const state = baseState();
  const stateWithLegend = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, record: { ...f.record, wins: 25 } } : f)) };
  const next = gameReducer(stateWithLegend, { type: 'RETIRE_FIGHTER', fighterId: 'champ1' });
  expect(next.hallOfFame.some(f => f.id === 'champ1')).toBe(true);
});

test('a retiring journeyman with an unremarkable record is not inducted', () => {
  const state = baseState();
  const stateWithJourneyman = {
    ...state,
    roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, overall: 8, title: null, record: { wins: 5, losses: 5, draws: 0, kos: 1, subs: 1 } } : f)),
  };
  const next = gameReducer(stateWithJourneyman, { type: 'RETIRE_FIGHTER', fighterId: 'champ1' });
  expect(next.hallOfFame.some(f => f.id === 'champ1')).toBe(false);
});

test('fighters age a year and retire once they cross the retirement age', () => {
  const state = baseState();
  const oldTimer = { ...state.roster[1], id: 'old1', age: RETIREMENT_AGE - 1 };
  const stateWithElder = { ...state, week: WEEKS_PER_YEAR - 1, roster: [...state.roster, oldTimer] };
  const next = gameReducer(stateWithElder, { type: 'ADVANCE_WEEK' });
  expect(next.week).toBe(WEEKS_PER_YEAR);
  expect(next.roster.some(f => f.id === 'old1')).toBe(false);
  expect(next.news.some(n => n.category === 'retirement')).toBe(true);
});

test('ageCurveMultiplier peaks in the late 20s and declines toward retirement', () => {
  expect(ageCurveMultiplier(19)).toBeLessThan(1);
  expect(ageCurveMultiplier(27)).toBe(1);
  expect(ageCurveMultiplier(29)).toBe(1);
  expect(ageCurveMultiplier(34)).toBeLessThan(1);
  expect(ageCurveMultiplier(38)).toBeLessThan(ageCurveMultiplier(34));
  expect(ageCurveMultiplier(RETIREMENT_AGE - 1)).toBeGreaterThan(0.6);
});

test('effectiveOverall scales the same stats down for an older fighter', () => {
  const stats = { striking: 16, wrestling: 16, submission: 16, chin: 16, cardio: 16 };
  const primeOverall = effectiveOverall(stats, 28);
  const veteranOverall = effectiveOverall(stats, 37);
  expect(primeOverall).toBe(16);
  expect(veteranOverall).toBeLessThan(primeOverall);
});

test('a birthday recomputes OVR from the age curve, not just the stat total', () => {
  const state = baseState();
  const veteran = { ...state.roster[1], id: 'vet1', age: 37, stats: { striking: 16, wrestling: 16, submission: 16, chin: 16, cardio: 16 }, overall: 16 };
  const withVeteran = { ...state, week: WEEKS_PER_YEAR - 1, roster: [...state.roster, veteran] };
  const next = gameReducer(withVeteran, { type: 'ADVANCE_WEEK' });
  const aged = next.roster.find(f => f.id === 'vet1');
  expect(aged.age).toBe(38);
  expect(aged.overall).toBeLessThan(16);
});

test('training recomputes OVR through the age curve too', () => {
  const state = baseState();
  const young = { ...state.roster[1], id: 'young1', age: 28, xp: 100000, stats: { striking: 10, wrestling: 10, submission: 10, chin: 10, cardio: 10 } };
  const withYoung = { ...state, roster: [...state.roster, young] };
  const next = gameReducer(withYoung, { type: 'TRAIN_STAT', fighterId: 'young1', stat: 'striking' });
  const trained = next.roster.find(f => f.id === 'young1');
  expect(trained.stats.striking).toBe(11);
  expect(trained.overall).toBe(effectiveOverall(trained.stats, trained.age));
});

test('signing an amateur adds them to the amateur pool and spends funds', () => {
  const state = baseState();
  const candidate = { id: 'am1', name: 'Raw Prospect', weightClass: 'FLW', overall: 6, stats: {}, record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 }, followers: 0 };
  const next = gameReducer(state, { type: 'SIGN_AMATEUR', fighter: candidate });
  expect(next.amateurs.some(a => a.id === 'am1')).toBe(true);
  expect(next.funds).toBe(state.funds - AMATEUR_SIGN_COST);
});

test('a full amateur pool cannot sign another amateur', () => {
  const state = baseState();
  const amateurs = Array.from({ length: AMATEUR_POOL_LIMIT }, (_, i) => ({ id: `pad${i}`, name: `Pad ${i}`, weightClass: 'FLW', amateurRecord: { wins: 0, losses: 0 } }));
  const fullState = { ...state, amateurs };
  const candidate = { id: 'overflow', name: 'Overflow', weightClass: 'FLW', overall: 6, stats: {}, record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 }, followers: 0 };
  const next = gameReducer(fullState, { type: 'SIGN_AMATEUR', fighter: candidate });
  expect(next.amateurs.length).toBe(AMATEUR_POOL_LIMIT);
});

test('promoting an eligible amateur moves them to the pro roster', () => {
  const state = baseState();
  const amateur = { id: 'am2', name: 'Ready Prospect', weightClass: 'FLW', overall: 6, stats: {}, followers: 0, amateurRecord: { wins: AMATEUR_PROMOTION_WINS, losses: 1 } };
  const stateWithAmateur = { ...state, amateurs: [amateur] };
  const next = gameReducer(stateWithAmateur, { type: 'PROMOTE_AMATEUR', fighterId: 'am2' });
  expect(next.roster.some(f => f.id === 'am2')).toBe(true);
  expect(next.amateurs.length).toBe(0);
});

test('promoting an amateur who has not hit the win threshold does nothing', () => {
  const state = baseState();
  const amateur = { id: 'am3', name: 'Not Ready', weightClass: 'FLW', overall: 6, stats: {}, followers: 0, amateurRecord: { wins: AMATEUR_PROMOTION_WINS - 1, losses: 0 } };
  const stateWithAmateur = { ...state, amateurs: [amateur] };
  const next = gameReducer(stateWithAmateur, { type: 'PROMOTE_AMATEUR', fighterId: 'am3' });
  expect(next.roster.some(f => f.id === 'am3')).toBe(false);
  expect(next.amateurs.length).toBe(1);
});

test('winProbability is even at equal overall and swings toward the better fighter', () => {
  const even = winProbability({ overall: 12 }, { overall: 12 });
  expect(even).toBeCloseTo(0.5, 5);
  const favored = winProbability({ overall: 18 }, { overall: 6 });
  const underdog = winProbability({ overall: 6 }, { overall: 18 });
  expect(favored).toBeGreaterThan(0.9);
  expect(underdog).toBeLessThan(0.1);
});

test('prestigeUpsetFactor rewards upsets and discounts stay-busy wins', () => {
  expect(prestigeUpsetFactor(0.5, true)).toBeCloseTo(1, 5);
  expect(prestigeUpsetFactor(0.1, true)).toBeGreaterThan(1.5); // won as a big underdog
  expect(prestigeUpsetFactor(0.9, true)).toBeLessThan(0.5); // won as a heavy favorite
  expect(prestigeUpsetFactor(0.9, false)).toBeGreaterThan(1.5); // lost as a heavy favorite — costly
  expect(prestigeUpsetFactor(0.1, false)).toBeLessThan(0.5); // lost as a big underdog — barely stings
});

test('training a stat spends XP and raises it, respecting the coach specialty discount', () => {
  let state = baseState();
  state = { ...state, meta: { ...state.meta, coachSpecialty: 'striking' } };
  const before = state.roster.find(f => f.id === 'champ1');
  const specialtyCost = Math.round(before.stats.striking * TRAINING_XP_PER_STAT_POINT * 0.75);
  state = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, xp: specialtyCost } : f)) };
  const next = gameReducer(state, { type: 'TRAIN_STAT', fighterId: 'champ1', stat: 'striking' });
  const after = next.roster.find(f => f.id === 'champ1');
  expect(after.stats.striking).toBe(before.stats.striking + 1);
  expect(after.xp).toBe(0);
});

test('training without enough XP does nothing', () => {
  const state = baseState();
  const stateNoXp = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, xp: 0 } : f)) };
  const next = gameReducer(stateNoXp, { type: 'TRAIN_STAT', fighterId: 'champ1', stat: 'striking' });
  const before = state.roster.find(f => f.id === 'champ1');
  const after = next.roster.find(f => f.id === 'champ1');
  expect(after.stats.striking).toBe(before.stats.striking);
});

test('renewing a contract resets the countdown and spends funds', () => {
  const state = baseState();
  const stateWithContract = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, contractWeeksLeft: 2 } : f)) };
  const fighter = stateWithContract.roster.find(f => f.id === 'champ1');
  const cost = Math.round(fighter.purseFloor * CONTRACT_RENEWAL_MULTIPLIER);
  const next = gameReducer(stateWithContract, { type: 'RENEW_CONTRACT', fighterId: 'champ1' });
  expect(next.funds).toBe(stateWithContract.funds - cost);
  expect(next.roster.find(f => f.id === 'champ1').contractWeeksLeft).toBeGreaterThan(2);
});

test('a fighter whose contract runs out during ADVANCE_WEEK leaves the roster for a rival', () => {
  const state = baseState();
  const stateExpiring = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, contractWeeksLeft: 1 } : f)) };
  const next = gameReducer(stateExpiring, { type: 'ADVANCE_WEEK' });
  expect(next.roster.some(f => f.id === 'champ1')).toBe(false);
  expect(next.worldPool.FLW.some(f => f.id === 'champ1')).toBe(true);
  expect(next.news.some(n => n.category === 'poached')).toBe(true);
});

test('moving a fighter to an adjacent weight class spends funds and updates their division', () => {
  const state = baseState(); // champ1 starts at FLW
  const next = gameReducer(state, { type: 'MOVE_WEIGHT_CLASS', fighterId: 'champ1', direction: 'lighter' });
  expect(next.roster.find(f => f.id === 'champ1').weightClass).toBe('STW');
  expect(next.funds).toBe(state.funds - WEIGHT_MOVE_COST);
});

test('moving past the lightest weight class does nothing', () => {
  const state = baseState();
  const stateAtEdge = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, weightClass: 'STW' } : f)) };
  const next = gameReducer(stateAtEdge, { type: 'MOVE_WEIGHT_CLASS', fighterId: 'champ1', direction: 'lighter' });
  expect(next.roster.find(f => f.id === 'champ1').weightClass).toBe('STW');
  expect(next.funds).toBe(stateAtEdge.funds);
});

test('BOOK_CARD books every bout on one venue fee, atomically', () => {
  const state = baseState();
  const fighterB = state.roster[1];
  const bouts = [
    { fighterId: 'champ1', opponent: { ...opponent, id: 'opp1' }, fightType: FIGHT_TYPES.SHOWCASE, gameplan: 'balanced' },
    { fighterId: fighterB.id, opponent: { ...opponent, id: 'opp2', name: 'Opponent Two' }, fightType: FIGHT_TYPES.SHOWCASE, gameplan: 'pressure' },
  ];
  const next = gameReducer(state, { type: 'BOOK_CARD', venue, bouts });
  expect(next.funds).toBe(state.funds - venue.fee);
  expect(next.scheduledFights.length).toBe(2);
  expect(next.cards.length).toBe(1);
  expect(next.scheduledFights.every(f => f.cardId === next.cards[0].id)).toBe(true);
});

test('BOOK_CARD refuses to book the same fighter twice on one card', () => {
  const state = baseState();
  const bouts = [
    { fighterId: 'champ1', opponent: { ...opponent, id: 'opp1' }, fightType: FIGHT_TYPES.SHOWCASE, gameplan: 'balanced' },
    { fighterId: 'champ1', opponent: { ...opponent, id: 'opp2', name: 'Opponent Two' }, fightType: FIGHT_TYPES.SHOWCASE, gameplan: 'balanced' },
  ];
  const next = gameReducer(state, { type: 'BOOK_CARD', venue, bouts });
  expect(next).toBe(state); // unchanged
});

test('BOOK_CARD refuses more than CARD_MAX_FIGHTS bouts', () => {
  const state = baseState();
  const bouts = Array.from({ length: CARD_MAX_FIGHTS + 1 }, (_, i) => ({
    fighterId: state.roster[i % state.roster.length]?.id || 'champ1',
    opponent: { ...opponent, id: `opp${i}` },
    fightType: FIGHT_TYPES.SHOWCASE,
    gameplan: 'balanced',
  }));
  const next = gameReducer(state, { type: 'BOOK_CARD', venue, bouts });
  expect(next).toBe(state);
});

test('booking a crossover Main Event against a rival-contracted fighter charges the sanction fee', () => {
  const state = baseState();
  const rivalOpponent = { ...opponent, id: 'rival1', promotionId: 'apex' };
  const next = gameReducer(state, { type: 'CREATE_CARD', venue, fighterId: 'champ1', opponent: rivalOpponent, fightType: FIGHT_TYPES.MAIN_EVENT });
  expect(next.funds).toBe(state.funds - venue.fee - SUPER_FIGHT_SANCTION_FEE);
  expect(next.scheduledFights[0].isSuperFight).toBe(true);
});

test('poaching a rival fighter succeeds when the roll favors you and removes them from the world pool', () => {
  const state = baseState();
  const rivalFighter = { ...opponent, id: 'rival2', promotionId: 'apex', purseFloor: 1000, champion: true, title: 'Flyweight' };
  const stateWithRival = { ...state, worldPool: { ...state.worldPool, FLW: [...state.worldPool.FLW, rivalFighter] } };
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0); // always beats the success threshold
  const next = gameReducer(stateWithRival, { type: 'POACH_FIGHTER', fighterId: 'rival2' });
  spy.mockRestore();
  expect(next.roster.some(f => f.id === 'rival2')).toBe(true);
  expect(next.worldPool.FLW.some(f => f.id === 'rival2')).toBe(false);
  expect(next.funds).toBe(stateWithRival.funds - Math.round(rivalFighter.purseFloor * POACH_COST_MULTIPLIER));
});

test('a failed poach attempt costs nothing and leaves the fighter with the rival', () => {
  const state = baseState();
  const rivalFighter = { ...opponent, id: 'rival3', promotionId: 'apex', purseFloor: 1000 };
  const stateWithRival = { ...state, worldPool: { ...state.worldPool, FLW: [...state.worldPool.FLW, rivalFighter] } };
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99); // always fails
  const next = gameReducer(stateWithRival, { type: 'POACH_FIGHTER', fighterId: 'rival3' });
  spy.mockRestore();
  expect(next.roster.some(f => f.id === 'rival3')).toBe(false);
  expect(next.funds).toBe(stateWithRival.funds);
});

test('starting a career with a chosen champion crowns them and boosts starting prestige', () => {
  const drafted = [
    { id: 'd1', name: 'Draft Champ', weightClass: 'HW', stats: { striking: 10, wrestling: 10, submission: 10, chin: 10, cardio: 10 }, overall: 10, record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 }, followers: 0, purseFloor: 1000 },
    { id: 'd2', name: 'Draft Two', weightClass: 'LW', stats: { striking: 10, wrestling: 10, submission: 10, chin: 10, cardio: 10 }, overall: 10, record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 }, followers: 0, purseFloor: 1000 },
  ];
  const state = newCareerState({ managerName: 'Test', promotionName: 'Test FC', hq: 'Testville', selectedFighters: drafted, championFighterId: 'd1' });
  expect(state.titles.HW.holderId).toBe('d1');
  expect(state.roster.find(f => f.id === 'd1').title).toBe('Heavyweight');
  expect(state.prestige).toBeGreaterThan(50);
});

test('starting a career with no champion leaves every title vacant', () => {
  const state = baseState();
  expect(Object.keys(state.titles).length).toBe(0);
});

test('PREPARE_FIGHT_SIM simulates only Round 1 and pauses for a between-rounds gameplan', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  state = gameReducer(state, { type: 'PREPARE_FIGHT_SIM', fightId: fight.id });
  const active = state.activeFight;
  expect(active.sim.roundsData).toHaveLength(1);
  expect(active.session).toBeTruthy();
  if (!active.finished) {
    expect(active.sim.result).toBeNull();
  } else {
    // the fight can still end in Round 1 via KO/TKO/SUB
    expect(active.sim.result).toBeTruthy();
  }
});

test('ADVANCE_FIGHT_ROUND simulates the next round and can change gameplan mid-fight', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  state = gameReducer(state, { type: 'PREPARE_FIGHT_SIM', fightId: fight.id });
  const wasFinished = state.activeFight.finished;
  state = gameReducer(state, { type: 'ADVANCE_FIGHT_ROUND', gameplan: 'pressure' });
  if (wasFinished) {
    expect(state.activeFight.sim.roundsData).toHaveLength(1);
  } else {
    expect(state.activeFight.sim.roundsData).toHaveLength(2);
    expect(state.activeFight.gameplan).toBe('pressure');
  }
});

test('ADVANCE_FIGHT_ROUND is a no-op once the fight is already finished', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  state = gameReducer(state, { type: 'PREPARE_FIGHT_SIM', fightId: fight.id });
  state = gameReducer(state, { type: 'SKIP_FIGHT_TO_END' });
  const finishedState = state;
  state = gameReducer(state, { type: 'ADVANCE_FIGHT_ROUND', gameplan: 'finish' });
  expect(state).toBe(finishedState);
});

test('SKIP_FIGHT_TO_END resolves every remaining round into a final result', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  state = gameReducer(state, { type: 'PREPARE_FIGHT_SIM', fightId: fight.id });
  state = gameReducer(state, { type: 'SKIP_FIGHT_TO_END' });
  const active = state.activeFight;
  expect(active.finished).toBe(true);
  expect(active.sim.roundsData.length).toBeGreaterThanOrEqual(1);
  expect(active.sim.roundsData.length).toBeLessThanOrEqual(5);
  expect(['KO', 'TKO', 'SUB', 'UD', 'SD', 'MD', 'DRAW']).toContain(active.sim.result.method);
});

test('PREPARE_FIGHT_SIM resolves the whole fight at once when autoSkipFights is on', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  state = { ...state, meta: { ...state.meta, autoSkipFights: true } };
  const fight = state.scheduledFights[0];
  state = gameReducer(state, { type: 'PREPARE_FIGHT_SIM', fightId: fight.id });
  expect(state.activeFight.finished).toBe(true);
  expect(state.activeFight.sim.result).toBeTruthy();
});

test('a megacity HQ starts with meaningfully more funds than a small-town HQ', () => {
  const bigCity = CITIES.find(c => c.id === 'new-york-ny');
  const smallTown = CITIES.find(c => c.id === 'hanford-ca');
  const bigState = newCareerState({ managerName: 'Test', promotionName: 'Test FC', hq: bigCity.id });
  const smallState = newCareerState({ managerName: 'Test', promotionName: 'Test FC', hq: smallTown.id });
  expect(bigState.meta.hqTier).toBe('megacity');
  expect(smallState.meta.hqTier).toBe('town');
  expect(bigState.funds).toBeGreaterThan(smallState.funds);
  expect(bigState.meta.hq).toBe('New York, NY');
  expect(smallState.meta.hq).toBe('Hanford, CA');
});

test('an unrecognized HQ label falls back to the default (unscaled) funds tier', () => {
  const state = newCareerState({ managerName: 'Test', promotionName: 'Test FC', hq: 'Nowhereville' });
  expect(state.funds).toBe(STARTING_FUNDS);
  expect(state.meta.hq).toBe('Nowhereville');
  expect(state.meta.hqTier).toBe('city');
});

test('every CITIES entry has a unique id', () => {
  const ids = CITIES.map(c => c.id);
  expect(new Set(ids).size).toBe(ids.length);
});
