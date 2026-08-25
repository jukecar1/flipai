import {
  gameReducer, newCareerState, drawMultiplier, winProbability, prestigeUpsetFactor, attendanceRate, attendanceStatus, purseForFight, ppvBuys, ppvRevenue,
  currentPromotionTier, nextPromotionTier, promotionTierProgress, tierRequirementsMet, findFighterAnywhere,
} from './gameReducer';
import {
  FIGHT_TYPES, GYM_LEVELS, rosterLimitForGym, RETIREMENT_AGE, AMATEUR_SIGN_COST, AMATEUR_PROMOTION_WINS, AMATEUR_POOL_LIMIT, WEEKS_PER_YEAR,
  CARD_MAX_FIGHTS, SUPER_FIGHT_SANCTION_FEE, WEIGHT_MOVE_COST, TRAINING_XP_PER_STAT_POINT, poachCostFor, contractCost, DEFAULT_CONTRACT_FIGHTS,
  STARTING_FUNDS, ageCurveMultiplier, effectiveOverall, trainingCost, primeStatus, INACTIVE_WEEKS_BEFORE_FRUSTRATION,
  LOYALTY_BASELINE, LOYALTY_MIN, LOYALTY_MAX, poachChance, PPV_PRODUCTION_FEE, DEFAULT_PPV_PRICE, PROMOTION_TIERS,
  sponsorIncome, potnChance, fotnChance, controversyChance, isMismatchedBooking, isNotableFighter, isLegacyFight,
  LEGACY_FIGHT_PURSE_BONUS_PCT, CALLOUT_EXPIRY_WEEKS, CALLOUT_PRESTIGE_BONUS, MISMATCH_OVERALL_GAP, NOTABLE_FIGHTER_OVERALL,
} from './constants';
import { makeFighter } from './generateFighter';
import { CITIES } from './namePool';

function baseState() {
  const state = newCareerState({ managerName: 'Test', promotionName: 'Test FC', hq: 'Testville' });
  const champFighter = {
    ...state.roster[0],
    id: 'champ1',
    name: 'Test Champion',
    weightClass: 'FLW',
    overall: 15,
    age: 28, // pinned squarely in-prime so age-curve math never flakes these tests
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

function bookShowcase(state, fighterId) {
  return gameReducer(state, { type: 'SCHEDULE_FIGHT', fighterId, opponent, fightType: FIGHT_TYPES.SHOWCASE, venue });
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

test('attendanceRate is relative to whatever venue you booked, not an absolute follower count', () => {
  const twoUnknowns = 0;
  const twoSuperstars = 80000;
  // The exact same fighters look empty in a stadium and packed in a small hall.
  expect(attendanceRate(twoUnknowns, 58500)).toBeLessThan(0.2);
  expect(attendanceRate(twoUnknowns, 600)).toBeGreaterThan(0.5);
  expect(attendanceRate(twoSuperstars, 58500)).toBe(1);
  expect(attendanceRate(twoSuperstars, 600)).toBe(1);
});

test('attendanceStatus tiers run from Sparse Crowd to Sold Out', () => {
  expect(attendanceStatus(0.05).id).toBe('sparse');
  expect(attendanceStatus(0.3).id).toBe('modest');
  expect(attendanceStatus(0.6).id).toBe('solid');
  expect(attendanceStatus(0.9).id).toBe('packed');
  expect(attendanceStatus(1).id).toBe('sold-out');
});

test('the same stadium pays vastly more when the fighters can actually fill it', () => {
  const stadium = { capacity: 58500 };
  const nobody = { purseFloor: 1000, followers: 0 };
  const superstar = { purseFloor: 1000, followers: 60000 };
  // Same purse floor, same venue and site fee — the only difference is
  // whether the matchup draws a crowd. An empty-looking stadium show
  // shouldn't pay anywhere close to a packed one.
  const emptyHousePurse = purseForFight(nobody, { followers: 0 }, FIGHT_TYPES.MAIN_EVENT, stadium);
  const packedHousePurse = purseForFight(superstar, { followers: 60000 }, FIGHT_TYPES.MAIN_EVENT, stadium);
  expect(packedHousePurse).toBeGreaterThan(emptyHousePurse * 5);
});

test('a well-matched stadium booking is not nerfed at all — it pays exactly what capacity always implied', () => {
  const star = { purseFloor: 1000, followers: 60000 };
  const stadium = { capacity: 58500 };
  const oldVenueMult = 1 + stadium.capacity / 20000;
  const drawMult = drawMultiplier(star.followers, star.followers);
  const expected = Math.round(star.purseFloor * 2.4 * oldVenueMult * drawMult);
  expect(purseForFight(star, { followers: 60000 }, FIGHT_TYPES.MAIN_EVENT, stadium)).toBe(expected);
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

test('advancing weeks with no fights booked does not grow the promotion\'s prestige on its own', () => {
  // A well-stocked, well-funded promotion that simply lets the calendar
  // run should not passively climb the tier ladder — prestige only moves
  // from actually doing something (booking and winning fights, signing a
  // free agent, etc.), never from idly clicking "Advance Week."
  const state = { ...baseState(), funds: 200000, prestige: 1000 };
  let next = state;
  for (let i = 0; i < 10; i++) next = gameReducer(next, { type: 'ADVANCE_WEEK' });
  expect(next.prestige).toBe(1000);
});

test('ageCurveMultiplier peaks in the late 20s and declines toward retirement', () => {
  expect(ageCurveMultiplier(19)).toBeLessThan(1);
  expect(ageCurveMultiplier(27)).toBe(1);
  expect(ageCurveMultiplier(29)).toBe(1);
  expect(ageCurveMultiplier(34)).toBeLessThan(1);
  expect(ageCurveMultiplier(38)).toBeLessThan(ageCurveMultiplier(34));
  expect(ageCurveMultiplier(RETIREMENT_AGE - 1)).toBeGreaterThan(0.6);
});

test('35 is clearly past prime, not just barely started to fade', () => {
  expect(primeStatus(35).id).toBe('past-prime');
  expect(primeStatus(35).label).toBe('Past Prime');
  // more than a token dip — a real, felt decline by the mid-30s
  expect(ageCurveMultiplier(35)).toBeLessThan(0.9);
});

test('effectiveOverall scales the same stats down for an older fighter', () => {
  const stats = { striking: 16, wrestling: 16, submission: 16, chin: 16, cardio: 16 };
  const primeOverall = effectiveOverall(stats, 28);
  const veteranOverall = effectiveOverall(stats, 37);
  expect(primeOverall).toBe(16);
  expect(veteranOverall).toBeLessThan(primeOverall);
});

test('effectiveOverall rewards a coherent standout skill over a flat spread with the same total', () => {
  const specialist = { striking: 18, wrestling: 13, submission: 13, chin: 13, cardio: 8 };
  const balanced = { striking: 13, wrestling: 13, submission: 13, chin: 13, cardio: 13 };
  expect(specialist.striking + specialist.wrestling + specialist.submission + specialist.chin + specialist.cardio)
    .toBe(balanced.striking + balanced.wrestling + balanced.submission + balanced.chin + balanced.cardio);
  expect(effectiveOverall(specialist, 28)).toBeGreaterThan(effectiveOverall(balanced, 28));
});

test('trainingCost charges more XP for the same stat point on a past-prime fighter', () => {
  const primeCost = trainingCost(10, false, 28);
  const pastPrimeCost = trainingCost(10, false, 37);
  expect(pastPrimeCost).toBeGreaterThan(primeCost);
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

test('renewing a contract sets the chosen fight count and spends funds', () => {
  const state = baseState();
  const stateWithContract = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, contractFightsLeft: 1 } : f)) };
  const fighter = stateWithContract.roster.find(f => f.id === 'champ1');
  const cost = contractCost(fighter.purseFloor, 5);
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0); // guarantee they accept
  const next = gameReducer(stateWithContract, { type: 'RENEW_CONTRACT', fighterId: 'champ1', fights: 5 });
  spy.mockRestore();
  expect(next.funds).toBe(stateWithContract.funds - cost);
  expect(next.roster.find(f => f.id === 'champ1').contractFightsLeft).toBe(5);
});

test('renewing with an invalid fight count falls back to the default length', () => {
  const state = baseState();
  const fighter = state.roster.find(f => f.id === 'champ1');
  const cost = contractCost(fighter.purseFloor, DEFAULT_CONTRACT_FIGHTS);
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0); // guarantee they accept
  const next = gameReducer(state, { type: 'RENEW_CONTRACT', fighterId: 'champ1', fights: 4 });
  spy.mockRestore();
  expect(next.funds).toBe(state.funds - cost);
  expect(next.roster.find(f => f.id === 'champ1').contractFightsLeft).toBe(DEFAULT_CONTRACT_FIGHTS);
});

test('a fight completing the contract sends the fighter to a rival, not just decrements a clock', () => {
  let state = bookMainEvent(baseState(), 'champ1');
  state = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, contractFightsLeft: 1 } : f)) };
  const fight = state.scheduledFights[0];
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  expect(next.roster.some(f => f.id === 'champ1')).toBe(false);
  expect(next.worldPool.FLW.some(f => f.id === 'champ1')).toBe(true);
  expect(next.news.some(n => n.category === 'poached')).toBe(true);
  expect(next.socialFeed.some(p => p.category === 'departure' && p.fighterId === 'champ1')).toBe(true);
});

test('a resentful fighter fought out their deal walks away without a backward glance', () => {
  let state = bookMainEvent(baseState(), 'champ1');
  state = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, contractFightsLeft: 1, loyalty: 5 } : f)) };
  const fight = state.scheduledFights[0];
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  const departureNews = next.news.find(n => n.id.includes('contractdone'));
  expect(departureNews.body).toMatch(/wanted out for a long time/);
});

test('a loyal fighter fought out their deal leaves reluctantly, not resentfully', () => {
  let state = bookMainEvent(baseState(), 'champ1');
  state = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, contractFightsLeft: 1, loyalty: 95 } : f)) };
  const fight = state.scheduledFights[0];
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  const departureNews = next.news.find(n => n.id.includes('contractdone'));
  expect(departureNews.body).toMatch(/reluctantly/);
});

test('a fight that does not use up the contract just counts it down by one', () => {
  let state = bookMainEvent(baseState(), 'champ1');
  state = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, contractFightsLeft: 3 } : f)) };
  const fight = state.scheduledFights[0];
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  expect(next.roster.find(f => f.id === 'champ1').contractFightsLeft).toBe(2);
});

test('advancing the week alone never touches a contract', () => {
  const state = baseState();
  const stateWithContract = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, contractFightsLeft: 1 } : f)) };
  const next = gameReducer(stateWithContract, { type: 'ADVANCE_WEEK' });
  expect(next.roster.find(f => f.id === 'champ1').contractFightsLeft).toBe(1);
});

test('winning a title fight boosts loyalty', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  const before = state.roster.find(f => f.id === 'champ1').loyalty;
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  expect(next.roster.find(f => f.id === 'champ1').loyalty).toBeGreaterThan(before);
});

test('a lopsided win as a heavy favorite is a stay-busy match that dents loyalty a little', () => {
  let state = bookShowcase(baseState(), 'champ1');
  const fight = state.scheduledFights[0];
  expect(fight.winProbability).toBeGreaterThanOrEqual(0.75);
  const before = state.roster.find(f => f.id === 'champ1').loyalty;
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  expect(next.roster.find(f => f.id === 'champ1').loyalty).toBeLessThan(before);
});

test('a huge underdog win is a star-making moment that boosts loyalty a lot', () => {
  let state = baseState();
  state = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, overall: 5 } : f)) };
  state = bookShowcase(state, 'champ1');
  const fight = state.scheduledFights[0];
  expect(fight.winProbability).toBeLessThanOrEqual(0.25);
  const before = state.roster.find(f => f.id === 'champ1').loyalty;
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'KO', 'champ1');
  expect(next.roster.find(f => f.id === 'champ1').loyalty).toBeGreaterThan(before + 5);
});

test('losing badly as a big underdog feels like being fed to the wolves', () => {
  let state = baseState();
  state = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, overall: 5 } : f)) };
  state = bookShowcase(state, 'champ1');
  const fight = state.scheduledFights[0];
  const before = state.roster.find(f => f.id === 'champ1').loyalty;
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'KO', 'opp1');
  expect(next.roster.find(f => f.id === 'champ1').loyalty).toBeLessThan(before - 5);
});

test('a resentful fighter can refuse to re-sign, and it costs nothing', () => {
  const state = baseState();
  const resentfulState = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, loyalty: 10 } : f)) };
  const before = resentfulState.roster.find(f => f.id === 'champ1');
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
  const next = gameReducer(resentfulState, { type: 'RENEW_CONTRACT', fighterId: 'champ1', fights: 3 });
  spy.mockRestore();
  expect(next.funds).toBe(resentfulState.funds);
  expect(next.roster.find(f => f.id === 'champ1').contractFightsLeft).toBe(before.contractFightsLeft);
  expect(next.news.some(n => n.title.includes('turns down'))).toBe(true);
  expect(next.socialFeed.some(p => p.category === 'beef' && p.fighterId === 'champ1')).toBe(true);
});

test('a loyal fighter reliably re-signs and gets a small loyalty bump for it', () => {
  const state = baseState();
  const loyalState = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, loyalty: 90 } : f)) };
  const fighter = loyalState.roster.find(f => f.id === 'champ1');
  const cost = contractCost(fighter.purseFloor, 3, 90);
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0.01);
  const next = gameReducer(loyalState, { type: 'RENEW_CONTRACT', fighterId: 'champ1', fights: 3 });
  spy.mockRestore();
  expect(next.funds).toBe(loyalState.funds - cost);
  expect(next.roster.find(f => f.id === 'champ1').contractFightsLeft).toBe(3);
  expect(next.roster.find(f => f.id === 'champ1').loyalty).toBe(95);
  expect(next.socialFeed.some(p => p.category === 'signing' && p.fighterId === 'champ1')).toBe(true);
});

test('a frustrated fighter costs more to sign than a loyal one for the same deal', () => {
  const fighter = { purseFloor: 2000 };
  const loyalCost = contractCost(fighter.purseFloor, 3, 90);
  const frustratedCost = contractCost(fighter.purseFloor, 3, 25);
  expect(frustratedCost).toBeGreaterThan(loyalCost);
});

test('advancing the week ticks up weeksSinceLastFight and drifts loyalty toward baseline', () => {
  const state = baseState();
  const shifted = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, loyalty: 90, weeksSinceLastFight: 0 } : f)) };
  const next = gameReducer(shifted, { type: 'ADVANCE_WEEK' });
  const champ = next.roster.find(f => f.id === 'champ1');
  expect(champ.weeksSinceLastFight).toBe(1);
  expect(champ.loyalty).toBeLessThan(90);
  expect(champ.loyalty).toBeGreaterThan(60);
});

test('long-term inactivity slowly frustrates a fighter', () => {
  const state = baseState();
  const shelved = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, loyalty: 60, weeksSinceLastFight: INACTIVE_WEEKS_BEFORE_FRUSTRATION + 1 } : f)) };
  const next = gameReducer(shelved, { type: 'ADVANCE_WEEK' });
  expect(next.roster.find(f => f.id === 'champ1').loyalty).toBeLessThan(60);
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

test('BOOK_CARD names a Showcase-only card into the numbered Fight Night series', () => {
  const state = baseState();
  const bouts = [{ fighterId: 'champ1', opponent: { ...opponent, id: 'opp1' }, fightType: FIGHT_TYPES.SHOWCASE, gameplan: 'balanced' }];
  const next = gameReducer(state, { type: 'BOOK_CARD', venue, bouts });
  expect(next.cards[0].name).toBe('Test FC Fight Night 1');
  expect(next.meta.fightNightCount).toBe(1);
  expect(next.meta.numberedEventCount).toBe(0);
});

test('BOOK_CARD names a card with a Main Event bout into the numbered flagship series', () => {
  const state = baseState();
  const bouts = [{ fighterId: 'champ1', opponent: { ...opponent, id: 'opp1' }, fightType: FIGHT_TYPES.MAIN_EVENT, gameplan: 'balanced' }];
  const next = gameReducer(state, { type: 'BOOK_CARD', venue, bouts });
  expect(next.cards[0].name).toBe('Test FC 1');
  expect(next.meta.numberedEventCount).toBe(1);
  expect(next.meta.fightNightCount).toBe(0);
});

test('the Fight Night and numbered flagship series count up independently across cards', () => {
  const state = baseState();
  const afterFirst = gameReducer(state, {
    type: 'CREATE_CARD', venue, fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.SHOWCASE,
  });
  const afterSecond = gameReducer(afterFirst, {
    type: 'CREATE_CARD', venue, fighterId: afterFirst.roster[1].id, opponent: { ...opponent, id: 'opp2' }, fightType: FIGHT_TYPES.MAIN_EVENT,
  });
  const afterThird = gameReducer(afterSecond, {
    type: 'CREATE_CARD', venue, fighterId: afterSecond.roster[2].id, opponent: { ...opponent, id: 'opp3' }, fightType: FIGHT_TYPES.SHOWCASE,
  });
  expect(afterFirst.cards[0].name).toBe('Test FC Fight Night 1');
  expect(afterSecond.cards[1].name).toBe('Test FC 1');
  expect(afterThird.cards[2].name).toBe('Test FC Fight Night 2');
});

test('a resolved fight remembers which numbered event it happened at', () => {
  let state = withLiveOpponent(baseState());
  state = gameReducer(state, { type: 'CREATE_CARD', venue, fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.MAIN_EVENT });
  const fight = state.scheduledFights[0];
  expect(state.cards[0].name).toBe('Test FC 1');

  const next = resolveWithResult(state, fight.id, 'champ1', opponent.id, 'KO', 'champ1');
  expect(next.fightHistory[0].eventName).toBe('Test FC 1');
  // that was the only bout on the card, so it drops off once resolved —
  // the event's name still lives on in fightHistory even though the
  // live card record itself is gone.
  expect(next.cards).toHaveLength(0);
});

test('a Single Fight (no card) leaves eventName null in fight history', () => {
  let state = withLiveOpponent(baseState());
  state = bookShowcase(state, 'champ1'); // SCHEDULE_FIGHT — no card involved
  const fight = state.scheduledFights[0];
  const next = resolveWithResult(state, fight.id, 'champ1', opponent.id, 'KO', 'champ1');
  expect(next.fightHistory[0].eventName).toBeNull();
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
  expect(next.funds).toBe(stateWithRival.funds - poachCostFor(rivalFighter));
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

test('freshly generated fighters get a varied, in-bounds loyalty reading', () => {
  const fighters = Array.from({ length: 20 }, () => makeFighter({ level: 'gatekeeper' }));
  fighters.forEach(f => {
    expect(f.loyalty).toBeGreaterThanOrEqual(LOYALTY_MIN);
    expect(f.loyalty).toBeLessThanOrEqual(LOYALTY_MAX);
  });
  expect(new Set(fighters.map(f => f.loyalty)).size).toBeGreaterThan(1);
});

test('poachChance rewards a target who is already unhappy with their current promotion', () => {
  const contentChance = poachChance(2000, LOYALTY_BASELINE);
  const resentfulChance = poachChance(2000, 10);
  const loyalChance = poachChance(2000, 95);
  expect(resentfulChance).toBeGreaterThan(contentChance);
  expect(loyalChance).toBeLessThan(contentChance);
});

test('an unhappy rival fighter is easier to poach than a loyal one facing the same odds', () => {
  const state = baseState();
  const loyalFighter = { ...opponent, id: 'rivalLoyal', promotionId: 'crown', purseFloor: 1000, loyalty: 95 };
  const unhappyFighter = { ...opponent, id: 'rivalUnhappy', promotionId: 'crown', purseFloor: 1000, loyalty: 10 };
  const stateWithRivals = { ...state, worldPool: { ...state.worldPool, FLW: [...state.worldPool.FLW, loyalFighter, unhappyFighter] } };
  // Between the loyal fighter's depressed odds and the unhappy fighter's boosted odds.
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0.15);
  const failedOnLoyal = gameReducer(stateWithRivals, { type: 'POACH_FIGHTER', fighterId: 'rivalLoyal' });
  const succeededOnUnhappy = gameReducer(stateWithRivals, { type: 'POACH_FIGHTER', fighterId: 'rivalUnhappy' });
  spy.mockRestore();
  expect(failedOnLoyal.roster.some(f => f.id === 'rivalLoyal')).toBe(false);
  expect(succeededOnUnhappy.roster.some(f => f.id === 'rivalUnhappy')).toBe(true);
});

test('a poached fighter who was already unhappy gets a callout in the signing news', () => {
  const state = baseState();
  const unhappyFighter = { ...opponent, id: 'rivalUnhappy2', promotionId: 'crown', purseFloor: 1000, loyalty: 10 };
  const stateWithRival = { ...state, worldPool: { ...state.worldPool, FLW: [...state.worldPool.FLW, unhappyFighter] } };
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0); // always succeeds
  const next = gameReducer(stateWithRival, { type: 'POACH_FIGHTER', fighterId: 'rivalUnhappy2' });
  spy.mockRestore();
  const poachNews = next.news.find(n => n.id.includes('_poach'));
  expect(poachNews.body).toMatch(/already unhappy/);
});

test('poachCostFor charges a steep premium for a division champion over an identical non-champion', () => {
  const gatekeeper = { purseFloor: 2000, followers: 0, champion: false };
  const champion = { ...gatekeeper, champion: true };
  expect(poachCostFor(champion)).toBeGreaterThan(poachCostFor(gatekeeper) * 1.5);
});

test('poachCostFor charges more for a fighter with a huge following, even with no title', () => {
  const unknown = { purseFloor: 2000, followers: 0, champion: false };
  const viral = { ...unknown, followers: 100000 };
  expect(poachCostFor(viral)).toBeGreaterThan(poachCostFor(unknown) * 2);
});

test('poachCostFor stacks the champion and stardom premiums for an actual top fighter', () => {
  const gatekeeper = { purseFloor: 2000, followers: 500, champion: false };
  const superstarChamp = { purseFloor: 2000, followers: 80000, champion: true };
  // Same purse floor, but a real top fighter should cost several times more to pry loose.
  expect(poachCostFor(superstarChamp)).toBeGreaterThan(poachCostFor(gatekeeper) * 4);
});

test('POACH_FIGHTER actually charges poachCostFor, not the flat multiplier alone', () => {
  const state = baseState();
  const superstarChamp = { ...opponent, id: 'rivalStar', promotionId: 'apex', purseFloor: 1000, followers: 90000, champion: true, title: null };
  const stateWithRival = { ...state, funds: 100000, worldPool: { ...state.worldPool, FLW: [...state.worldPool.FLW, superstarChamp] } };
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0); // always succeeds
  const next = gameReducer(stateWithRival, { type: 'POACH_FIGHTER', fighterId: 'rivalStar' });
  spy.mockRestore();
  expect(stateWithRival.funds - next.funds).toBe(poachCostFor(superstarChamp));
  expect(stateWithRival.funds - next.funds).toBeGreaterThan(superstarChamp.purseFloor * 6); // well above the old flat multiplier
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

// ---------- Pay-per-view ----------

test('ppvBuys scales with the promotion\'s own reach and the headliner\'s star power', () => {
  const tinyPromoNoNames = ppvBuys(50, 0);
  const bigPromoBigStars = ppvBuys(3000, 40000);
  expect(tinyPromoNoNames).toBeGreaterThan(0); // even a nobody promotion gets some baseline interest
  expect(bigPromoBigStars).toBeGreaterThan(tinyPromoNoNames * 10);
});

test('ppvRevenue is buys times price times the promotion\'s cut', () => {
  expect(ppvRevenue(1000, 50)).toBe(Math.round(1000 * 50 * 0.45));
});

test('booking a Main Event as a PPV charges the production fee and credits PPV revenue up front', () => {
  const state = baseState();
  const next = gameReducer(state, {
    type: 'CREATE_CARD', venue, fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.MAIN_EVENT, isPPV: true, ppvPrice: DEFAULT_PPV_PRICE,
  });
  const card = next.cards[0];
  const expectedBuys = ppvBuys(state.prestige, 0); // both fighters start at 0 followers
  const expectedRevenue = ppvRevenue(expectedBuys, DEFAULT_PPV_PRICE);
  expect(card.isPPV).toBe(true);
  expect(card.ppvPrice).toBe(DEFAULT_PPV_PRICE);
  expect(card.ppvBuys).toBe(expectedBuys);
  expect(card.ppvRevenue).toBe(expectedRevenue);
  expect(next.funds).toBe(state.funds - venue.fee - PPV_PRODUCTION_FEE + expectedRevenue);
  expect(next.news.some(n => n.category === 'ppv')).toBe(true);
  expect(next.socialFeed.some(p => p.category === 'ppv')).toBe(true);
});

test('a PPV the promotion cannot afford the production fee for is not booked at all', () => {
  const state = { ...baseState(), funds: 5000 }; // enough for the venue, not the PPV fee on top
  const next = gameReducer(state, {
    type: 'CREATE_CARD', venue, fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.MAIN_EVENT, isPPV: true,
  });
  expect(next).toBe(state);
});

test('the PPV flag is ignored on anything but a Main Event — no fee, no revenue', () => {
  const state = baseState();
  const next = gameReducer(state, {
    type: 'CREATE_CARD', venue, fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.SHOWCASE, isPPV: true,
  });
  const card = next.cards[0];
  expect(card.isPPV).toBe(false);
  expect(next.funds).toBe(state.funds - venue.fee);
});

test('BOOK_CARD as a PPV keys off the Main Event bout with the biggest combined following, not just any bout', () => {
  const state = baseState();
  const bigStar = { ...state.roster[0], followers: 50000 };
  const smallFighter = { ...state.roster[1], followers: 100 };
  const state2 = { ...state, roster: [bigStar, smallFighter, ...state.roster.slice(2)] };
  const bouts = [
    { fighterId: bigStar.id, opponent: { ...opponent, id: 'opp-big', followers: 40000 }, fightType: FIGHT_TYPES.MAIN_EVENT, gameplan: 'balanced' },
    { fighterId: smallFighter.id, opponent: { ...opponent, id: 'opp-small', followers: 50 }, fightType: FIGHT_TYPES.MAIN_EVENT, gameplan: 'balanced' },
  ];
  const next = gameReducer(state2, { type: 'BOOK_CARD', venue, bouts, isPPV: true });
  const card = next.cards[0];
  expect(card.ppvBuys).toBe(ppvBuys(state2.prestige, 90000));
});

test('BOOK_CARD ignores the PPV flag when there is no Main Event bout to headline it', () => {
  const state = baseState();
  const bouts = [{ fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.SHOWCASE, gameplan: 'balanced' }];
  const next = gameReducer(state, { type: 'BOOK_CARD', venue, bouts, isPPV: true });
  const card = next.cards[0];
  expect(card.isPPV).toBe(false);
  expect(next.funds).toBe(state.funds - venue.fee);
});

// ---------- Social media (Chirp) ----------

test('winning a fight posts a hype chirp from the booked fighter', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  const post = next.socialFeed.find(p => p.category === 'result');
  expect(post).toBeTruthy();
  expect(post.fighterId).toBe('champ1');
  expect(post.handle).toBe('@testchampion');
});

test('a resentful fighter may vent about the company after a fight, but stays on the roster', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  state = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, loyalty: 10, contractFightsLeft: 5 } : f)) };
  const fight = state.scheduledFights[0];
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0); // forces the venting chance to fire
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  spy.mockRestore();
  expect(next.socialFeed.some(p => p.category === 'beef' && p.fighterId === 'champ1')).toBe(true);
});

test('a content fighter does not vent about the company', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  state = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, loyalty: LOYALTY_BASELINE, contractFightsLeft: 5 } : f)) };
  const fight = state.scheduledFights[0];
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0); // even at the "always vent" roll, a content fighter has nothing to vent about
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  spy.mockRestore();
  expect(next.socialFeed.some(p => p.category === 'beef')).toBe(false);
});

test('the social feed is capped so it never grows unbounded over a long career', () => {
  const state = baseState();
  const resentfulState = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, loyalty: 10 } : f)) };
  const seeded = Array.from({ length: 150 }, (_, i) => ({ id: `sp${i}`, week: 1, fighterId: 'champ1', fighterName: 'Test Champion', text: 'x', category: 'result', likes: 1 }));
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99); // forces a refusal, which posts a beef chirp
  const next = gameReducer({ ...resentfulState, socialFeed: seeded }, { type: 'RENEW_CONTRACT', fighterId: 'champ1', fights: 3 });
  spy.mockRestore();
  expect(next.socialFeed.length).toBeLessThanOrEqual(100);
});

// ---------- Promotion tier ladder ----------

test('a fresh promotion starts at the bottom of the ladder', () => {
  const state = baseState();
  expect(currentPromotionTier(state).id).toBe(PROMOTION_TIERS[0].id);
});

test('a rung is not achieved until every one of its stipulations is met, prestige alone is not enough', () => {
  // Sky-high prestige, but baseState only has 3 signed fighters — the
  // very next rung (Local Circuit) needs 4+, so the ladder should not
  // budge no matter how much prestige is sitting there unused.
  const state = { ...baseState(), prestige: 999999 };
  expect(state.roster.length).toBeLessThan(4);
  expect(currentPromotionTier(state).id).toBe('regional');
  expect(tierRequirementsMet(state, PROMOTION_TIERS[1])).toBe(false);
});

test('the ladder climbs exactly one rung at a time even when prestige is far ahead of it', () => {
  const state = baseState();
  const fourthFighter = { ...state.roster[0], id: 'extra1' };
  const padded = { ...state, prestige: 999999, roster: [...state.roster, fourthFighter] };
  // Roster size clears Local Circuit's stipulation, but no title has been
  // won yet, so National Circuit's stipulation is still unmet — the climb
  // should stop there, not jump straight to whatever prestige could reach.
  expect(currentPromotionTier(padded).id).toBe('circuit');
});

test('promotionTierProgress reports live, per-requirement progress toward the very next rung', () => {
  const state = baseState();
  const progress = promotionTierProgress(state);
  expect(progress.current.id).toBe('regional');
  expect(progress.next.id).toBe('circuit');
  expect(progress.prestigeCurrent).toBe(state.prestige);
  expect(progress.prestigeTarget).toBe(PROMOTION_TIERS[1].minPrestige);
  expect(progress.requirements).toEqual([
    { metric: 'rosterSize', target: 4, label: 'Sign at least 4 fighters', current: state.roster.length, met: false },
  ]);
});

test('nextPromotionTier is null once every rung has been climbed', () => {
  // A prestige-only stub state that satisfies every tier's real-world
  // stipulation directly, so the top rung ("Sport's #1 Promotion") is the
  // one actually reached.
  const state = {
    ...baseState(),
    prestige: 999999,
    roster: Array.from({ length: 6 }, (_, i) => ({ ...baseState().roster[0], id: `r${i}`, overall: 16 })),
    titles: { FLW: { holderId: 'r0' }, LW: { holderId: 'r1' }, WW: { holderId: 'r2' }, MW: { holderId: 'r3' }, LHW: { holderId: 'r4' } },
    record: { wins: 500, losses: 0, draws: 0 },
    meta: { ...baseState().meta, ppvEventsHosted: 3 },
    rivals: baseState().rivals.map(r => ({ ...r, prestige: 1 })),
  };
  expect(currentPromotionTier(state).id).toBe('apex');
  expect(nextPromotionTier(state)).toBeNull();
});

test('purseForFight applies the promotion tier bonus on top of everything else', () => {
  const star = { purseFloor: 1000, followers: 0 };
  const flatVenue = { capacity: 5000 };
  const rate = attendanceRate(0, flatVenue.capacity);
  const venueMult = 1 + (flatVenue.capacity * rate) / 20000;
  const drawMult = drawMultiplier(0, 0);
  const expected = Math.round(1000 * 1 * venueMult * drawMult * 1.2);
  expect(purseForFight(star, { followers: 0 }, FIGHT_TYPES.SINGLE, flatVenue, 20)).toBe(expected);
});

test('purseForFight with no tier bonus argument behaves exactly as before', () => {
  const star = { purseFloor: 1000, followers: 500 };
  expect(purseForFight(star, { followers: 500 }, FIGHT_TYPES.SHOWCASE, venue)).toBe(purseForFight(star, { followers: 500 }, FIGHT_TYPES.SHOWCASE, venue, 0));
});

test('hosting a PPV event is tracked on the promotion, for the Major Promotion stipulation', () => {
  const state = baseState();
  expect(state.meta.ppvEventsHosted).toBe(0);
  const next = gameReducer(state, {
    type: 'CREATE_CARD', venue, fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.MAIN_EVENT, isPPV: true,
  });
  expect(next.meta.ppvEventsHosted).toBe(1);
});

test('findFighterAnywhere also looks in free agents and amateurs, not just the roster and world pool', () => {
  const freeAgent = { ...opponent, id: 'fa1' };
  const amateur = { ...opponent, id: 'am1' };
  const state = { ...baseState(), freeAgents: [freeAgent], amateurs: [amateur] };
  expect(findFighterAnywhere(state, 'fa1')).toBe(freeAgent);
  expect(findFighterAnywhere(state, 'am1')).toBe(amateur);
  expect(findFighterAnywhere(state, 'nope')).toBeNull();
});

// ---------- Post-fight bonuses ----------

test('potnChance is higher for an earlier finish than a later one', () => {
  expect(potnChance(1)).toBeGreaterThan(potnChance(2));
  expect(potnChance(2)).toBeGreaterThan(potnChance(3));
});

test('fotnChance favors a draw or a close decision over a clean unanimous one', () => {
  expect(fotnChance(null, true)).toBeGreaterThan(fotnChance('UD', false));
  expect(fotnChance('SD', false)).toBeGreaterThan(fotnChance('UD', false));
  expect(fotnChance('MD', false)).toBeGreaterThan(fotnChance('UD', false));
});

test('a finish win can land a Performance of the Night bonus on top of the purse', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0); // forces the bonus roll (and everything else) to succeed
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'KO', 'champ1');
  spy.mockRestore();
  const entry = next.fightHistory[0];
  expect(entry.bonus).toBe('potn');
  expect(entry.bonusAmount).toBeGreaterThan(0);
  expect(next.funds).toBe(state.funds + entry.earned + entry.bonusAmount + entry.sponsorEarned);
});

test('losing by finish never wins Performance of the Night — only the fighter who delivered it can', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0);
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'KO', 'opp1'); // the opponent gets the finish
  spy.mockRestore();
  expect(next.fightHistory[0].bonus).not.toBe('potn');
});

test('a split decision can land a Fight of the Night bonus even for the fighter who lost it', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0);
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'SD', 'opp1'); // champ1 loses a split decision
  spy.mockRestore();
  expect(next.fightHistory[0].bonus).toBe('fotn');
});

test('no bonus roll means no bonus at all', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0.999);
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  spy.mockRestore();
  expect(next.fightHistory[0].bonus).toBeNull();
  expect(next.fightHistory[0].bonusAmount).toBe(0);
});

// ---------- Sponsorship income ----------

test('sponsorIncome scales with followers, with a small token amount for a total unknown', () => {
  expect(sponsorIncome(0)).toBe(150);
  expect(sponsorIncome(10000)).toBe(Math.round(150 + 10000 * 0.04));
});

test('sponsor money is credited every fight regardless of the result', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  state = { ...state, roster: state.roster.map(f => (f.id === 'champ1' ? { ...f, followers: 10000 } : f)) };
  const fight = state.scheduledFights[0];
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99); // keep the bonus roll out of the way
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'opp1'); // champ1 loses
  spy.mockRestore();
  const entry = next.fightHistory[0];
  expect(entry.sponsorEarned).toBe(sponsorIncome(10000));
  expect(next.funds).toBe(state.funds + entry.earned + entry.sponsorEarned);
});

// ---------- Fighter callouts ----------

test('a big win can trigger a callout naming a specific opponent', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const bigName = { ...opponent, id: 'star1', followers: 90000, champion: false };
  state = { ...state, worldPool: { ...state.worldPool, FLW: [opponent, bigName] } };
  const fight = state.scheduledFights[0];
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0); // forces the callout roll to succeed
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  spy.mockRestore();
  expect(next.callouts).toHaveLength(1);
  expect(next.callouts[0]).toMatchObject({ fighterId: 'champ1', targetId: 'star1' });
  expect(next.socialFeed.some(p => p.category === 'callout')).toBe(true);
});

test('a callout prefers the division\'s rival champion over just the biggest following', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const bigName = { ...opponent, id: 'star1', followers: 90000, champion: false };
  const rivalChamp = { ...opponent, id: 'champ2', followers: 5000, champion: true };
  state = { ...state, worldPool: { ...state.worldPool, FLW: [opponent, bigName, rivalChamp] } };
  const fight = state.scheduledFights[0];
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0);
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  spy.mockRestore();
  expect(next.callouts[0].targetId).toBe('champ2');
});

test('winning does not always trigger a callout', () => {
  let state = bookMainEvent(withLiveOpponent(baseState()), 'champ1');
  const fight = state.scheduledFights[0];
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
  const next = resolveWithResult(state, fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  spy.mockRestore();
  expect(next.callouts).toHaveLength(0);
});

test('booking the exact matchup a fighter called out pays a prestige bonus and posts news', () => {
  const state = baseState();
  const existingCallout = { id: 'co1', fighterId: 'champ1', fighterName: 'Test Champion', targetId: 'opp1', targetName: 'Test Opponent', weightClass: 'FLW', week: 1 };
  const stateWithCallout = { ...state, callouts: [existingCallout] };
  const next = gameReducer(stateWithCallout, { type: 'SCHEDULE_FIGHT', fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.MAIN_EVENT, venue });
  expect(next.callouts).toHaveLength(0);
  expect(next.prestige).toBe(state.prestige + CALLOUT_PRESTIGE_BONUS);
  expect(next.news.some(n => n.title.includes('follows through'))).toBe(true);
});

test('booking a different opponent leaves an existing callout untouched', () => {
  const state = baseState();
  const existingCallout = { id: 'co1', fighterId: 'champ1', fighterName: 'Test Champion', targetId: 'someone-else', targetName: 'Someone Else', weightClass: 'FLW', week: 1 };
  const stateWithCallout = { ...state, callouts: [existingCallout] };
  const next = gameReducer(stateWithCallout, { type: 'SCHEDULE_FIGHT', fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.MAIN_EVENT, venue });
  expect(next.callouts).toHaveLength(1);
  expect(next.prestige).toBe(state.prestige);
});

test('an unfulfilled callout quietly expires after a while', () => {
  const state = baseState();
  const staleCallout = { id: 'co1', fighterId: 'champ1', fighterName: 'x', targetId: 'opp1', targetName: 'y', weightClass: 'FLW', week: state.week };
  let next = { ...state, callouts: [staleCallout] };
  for (let i = 0; i < CALLOUT_EXPIRY_WEEKS; i++) next = gameReducer(next, { type: 'ADVANCE_WEEK' });
  expect(next.callouts).toHaveLength(0);
});

test('a callout survives right up until it actually expires', () => {
  const state = baseState();
  const staleCallout = { id: 'co1', fighterId: 'champ1', fighterName: 'x', targetId: 'opp1', targetName: 'y', weightClass: 'FLW', week: state.week };
  let next = { ...state, callouts: [staleCallout] };
  for (let i = 0; i < CALLOUT_EXPIRY_WEEKS - 1; i++) next = gameReducer(next, { type: 'ADVANCE_WEEK' });
  expect(next.callouts).toHaveLength(1);
});

// ---------- Fight camps ----------

test('a booked fight defaults to Standard Camp, and rejects an unrecognized camp id', () => {
  const state = baseState();
  const next = gameReducer(state, { type: 'SCHEDULE_FIGHT', fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.MAIN_EVENT, venue, camp: 'nonsense' });
  expect(next.scheduledFights[0].camp).toBe('standard');
});

test('a hard camp is recorded on the booked fight and carried onto activeFight once it starts', () => {
  const state = gameReducer(withLiveOpponent(baseState()), { type: 'SCHEDULE_FIGHT', fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.MAIN_EVENT, venue, camp: 'hard' });
  const fight = state.scheduledFights[0];
  expect(fight.camp).toBe('hard');
  const next = gameReducer(state, { type: 'PREPARE_FIGHT_SIM', fightId: fight.id });
  expect(next.activeFight.camp).toBe('hard');
  expect(typeof next.activeFight.campInjured).toBe('boolean');
});

test('a camp injury sticks for the rest of the fight instead of being re-rolled every round', () => {
  const state = gameReducer(withLiveOpponent(baseState()), { type: 'SCHEDULE_FIGHT', fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.MAIN_EVENT, venue, camp: 'hard' });
  const fight = state.scheduledFights[0];
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0); // forces the camp injury to hit
  let next = gameReducer(state, { type: 'PREPARE_FIGHT_SIM', fightId: fight.id });
  expect(next.activeFight.campInjured).toBe(true);
  if (!next.activeFight.finished) {
    next = gameReducer(next, { type: 'ADVANCE_FIGHT_ROUND' });
    expect(next.activeFight.campInjured).toBe(true); // unchanged — not re-rolled round to round
  }
  spy.mockRestore();
});

// ---------- Ranked-fighter matchmaking pressure ----------

test('isNotableFighter recognizes overall, followers, or holding a title', () => {
  expect(isNotableFighter({ overall: NOTABLE_FIGHTER_OVERALL, followers: 0, title: null })).toBe(true);
  expect(isNotableFighter({ overall: 5, followers: 100000, title: null })).toBe(true);
  expect(isNotableFighter({ overall: 5, followers: 0, title: 'Flyweight' })).toBe(true);
  expect(isNotableFighter({ overall: 5, followers: 0, title: null })).toBe(false);
});

test('isMismatchedBooking flags a notable fighter fed a much weaker opponent, but never in a Main Event', () => {
  const star = { overall: NOTABLE_FIGHTER_OVERALL, followers: 0, title: null };
  const weakling = { overall: NOTABLE_FIGHTER_OVERALL - MISMATCH_OVERALL_GAP };
  expect(isMismatchedBooking(star, weakling, FIGHT_TYPES.SHOWCASE)).toBe(true);
  expect(isMismatchedBooking(star, weakling, FIGHT_TYPES.MAIN_EVENT)).toBe(false);
});

test('a mismatched booking costs extra loyalty on resolution, on top of the normal outcome', () => {
  // champ1 (overall 15) vs the opponent fixture (overall 10) is a 5-point
  // gap outside a Main Event — exactly the mismatch threshold.
  const state = bookShowcase(baseState(), 'champ1');
  const fight = state.scheduledFights[0];
  expect(fight.mismatch).toBe(true);
  const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99); // keep injury/bonus rolls out of the way
  const next = resolveWithResult(withLiveOpponent(state), fight.id, 'champ1', 'opp1', 'UD', 'champ1');
  spy.mockRestore();
  const champ1After = next.roster.find(f => f.id === 'champ1');
  // A win as a big enough favorite already costs loyalty (-3, per
  // loyaltyDeltaForFight); the mismatch penalty stacks another -4.
  expect(champ1After.loyalty).toBe(LOYALTY_BASELINE - 3 - 4);
});

// ---------- Legacy fights ----------

test('isLegacyFight flags a fighter within a couple years of the mandatory retirement age', () => {
  expect(isLegacyFight(RETIREMENT_AGE - 1)).toBe(true);
  expect(isLegacyFight(RETIREMENT_AGE - 5)).toBe(false);
});

test('a Main Event for a fighter nearing retirement books as a Legacy Fight with a purse bonus', () => {
  const state = baseState();
  const veteran = { ...state.roster[0], age: RETIREMENT_AGE - 1 };
  const stateWithVeteran = { ...state, roster: [veteran, ...state.roster.slice(1)] };
  const next = gameReducer(stateWithVeteran, { type: 'SCHEDULE_FIGHT', fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.MAIN_EVENT, venue });
  const fight = next.scheduledFights[0];
  expect(fight.isLegacyFight).toBe(true);
  const basePurse = purseForFight(veteran, opponent, FIGHT_TYPES.MAIN_EVENT, venue, currentPromotionTier(stateWithVeteran).purseBonusPct);
  expect(fight.purse).toBe(Math.round(basePurse * 1.6 * (1 + LEGACY_FIGHT_PURSE_BONUS_PCT / 100)));
});

test('a Showcase fight for the same veteran is never flagged as a Legacy Fight', () => {
  const state = baseState();
  const veteran = { ...state.roster[0], age: RETIREMENT_AGE - 1 };
  const stateWithVeteran = { ...state, roster: [veteran, ...state.roster.slice(1)] };
  const next = gameReducer(stateWithVeteran, { type: 'SCHEDULE_FIGHT', fighterId: 'champ1', opponent, fightType: FIGHT_TYPES.SHOWCASE, venue });
  expect(next.scheduledFights[0].isLegacyFight).toBe(false);
});
