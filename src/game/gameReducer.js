import {
  WEIGHT_CLASSES, WEIGHT_CLASS_MAP, FIGHT_TYPES, RIVAL_PROMOTIONS, PRESTIGE_TIERS,
  GYM_LEVELS, rosterLimitForGym, RETIREMENT_AGE, AMATEUR_SIGN_COST, AMATEUR_PROMOTION_WINS, AMATEUR_POOL_LIMIT,
  WEEKS_PER_YEAR, STAT_KEYS, MAX_STAT, trainingCost,
  CONTRACT_LENGTH_OPTIONS, DEFAULT_CONTRACT_FIGHTS, contractCost, WEIGHT_MOVE_COST, BANKRUPTCY_WEEKS,
  CARD_MAX_FIGHTS, SUPER_FIGHT_SANCTION_FEE, GAMEPLANS, POACH_COST_MULTIPLIER, freeAgentCost,
  cityTierForPopulation, startingFundsForPopulation, effectiveOverall, ageCurveMultiplier,
  LOYALTY_BASELINE, INACTIVE_WEEKS_BEFORE_FRUSTRATION, clampLoyalty, renewalAcceptChance, loyaltyStatus, poachChance,
  PPV_PRICE_OPTIONS, DEFAULT_PPV_PRICE, PPV_PRODUCTION_FEE,
} from './constants';
import { makeStartingRoster, makeOpponentPool, makeFighter } from './generateFighter';
import { CITIES, cityLabel, randomFighterName } from './namePool';
import { simulateFight, initFightSession, simulateFightRound, computeFightResult } from './engine';

const COACH_SPECIALTIES = STAT_KEYS;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function clampStat(n) {
  return Math.max(1, Math.min(20, n));
}

// A fighter's age curve (see ageCurveMultiplier in constants.js) scales
// their EFFECTIVE stats for actual combat — a declining veteran's OVR
// being lower than their raw training suggests has to be real in the cage,
// not just a cosmetic number. Trained stats on the Roster screen are never
// touched by this; it's applied fresh, right before a fighter steps in.
function applyAgeCurve(fighter) {
  const mult = ageCurveMultiplier(fighter.age);
  if (mult === 1) return fighter;
  const stats = fighter.stats;
  return {
    ...fighter,
    stats: {
      striking: clampStat(Math.round(stats.striking * mult)),
      wrestling: clampStat(Math.round(stats.wrestling * mult)),
      submission: clampStat(Math.round(stats.submission * mult)),
      chin: clampStat(Math.round(stats.chin * mult)),
      cardio: clampStat(Math.round(stats.cardio * mult)),
    },
  };
}

// A pre-fight gameplan reshapes the booked fighter's effective stats for
// this one fight — a real tradeoff, applied only to the fighter you're
// controlling (the opponent fights their natural game either way). The
// fight engine itself never changes; this is a stat transform in front of it.
function applyGameplan(fighter, gameplanId) {
  const stats = fighter.stats;
  if (gameplanId === 'pressure') {
    return { ...fighter, stats: { ...stats, striking: clampStat(stats.striking + 2), cardio: clampStat(stats.cardio - 2) } };
  }
  if (gameplanId === 'patient') {
    return { ...fighter, stats: { ...stats, chin: clampStat(stats.chin + 1), cardio: clampStat(stats.cardio + 1), striking: clampStat(stats.striking - 1) } };
  }
  if (gameplanId === 'finish') {
    return { ...fighter, stats: { ...stats, submission: clampStat(stats.submission + 2), striking: clampStat(stats.striking + 1), chin: clampStat(stats.chin - 2) } };
  }
  return fighter;
}

// How a single fight shifts a fighter's loyalty — a real opportunity
// (a title shot, a marquee crossover) is valued regardless of outcome; a
// stay-busy squash match where they were never really tested wears thin;
// getting thrown in as a huge underdog is either a star-making moment (if
// it pays off) or feels like being fed to the wolves (if it doesn't); and
// getting hurt in there on top of it reads as bad management either way.
function loyaltyDeltaForFight({ winProbability, isTitle, isSuperFight, won, drew, injured }) {
  let delta;
  if (isTitle) delta = won ? 12 : drew ? 3 : -2;
  else if (isSuperFight) delta = won ? 6 : drew ? 2 : -1;
  else if (winProbability >= 0.75) delta = -3;
  else if (winProbability <= 0.25) delta = won ? 10 : -8;
  else delta = won ? 2 : drew ? 0 : -2;
  if (injured) delta -= 5;
  return delta;
}

// A fighter's parting words when they fight out their deal and walk —
// flavored by how they actually feel about the way they were managed.
function departureFlavor(name, promoName, loyalty) {
  const tier = loyaltyStatus(loyalty).id;
  if (tier === 'resentful') return `${name} fought out their deal and bolts to ${promoName} without a second thought — they'd wanted out for a long time.`;
  if (tier === 'frustrated') return `${name} fought out their deal and walks to ${promoName}, tired of how they'd been booked.`;
  if (tier === 'loyal') return `${name} fought out their deal and walks to ${promoName} — reluctantly, by their own account, but a contract's a contract.`;
  return `${name} fought out their deal and walks to ${promoName} as a free agent.`;
}

// ---------- Social media (Chirp) ----------
// A lightweight, auto-generated social feed — fighters react to their own
// results, air grievances with management when they're unhappy (tied
// directly to the loyalty system), and announce contract news, the same
// way real fighters use social media. Every post is template text filled
// in from state that already exists; nothing here is tracked long-term
// beyond the feed itself.

function chirpHandle(name) {
  const clean = (name || 'fighter').replace(/[^a-zA-Z]/g, '').toLowerCase();
  return `@${clean || 'fighter'}`;
}

function makeChirp(state, { fighter, text, category }) {
  return {
    id: `sp${Date.now()}_${randInt(0, 999999)}`,
    week: state.week,
    fighterId: fighter.id,
    fighterName: fighter.name,
    weightClass: fighter.weightClass,
    handle: chirpHandle(fighter.name),
    text,
    category,
    likes: randInt(40, 6000),
  };
}

function pushChirp(feed, chirp, cap = 100) {
  return [chirp, ...(feed || [])].slice(0, cap);
}

const WIN_HYPE_CHIRPS = [
  opp => `Never doubted it for a second. Ran through ${opp} exactly like I said I would. Who's next? 🔥`,
  opp => `That's what happens when you step in there with a real one. RIP to ${opp}'s hype train.`,
  opp => `Business as usual. ${opp} found out the hard way. 🥊`,
];

const WIN_UPSET_CHIRPS = [
  opp => `EVERYBODY had me losing to ${opp} and I just shut the whole building up. 🐐`,
  opp => `They said ${opp} was walking through me. Scoreboard don't lie. 💰`,
  opp => `Underdog my whole life, doubted my whole life. Remember this one.`,
];

const LOSS_RESPECTFUL_CHIRPS = [
  opp => `Credit to ${opp}, they got the job done tonight. Back to the drawing board.`,
  opp => `Hats off to ${opp}. I'll be better next time out, that's a promise.`,
];

const LOSS_UPSET_CHIRPS = [
  () => `I want the rematch. Everybody knows that wasn't the real me tonight.`,
  () => `Can't believe that just happened. That's on me, I'll fix it in the gym.`,
];

const DRAW_CHIRPS = [
  opp => `Thought I did more than enough against ${opp} honestly. Judges watching a different fight than me.`,
];

const LOYALTY_FRUSTRATED_CHIRPS = [
  () => `Some of us putting our bodies on the line for real disrespect behind closed doors. Y'all know who I'm talking about. 👀`,
  () => `Funny how the people signing the checks never actually watch the film.`,
  () => `Ain't naming names but a few fighters on this roster deserve better booking. Just saying.`,
];

const LOYALTY_RESENTFUL_CHIRPS = [
  () => `Given this company everything and this is the thanks I get? Nah. Remember this.`,
  () => `Booked like a sacrifice and they expect loyalty back. Make it make sense.`,
];

const CONTRACT_REFUSAL_CHIRPS = [
  () => `Turned down the new deal. If they think I'm signing off on how I've been treated, they've got another thing coming.`,
];

const DEPARTURE_CHIRPS = [
  promo => `Contract's up. Excited for this next chapter with ${promo}. New beginnings 🙏`,
  promo => `Officially heading to ${promo}. Thanks for the memories, I guess.`,
];

const LOYAL_RENEWAL_CHIRPS = [
  () => `New deal signed. Still running it back with the team that's always had my back. 💪`,
];

const PPV_HYPE_CHIRPS = [
  opp => `PPV week. ${opp} better enjoy the attention while it lasts. See you at the top. 🎬`,
  opp => `They're paying to watch me do this to ${opp}. Worth every penny.`,
];

function fightReactionChirp(state, { fighter, opponentName, fighterWon, draw, winProbability }) {
  if (!fighter) return null;
  if (draw) return makeChirp(state, { fighter, category: 'result', text: pick(DRAW_CHIRPS)(opponentName) });
  if (fighterWon) {
    const wasUnderdog = (winProbability ?? 0.5) <= 0.35;
    const template = pick(wasUnderdog ? WIN_UPSET_CHIRPS : WIN_HYPE_CHIRPS);
    return makeChirp(state, { fighter, category: 'result', text: template(opponentName) });
  }
  const wasHeavyFavorite = (winProbability ?? 0.5) >= 0.65;
  const template = pick(wasHeavyFavorite ? LOSS_UPSET_CHIRPS : LOSS_RESPECTFUL_CHIRPS);
  return makeChirp(state, { fighter, category: 'result', text: template(opponentName) });
}

function loyaltyBeefChirp(state, fighter, loyalty) {
  const tier = loyaltyStatus(loyalty).id;
  if (tier !== 'frustrated' && tier !== 'resentful') return null;
  if (Math.random() >= 0.4) return null; // not every unhappy fighter vents every single time out
  const template = pick(tier === 'resentful' ? LOYALTY_RESENTFUL_CHIRPS : LOYALTY_FRUSTRATED_CHIRPS);
  return makeChirp(state, { fighter, category: 'beef', text: template() });
}

// Simulates one round (mode 'one', used when the player is watching and
// gets a between-rounds gameplan check-in) or every remaining round back
// to back (mode 'all', used for "Skip to Result" and for a fully-resolved
// fight when autoSkipFights is on). Returns the newly-simulated round(s),
// the final stoppage descriptor if the fight ended, and the carried-over
// session state for whatever rounds remain after that.
function runFightRounds(fighter, opponent, gameplanId, session, fromRound, totalRounds, mode) {
  const gameplanFighter = applyGameplan(applyAgeCurve(fighter), gameplanId);
  const ageAdjustedOpponent = applyAgeCurve(opponent);
  const roundsOut = [];
  let stoppedOut = null;
  let s = session;
  let r = fromRound;
  do {
    const { roundData, stopped, session: next } = simulateFightRound(s, gameplanFighter, ageAdjustedOpponent, r);
    s = next;
    roundsOut.push(roundData);
    stoppedOut = stopped;
    r++;
  } while (mode === 'all' && !stoppedOut && r <= totalRounds);
  return { roundsData: roundsOut, stopped: stoppedOut, session: s };
}


const TITLE_ELIGIBLE_OVERALL = 11;

// A retiring fighter earns a Hall of Fame plaque for a genuinely great
// career — a long list of wins, elite skill, or having worn a belt.
function isHallOfFameWorthy(fighter) {
  return fighter.record.wins >= 20 || fighter.overall >= 15 || !!fighter.title;
}

function hallOfFameEntry(fighter, week) {
  return {
    id: fighter.id,
    name: fighter.name,
    nationality: fighter.nationality,
    weightClass: fighter.weightClass,
    record: fighter.record,
    followers: fighter.followers,
    finalTitle: fighter.title || null,
    retiredWeek: week,
  };
}

// A booked Main Event is for your promotion's own belt when the fighter is
// good enough to be a credible titleholder and either the division's belt
// is vacant or they're already your champion defending it. (Rival-held
// belts are a separate, unrelated thing — see RIVAL_PROMOTIONS.)
export function isTitleFight(state, fighter) {
  if (!fighter || fighter.overall < TITLE_ELIGIBLE_OVERALL) return false;
  const holder = state.titles?.[fighter.weightClass];
  return !holder || holder.holderId === fighter.id;
}

export function prestigeTierLabel(prestige) {
  let label = PRESTIGE_TIERS[0].label;
  for (const t of PRESTIGE_TIERS) {
    if (prestige >= t.min) label = t.label;
  }
  return label;
}

// Champions + a slice of each division's talent belong to rival promotions
// (not signable) — the rest are free agents you can scout, sign, or book.
function assignPromotions(worldPool) {
  let promoCursor = 0;
  const pool = {};
  Object.keys(worldPool).forEach(wc => {
    const fighters = [...worldPool[wc]].sort((a, b) => b.overall - a.overall);
    pool[wc] = fighters.map((f, i) => {
      if (i === 0) {
        const promo = RIVAL_PROMOTIONS[promoCursor % RIVAL_PROMOTIONS.length];
        promoCursor++;
        // divisional champions are the face of their promotion — give them
        // a following to match
        return { ...f, promotionId: promo.id, champion: true, followers: f.followers + randInt(15000, 40000) };
      }
      if (i <= 3 && Math.random() < 0.55) {
        const promo = pick(RIVAL_PROMOTIONS);
        return { ...f, promotionId: promo.id, champion: false };
      }
      return f;
    });
  });
  return pool;
}

function buildWorldPool() {
  const pool = {};
  WEIGHT_CLASSES.forEach(wc => {
    pool[wc.id] = makeOpponentPool(wc.id, 12);
  });
  return assignPromotions(pool);
}

function makeFreeAgent() {
  const f = makeFighter({ level: Math.random() < 0.3 ? 'contender' : 'gatekeeper' });
  return { ...f, weeksLeft: randInt(4, 8) };
}

// `hq` is the id of a CITIES entry (Create Career passes the id the player
// picked). Falls back to a matching city name, then a random city if
// nothing was passed, then — for callers that hand in an arbitrary label
// that doesn't match any real city (e.g. test fixtures) — keeps that label
// as-is with the default (unscaled) resource tier.
function resolveHq(hq) {
  const entry = hq ? (CITIES.find(c => c.id === hq) || CITIES.find(c => c.city === hq)) : pick(CITIES);
  if (entry) return { label: cityLabel(entry), pop: entry.pop };
  return { label: hq, pop: 500000 }; // unrecognized label (e.g. test fixtures) — default, unscaled tier
}

export function newCareerState({ managerName, promotionName, hq, selectedFighters, championFighterId }) {
  let roster = (selectedFighters && selectedFighters.length ? selectedFighters : makeStartingRoster(3))
    .map(f => ({ ...f, signed: true, contractFightsLeft: DEFAULT_CONTRACT_FIGHTS, loyalty: LOYALTY_BASELINE, weeksSinceLastFight: 0 }));

  // Optionally start with one of your drafted fighters already holding
  // their division's belt, instead of every title starting vacant.
  let titles = {};
  const champ = championFighterId ? roster.find(f => f.id === championFighterId) : null;
  if (champ) {
    const wcName = WEIGHT_CLASS_MAP[champ.weightClass]?.name;
    titles = { [champ.weightClass]: { holderId: champ.id, holderName: champ.name, defenses: 0 } };
    roster = roster.map(f => (f.id === champ.id ? { ...f, title: wcName } : f));
  }

  // A bigger home city means a bigger local market — more funds to launch
  // with, scaled by the HQ's population tier (see cityTierForPopulation).
  const { label: hqLabel, pop: hqPop } = resolveHq(hq);
  const funds = startingFundsForPopulation(hqPop);

  return {
    meta: {
      managerName: managerName || 'Player',
      promotionName: promotionName || `${managerName}'s MMA`,
      hq: hqLabel,
      hqTier: cityTierForPopulation(hqPop).id,
      gymLevel: 1,
      coachName: randomFighterName().name,
      coachSpecialty: pick(COACH_SPECIALTIES),
      brokeWeeks: 0,
      totalEarnings: 0,
      titlesWon: 0,
      autoSkipFights: false,
      createdAt: Date.now(),
    },
    week: 1,
    funds,
    record: { wins: 0, losses: 0, draws: 0 },
    prestige: champ ? 90 : 50,
    titles, // weightClassId -> { holderId, holderName, defenses } | null (vacant until a Main Event is booked)
    rivals: RIVAL_PROMOTIONS.map(p => ({ ...p, prestige: p.basePrestige })),
    freeAgents: [makeFreeAgent(), makeFreeAgent()],
    roster,
    amateurs: [],
    hallOfFame: [],
    worldPool: buildWorldPool(),
    scheduledFights: [],
    cards: [],
    fightHistory: [],
    socialFeed: [],
    news: [
      {
        id: 'n0',
        week: 1,
        category: 'welcome',
        title: 'Welcome to Fight Empire',
        body: champ
          ? `${promotionName || 'Your promotion'} opens its doors in ${hqLabel} with ${champ.name} already champion at ${WEIGHT_CLASS_MAP[champ.weightClass]?.name}. Sign fighters, book cards, and climb past the sport's giants.`
          : `${promotionName || 'Your promotion'} opens its doors in ${hqLabel}. Sign fighters, book cards, and climb past the sport's giants.`,
      },
    ],
    activeFight: null,
    ui: { screen: 'hub' },
  };
}

function findFighterAnywhere(state, fighterId) {
  const own = state.roster.find(f => f.id === fighterId);
  if (own) return own;
  for (const wc of Object.keys(state.worldPool)) {
    const found = state.worldPool[wc].find(f => f.id === fighterId);
    if (found) return found;
  }
  return null;
}

// Combined social following of both fighters drives ticket/PPV demand —
// a bigger draw fills more seats and pushes the gate (and everyone's cut
// of it) up, on top of what the venue and card type already set.
export function drawMultiplier(fighterFollowers = 0, opponentFollowers = 0) {
  const combined = fighterFollowers + opponentFollowers;
  return 1 + Math.min(1.5, combined / 40000);
}

// A rough pre-fight estimate for display (odds shown before booking) and
// for scaling how much a win/loss is worth afterward. This is NOT wired
// into the actual simulation — simulateFight runs its own independent,
// round-by-round randomness, so a big favorite can absolutely drop a
// decision to an underdog. This is just the "expected" read on paper.
export function winProbability(fighter, opponent) {
  if (!fighter || !opponent) return 0.5;
  const diff = fighter.overall - opponent.overall;
  const p = 1 / (1 + Math.exp(-diff / 4));
  return Math.max(0.05, Math.min(0.95, p));
}

// Beating a fighter you were expected to lose to (or losing to one you
// were expected to beat) moves prestige more than a routine result — a
// "stay busy" win over a heavy underdog barely counts, and an expected
// loss to a much better opponent barely stings.
export function prestigeUpsetFactor(preFightOdds, won) {
  const odds = typeof preFightOdds === 'number' ? preFightOdds : 0.5;
  const swing = won ? (0.5 - odds) : (odds - 0.5);
  return Math.max(0.4, Math.min(2.4, 1 + swing * 2.4));
}

// A local walk-up crowd shows up to any sanctioned fight regardless of who's
// on the poster — a small hall fills up on curiosity alone, but a stadium
// needs real star power on top of it to look like anything but empty seats
// on camera. Same formula for every venue tier, from a 600-seat hall to an
// 80,000-seat stadium — it's just relative to whatever capacity you booked.
const BASE_LOCAL_DRAW = 400;

export function attendanceRate(combinedFollowers, capacity) {
  if (!capacity) return 1;
  return Math.max(0, Math.min(1, (BASE_LOCAL_DRAW + combinedFollowers) / capacity));
}

export function attendanceStatus(rate) {
  if (rate >= 1) return { id: 'sold-out', label: 'Sold Out', flavor: 'Turned fans away at the door — an electric atmosphere.' };
  if (rate >= 0.8) return { id: 'packed', label: 'Packed House', flavor: 'The place will be rocking all night.' };
  if (rate >= 0.5) return { id: 'solid', label: 'Solid Crowd', flavor: 'A lively, respectable turnout.' };
  if (rate >= 0.2) return { id: 'modest', label: 'Modest Turnout', flavor: 'Plenty of empty seats, but a crowd showed up.' };
  return { id: 'sparse', label: 'Sparse Crowd', flavor: 'This venue will look embarrassingly empty on camera.' };
}

export function purseForFight(fighter, opponent, type, venue) {
  const base = fighter.purseFloor;
  const typeMult = type === FIGHT_TYPES.MAIN_EVENT ? 2.4 : type === FIGHT_TYPES.SHOWCASE ? 1.3 : 1;
  const combinedFollowers = (fighter.followers || 0) + (opponent?.followers || 0);
  // A well-matched booking (attendance at or near 100%) pays exactly what
  // the venue's raw capacity always implied — only an actual mismatch (a
  // huge room with no draw to fill it) gets docked, so this never nerfs a
  // fight that was already going to sell the building out.
  const rate = attendanceRate(combinedFollowers, venue.capacity);
  const venueMult = 1 + (venue.capacity * rate) / 20000;
  const drawMult = drawMultiplier(fighter.followers, opponent?.followers);
  return Math.round(base * typeMult * venueMult * drawMult);
}

// PPV buys come from your own promotion's reach (prestige — your existing
// subscriber base and brand) plus the headliner's own pull (their combined
// social following) — a tiny regional outfit with two unknowns barely
// sells a broadcast, a major promotion headlined by real stars can do
// real business. This is separate from gate attendance (drawMultiplier /
// attendanceRate above) — a PPV is bought from home, not limited by any
// venue's seat count.
export function ppvBuys(prestige, headlinerFollowers) {
  return Math.max(0, Math.round(50 + prestige * 0.8 + headlinerFollowers * 0.06));
}

// Your cut after the platform's split and production overhead.
export function ppvRevenue(buys, price) {
  return Math.round(buys * price * 0.45);
}

// Shared by CREATE_CARD (a single Main Event booked as its own card) and
// BOOK_CARD (the multi-bout card builder) so the PPV math and news/social
// beat never drift between the two paths. Revenue is credited up front,
// at booking time — the money from buys comes in before the card ever
// airs, same as it does in real life.
function resolvePPV(state, { wantsPPV, ppvPrice, headlinerA, headlinerB }) {
  if (!wantsPPV || !headlinerA || !headlinerB) {
    return { productionFee: 0, revenue: 0, news: null, cardFields: { isPPV: false, ppvPrice: null, ppvBuys: 0, ppvRevenue: 0 } };
  }
  const price = PPV_PRICE_OPTIONS.includes(ppvPrice) ? ppvPrice : DEFAULT_PPV_PRICE;
  const headlinerFollowers = (headlinerA.followers || 0) + (headlinerB.followers || 0);
  const buys = ppvBuys(state.prestige, headlinerFollowers);
  const revenue = ppvRevenue(buys, price);
  const news = {
    id: `n${Date.now()}_ppv`,
    week: state.week,
    category: 'ppv',
    title: `${headlinerA.name} vs ${headlinerB.name} announced as a PPV event`,
    body: `Early projections have ${buys.toLocaleString()} buys at $${price} — ${state.meta.promotionName} banks $${revenue.toLocaleString()} from the broadcast alone.`,
  };
  return { productionFee: PPV_PRODUCTION_FEE, revenue, news, cardFields: { isPPV: true, ppvPrice: price, ppvBuys: buys, ppvRevenue: revenue } };
}

// Builds one scheduled-fight record — shared by every booking path
// (Single Fight, a new card, adding to an existing card, or the
// multi-bout card builder) so the shape never drifts between them.
function buildFightRecord(state, { fighterId, fighter, opponent, fightType, venue, gameplan, cardId, weeksOut, week }) {
  const isSuperFight = !!opponent.promotionId;
  const titleFight = fightType === FIGHT_TYPES.MAIN_EVENT && isTitleFight(state, fighter);
  const fight = {
    id: `f${Date.now()}_${randInt(0, 9999)}`,
    fighterId,
    opponentId: opponent.id,
    opponentName: opponent.name,
    type: fightType,
    venue,
    weeksOut,
    rounds: fightType === FIGHT_TYPES.MAIN_EVENT ? 5 : 3,
    purse: Math.round(purseForFight(fighter, opponent, fightType, venue) * (titleFight ? 1.6 : 1) * (isSuperFight ? 1.4 : 1)),
    isTitle: titleFight,
    isSuperFight,
    winProbability: winProbability(fighter, opponent),
    gameplan: GAMEPLANS.some(g => g.id === gameplan) ? gameplan : 'balanced',
    createdWeek: week,
  };
  if (cardId) fight.cardId = cardId;
  return fight;
}

function costForFight(type, venue) {
  return type === FIGHT_TYPES.SINGLE ? 0 : venue.fee;
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      // Backfill fields added after some saves were created, so an old
      // save doesn't crash on screens that expect them to exist.
      return {
        ...action.state,
        amateurs: action.state.amateurs || [],
        hallOfFame: action.state.hallOfFame || [],
        cards: action.state.cards || [],
        socialFeed: action.state.socialFeed || [],
        roster: (action.state.roster || []).map(f => ({
          contractFightsLeft: DEFAULT_CONTRACT_FIGHTS,
          loyalty: LOYALTY_BASELINE,
          weeksSinceLastFight: 0,
          ...f,
        })),
        meta: action.state.meta
          ? {
              gymLevel: 1,
              coachName: randomFighterName().name,
              coachSpecialty: pick(COACH_SPECIALTIES),
              brokeWeeks: 0,
              totalEarnings: 0,
              titlesWon: 0,
              autoSkipFights: false,
              ...action.state.meta,
            }
          : action.state.meta,
      };

    case 'SET_SCREEN':
      return { ...state, ui: { ...state.ui, screen: action.screen, params: action.params || null } };

    case 'SIGN_SCOUTED_PROSPECT': {
      const cost = 1500;
      const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
      if (!action.fighter || state.funds < cost || state.roster.length >= rosterLimit) return state;
      const prospect = { ...action.fighter, signed: true, contractFightsLeft: DEFAULT_CONTRACT_FIGHTS, loyalty: LOYALTY_BASELINE, weeksSinceLastFight: 0 };
      return {
        ...state,
        funds: state.funds - cost,
        roster: [...state.roster, prospect],
        news: [{ id: `n${Date.now()}`, week: state.week, category: 'signing', title: `${state.meta.promotionName} signs ${prospect.name}`, body: `A new ${WEIGHT_CLASSES.find(w => w.id === prospect.weightClass).name} prospect joins the roster.` }, ...state.news],
      };
    }

    case 'SIGN_FREE_AGENT': {
      const agent = state.freeAgents.find(f => f.id === action.fighterId);
      if (!agent) return state;
      const cost = freeAgentCost(agent);
      const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
      if (state.funds < cost || state.roster.length >= rosterLimit) return state;
      const { weeksLeft, ...fighter } = agent;
      return {
        ...state,
        funds: state.funds - cost,
        roster: [...state.roster, { ...fighter, signed: true, contractFightsLeft: DEFAULT_CONTRACT_FIGHTS, loyalty: LOYALTY_BASELINE, weeksSinceLastFight: 0 }],
        freeAgents: state.freeAgents.filter(f => f.id !== agent.id),
        prestige: state.prestige + 15,
        news: [{ id: `n${Date.now()}`, week: state.week, category: 'signing', title: `${state.meta.promotionName} signs free agent ${fighter.name}`, body: `${fighter.name} turned down interest from rival promotions to join ${state.meta.promotionName}.` }, ...state.news],
      };
    }

    case 'POACH_FIGHTER': {
      const { fighterId } = action;
      const targetWc = Object.keys(state.worldPool).find(wc => state.worldPool[wc].some(f => f.id === fighterId));
      if (!targetWc) return state;
      const target = state.worldPool[targetWc].find(f => f.id === fighterId);
      if (!target || !target.promotionId) return state;
      const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
      if (state.roster.length >= rosterLimit) return state;
      const cost = Math.round(target.purseFloor * POACH_COST_MULTIPLIER);
      if (state.funds < cost) return state;
      const rivalPromo = state.rivals.find(r => r.id === target.promotionId);
      const targetLoyalty = target.loyalty ?? LOYALTY_BASELINE;
      const chance = poachChance(state.prestige - (rivalPromo?.prestige || 0), targetLoyalty);
      if (Math.random() >= chance) {
        return {
          ...state,
          news: [{ id: `n${Date.now()}_poachfail`, week: state.week, category: 'rival', title: `Poach attempt on ${target.name} fails`, body: `${rivalPromo?.name || 'The rival camp'} isn't ready to let ${target.name} go — no charge for trying.` }, ...state.news],
        };
      }
      const { champion, promotionId, title, ...base } = target;
      const signed = { ...base, signed: true, promotionId: null, champion: false, title: null, contractFightsLeft: DEFAULT_CONTRACT_FIGHTS, loyalty: LOYALTY_BASELINE, weeksSinceLastFight: 0 };
      const poachBody = targetLoyalty < 35
        ? `${target.name} was already unhappy at ${rivalPromo?.name || 'their old promotion'} and jumps at the chance to join ${state.meta.promotionName}.`
        : `${target.name} leaves ${rivalPromo?.name || 'their promotion'} to join ${state.meta.promotionName}.`;
      return {
        ...state,
        funds: state.funds - cost,
        roster: [...state.roster, signed],
        worldPool: { ...state.worldPool, [targetWc]: state.worldPool[targetWc].filter(f => f.id !== fighterId) },
        news: [{ id: `n${Date.now()}_poach`, week: state.week, category: 'signing', title: `${state.meta.promotionName} poaches ${target.name} from ${rivalPromo?.name || 'a rival'}`, body: poachBody }, ...state.news],
      };
    }

    case 'UPGRADE_GYM': {
      const nextLevel = GYM_LEVELS.find(g => g.level === state.meta.gymLevel + 1);
      if (!nextLevel || state.funds < nextLevel.upgradeCost) return state;
      return {
        ...state,
        funds: state.funds - nextLevel.upgradeCost,
        meta: { ...state.meta, gymLevel: nextLevel.level },
        news: [{ id: `n${Date.now()}`, week: state.week, category: 'facility', title: `${state.meta.promotionName} expands its gym`, body: `Your facility upgrade raises the active roster limit to ${nextLevel.rosterLimit} fighters.` }, ...state.news],
      };
    }

    case 'SIGN_AMATEUR': {
      const amateurs = state.amateurs || [];
      if (!action.fighter || state.funds < AMATEUR_SIGN_COST || amateurs.length >= AMATEUR_POOL_LIMIT) return state;
      const signed = { ...action.fighter, signed: true, amateurRecord: { wins: 0, losses: 0 } };
      return {
        ...state,
        funds: state.funds - AMATEUR_SIGN_COST,
        amateurs: [...amateurs, signed],
      };
    }

    case 'PROMOTE_AMATEUR': {
      const amateurs = state.amateurs || [];
      const amateur = amateurs.find(a => a.id === action.fighterId);
      const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
      if (!amateur || amateur.amateurRecord.wins < AMATEUR_PROMOTION_WINS || state.roster.length >= rosterLimit) return state;
      const { amateurRecord, ...base } = amateur;
      // A strong amateur run carries a little polish into the pro debut.
      const overall = Math.min(20, base.overall + Math.min(3, amateurRecord.wins - AMATEUR_PROMOTION_WINS + 1));
      const prospect = { ...base, overall, signed: true, contractFightsLeft: DEFAULT_CONTRACT_FIGHTS, loyalty: LOYALTY_BASELINE, weeksSinceLastFight: 0, record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 } };
      return {
        ...state,
        roster: [...state.roster, prospect],
        amateurs: amateurs.filter(a => a.id !== amateur.id),
        news: [{ id: `n${Date.now()}`, week: state.week, category: 'signing', title: `${prospect.name} turns pro`, body: `${prospect.name} joins the pro roster after a ${amateurRecord.wins}-${amateurRecord.losses} amateur run.` }, ...state.news],
      };
    }

    case 'RETIRE_FIGHTER': {
      const fighter = state.roster.find(f => f.id === action.fighterId);
      if (!fighter) return state;
      const worthy = isHallOfFameWorthy(fighter);
      let titles = state.titles;
      if (titles[fighter.weightClass]?.holderId === fighter.id) {
        titles = { ...titles, [fighter.weightClass]: null };
      }
      const hallOfFame = worthy ? [hallOfFameEntry(fighter, state.week), ...(state.hallOfFame || [])] : (state.hallOfFame || []);
      const news = [{
        id: `n${Date.now()}_retire`,
        week: state.week,
        category: 'retirement',
        title: worthy ? `${fighter.name} retires — Hall of Fame` : `${fighter.name} retires`,
        body: `${fighter.name} steps away from competition, finishing ${fighter.record.wins}-${fighter.record.losses}-${fighter.record.draws}.${worthy ? ' A career worthy of the Fight Empire Hall of Fame.' : ''}`,
      }, ...state.news];
      return {
        ...state,
        roster: state.roster.filter(f => f.id !== fighter.id),
        titles,
        hallOfFame,
        news,
      };
    }

    case 'TRAIN_STAT': {
      const { fighterId, stat } = action;
      if (!STAT_KEYS.includes(stat)) return state;
      const fighter = state.roster.find(f => f.id === fighterId);
      if (!fighter || fighter.stats[stat] >= MAX_STAT) return state;
      const cost = trainingCost(fighter.stats[stat], state.meta.coachSpecialty === stat, fighter.age);
      if ((fighter.xp || 0) < cost) return state;
      const stats = { ...fighter.stats, [stat]: fighter.stats[stat] + 1 };
      return {
        ...state,
        roster: state.roster.map(f => (f.id === fighterId ? { ...f, stats, overall: effectiveOverall(stats, f.age), xp: f.xp - cost } : f)),
      };
    }

    case 'RENEW_CONTRACT': {
      const fighter = state.roster.find(f => f.id === action.fighterId);
      if (!fighter) return state;
      const fights = CONTRACT_LENGTH_OPTIONS.includes(action.fights) ? action.fights : DEFAULT_CONTRACT_FIGHTS;
      const loyalty = fighter.loyalty ?? LOYALTY_BASELINE;
      const cost = contractCost(fighter.purseFloor, fights, loyalty);
      if (state.funds < cost) return state;

      // A fighter who isn't happy with how you've managed them can just
      // say no — the worse it's been going, the more likely they walk
      // away from the table rather than sign back up.
      if (Math.random() >= renewalAcceptChance(loyalty)) {
        let socialFeed = state.socialFeed;
        if (loyalty < 35) socialFeed = pushChirp(socialFeed, makeChirp(state, { fighter, category: 'beef', text: pick(CONTRACT_REFUSAL_CHIRPS)() }));
        return {
          ...state,
          socialFeed,
          news: [{
            id: `n${Date.now()}_contractrefused`,
            week: state.week,
            category: 'poached',
            title: `${fighter.name} turns down your contract offer`,
            body: loyalty < 35
              ? `${fighter.name} isn't interested — they've made it clear they don't like how they've been booked lately.`
              : `${fighter.name} isn't ready to commit right now. No charge for asking — try again later.`,
          }, ...state.news],
        };
      }

      let socialFeed = state.socialFeed;
      if (loyalty >= 80) socialFeed = pushChirp(socialFeed, makeChirp(state, { fighter, category: 'signing', text: pick(LOYAL_RENEWAL_CHIRPS)() }));

      return {
        ...state,
        funds: state.funds - cost,
        socialFeed,
        // Locking in more fights together is itself a vote of confidence.
        roster: state.roster.map(f => (f.id === fighter.id ? { ...f, contractFightsLeft: fights, loyalty: clampLoyalty(loyalty + 5) } : f)),
      };
    }

    case 'MOVE_WEIGHT_CLASS': {
      const { fighterId, direction } = action;
      const fighter = state.roster.find(f => f.id === fighterId);
      if (!fighter || fighter.injuryWeeks > 0) return state;
      if (state.scheduledFights.some(f => f.fighterId === fighterId)) return state;
      if (state.funds < WEIGHT_MOVE_COST) return state;
      const idx = WEIGHT_CLASSES.findIndex(w => w.id === fighter.weightClass);
      // WEIGHT_CLASSES runs heaviest (index 0) to lightest — 'heavier' moves
      // toward index 0, 'lighter' moves toward the end.
      const targetIdx = direction === 'heavier' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= WEIGHT_CLASSES.length) return state;
      const newClass = WEIGHT_CLASSES[targetIdx];
      return {
        ...state,
        funds: state.funds - WEIGHT_MOVE_COST,
        roster: state.roster.map(f => (f.id === fighterId ? { ...f, weightClass: newClass.id, fatigue: Math.min(100, f.fatigue + 25) } : f)),
        news: [{
          id: `n${Date.now()}_move`,
          week: state.week,
          category: 'signing',
          title: `${fighter.name} moves to ${newClass.name}`,
          body: `${fighter.name} makes the jump to ${newClass.name} for $${WEIGHT_MOVE_COST.toLocaleString()}.`,
        }, ...state.news],
      };
    }

    case 'TOGGLE_AUTO_SKIP': {
      return { ...state, meta: { ...state.meta, autoSkipFights: !state.meta.autoSkipFights } };
    }

    case 'SCHEDULE_FIGHT': {
      const { fighterId, opponent, fightType, venue, gameplan } = action;
      const fighter = state.roster.find(f => f.id === fighterId);
      if (!fighter || !opponent || fighter.injuryWeeks > 0) return state;
      const cost = costForFight(fightType, venue);
      if (state.funds < cost) return state;
      const fight = buildFightRecord(state, { fighterId, fighter, opponent, fightType, venue, gameplan, weeksOut: randInt(2, 6), week: state.week });
      return {
        ...state,
        funds: state.funds - cost,
        scheduledFights: [...state.scheduledFights, fight],
      };
    }

    case 'CREATE_CARD': {
      const { venue, fighterId, opponent, fightType, gameplan, isPPV, ppvPrice } = action;
      const fighter = state.roster.find(f => f.id === fighterId);
      if (!fighter || !opponent || !venue || fighter.injuryWeeks > 0) return state;
      const sanctionFee = opponent.promotionId ? SUPER_FIGHT_SANCTION_FEE : 0;
      const wantsPPV = !!isPPV && fightType === FIGHT_TYPES.MAIN_EVENT;
      const ppv = resolvePPV(state, { wantsPPV, ppvPrice, headlinerA: fighter, headlinerB: opponent });
      const cost = venue.fee + sanctionFee + ppv.productionFee;
      if (state.funds < cost) return state;
      const cardId = `card${Date.now()}_${randInt(0, 9999)}`;
      const weeksOut = randInt(2, 6);
      const card = { id: cardId, venue, weeksOut, createdWeek: state.week, ...ppv.cardFields };
      const fight = buildFightRecord(state, { fighterId, fighter, opponent, fightType, venue, gameplan, cardId, weeksOut, week: state.week });
      const socialFeed = wantsPPV
        ? pushChirp(state.socialFeed, makeChirp(state, { fighter, category: 'ppv', text: pick(PPV_HYPE_CHIRPS)(opponent.name) }))
        : state.socialFeed;
      return {
        ...state,
        funds: state.funds - cost + ppv.revenue,
        cards: [...(state.cards || []), card],
        scheduledFights: [...state.scheduledFights, fight],
        socialFeed,
        news: ppv.news ? [ppv.news, ...state.news] : state.news,
      };
    }

    case 'ADD_FIGHT_TO_CARD': {
      const { cardId, fighterId, opponent, fightType, gameplan } = action;
      const card = (state.cards || []).find(c => c.id === cardId);
      const fighter = state.roster.find(f => f.id === fighterId);
      if (!card || !fighter || !opponent || fighter.injuryWeeks > 0) return state;
      if (state.scheduledFights.filter(f => f.cardId === cardId).length >= CARD_MAX_FIGHTS) return state;
      const sanctionFee = opponent.promotionId ? SUPER_FIGHT_SANCTION_FEE : 0;
      if (state.funds < sanctionFee) return state;
      const fight = buildFightRecord(state, { fighterId, fighter, opponent, fightType, venue: card.venue, gameplan, cardId, weeksOut: card.weeksOut, week: state.week });
      return {
        ...state,
        funds: state.funds - sanctionFee,
        scheduledFights: [...state.scheduledFights, fight],
      };
    }

    case 'BOOK_CARD': {
      const { venue, bouts, isPPV, ppvPrice } = action;
      if (!venue || !Array.isArray(bouts) || bouts.length === 0 || bouts.length > CARD_MAX_FIGHTS) return state;

      const seenFighterIds = new Set();
      let totalCost = venue.fee;
      const resolvedBouts = [];
      for (const bout of bouts) {
        const fighter = state.roster.find(f => f.id === bout.fighterId);
        if (!fighter || !bout.opponent || fighter.injuryWeeks > 0) return state;
        if (seenFighterIds.has(fighter.id)) return state; // no fighter twice on one card
        seenFighterIds.add(fighter.id);
        totalCost += bout.opponent.promotionId ? SUPER_FIGHT_SANCTION_FEE : 0;
        resolvedBouts.push({ fighter, opponent: bout.opponent, fightType: bout.fightType, gameplan: bout.gameplan });
      }

      // The headliner for PPV purposes is whichever Main Event bout on the
      // card draws the biggest combined following — a card needs at least
      // one to be sold as a PPV at all.
      const headliner = resolvedBouts
        .filter(b => b.fightType === FIGHT_TYPES.MAIN_EVENT)
        .reduce((best, b) => {
          const combined = (b.fighter.followers || 0) + (b.opponent.followers || 0);
          return !best || combined > best.combined ? { ...b, combined } : best;
        }, null);
      const wantsPPV = !!isPPV && !!headliner;
      const ppv = resolvePPV(state, { wantsPPV, ppvPrice, headlinerA: headliner?.fighter, headlinerB: headliner?.opponent });
      totalCost += ppv.productionFee;
      if (state.funds < totalCost) return state;

      const cardId = `card${Date.now()}_${randInt(0, 9999)}`;
      const weeksOut = randInt(2, 6);
      const card = { id: cardId, venue, weeksOut, createdWeek: state.week, ...ppv.cardFields };
      const fights = resolvedBouts.map(b => buildFightRecord(state, {
        fighterId: b.fighter.id, fighter: b.fighter, opponent: b.opponent, fightType: b.fightType,
        venue, gameplan: b.gameplan, cardId, weeksOut, week: state.week,
      }));

      const socialFeed = wantsPPV
        ? pushChirp(state.socialFeed, makeChirp(state, { fighter: headliner.fighter, category: 'ppv', text: pick(PPV_HYPE_CHIRPS)(headliner.opponent.name) }))
        : state.socialFeed;

      return {
        ...state,
        funds: state.funds - totalCost + ppv.revenue,
        cards: [...(state.cards || []), card],
        scheduledFights: [...state.scheduledFights, ...fights],
        socialFeed,
        news: ppv.news ? [ppv.news, ...state.news] : state.news,
      };
    }

    case 'CANCEL_FIGHT': {
      const cancelled = state.scheduledFights.find(f => f.id === action.fightId);
      const remaining = state.scheduledFights.filter(f => f.id !== action.fightId);
      const cards = cancelled?.cardId && !remaining.some(f => f.cardId === cancelled.cardId)
        ? (state.cards || []).filter(c => c.id !== cancelled.cardId)
        : (state.cards || []);
      return { ...state, scheduledFights: remaining, cards };
    }

    case 'ADVANCE_WEEK': {
      const week = state.week + 1;
      const cards = (state.cards || []).map(c => ({ ...c, weeksOut: Math.max(0, c.weeksOut - 1) }));
      const scheduledFights = state.scheduledFights.map(f => {
        if (f.cardId) {
          const card = cards.find(c => c.id === f.cardId);
          return { ...f, weeksOut: card ? card.weeksOut : Math.max(0, f.weeksOut - 1) };
        }
        return { ...f, weeksOut: Math.max(0, f.weeksOut - 1) };
      });
      const upkeep = 25 * state.roster.length;
      const funds = Math.max(0, state.funds - upkeep);
      const agedRoster = state.roster.map(f => {
        const age = week % WEEKS_PER_YEAR === 0 ? f.age + 1 : f.age;
        const weeksSinceLastFight = (f.weeksSinceLastFight ?? 0) + 1;
        const startingLoyalty = f.loyalty ?? LOYALTY_BASELINE;
        // Sitting on the shelf too long wears on a fighter; either way,
        // grievances (or extra goodwill) fade a little each week, drifting
        // back toward a neutral baseline rather than staying locked in.
        const inactivityPenalty = weeksSinceLastFight > INACTIVE_WEEKS_BEFORE_FRUSTRATION ? 1 : 0;
        const loyalty = clampLoyalty(startingLoyalty + (LOYALTY_BASELINE - startingLoyalty) * 0.03 - inactivityPenalty);
        return {
          ...f,
          fatigue: Math.max(0, f.fatigue - 15),
          injuryWeeks: Math.max(0, f.injuryWeeks - 1),
          age,
          // A birthday can nudge OVR before a single punch is thrown — the
          // age curve is always live, not just something training reveals.
          overall: age === f.age ? f.overall : effectiveOverall(f.stats, age),
          weeksSinceLastFight,
          loyalty,
        };
      });

      // Anyone who's aged into retirement leaves the roster — a genuinely
      // great career earns a Hall of Fame plaque, and a vacated belt goes
      // back on the table for someone else to win. Contracts don't run out
      // from time passing anymore — they count down per fight, so an
      // expiring deal is handled in RESOLVE_FIGHT instead.
      const news = [...state.news];
      let titles = state.titles;
      let hallOfFame = state.hallOfFame || [];
      const roster = [];
      agedRoster.forEach(f => {
        if (f.age >= RETIREMENT_AGE) {
          if (titles[f.weightClass]?.holderId === f.id) {
            titles = { ...titles, [f.weightClass]: null };
          }
          const worthy = isHallOfFameWorthy(f);
          if (worthy) hallOfFame = [hallOfFameEntry(f, week), ...hallOfFame];
          news.unshift({
            id: `n${Date.now()}_retire_${f.id}`,
            week,
            category: 'retirement',
            title: worthy ? `${f.name} retires — Hall of Fame` : `${f.name} retires`,
            body: `${f.name} hangs up the gloves at ${f.age}, finishing ${f.record.wins}-${f.record.losses}-${f.record.draws}.${worthy ? ' A career worthy of the Fight Empire Hall of Fame.' : ''}`,
          });
          return;
        }
        roster.push(f);
      });

      // Stay broke too many weeks running and the bank calls it.
      const brokeWeeks = funds === 0 ? (state.meta.brokeWeeks || 0) + 1 : 0;
      const bankrupt = brokeWeeks >= BANKRUPTCY_WEEKS;

      const rivals = state.rivals.map(rv => ({ ...rv, prestige: rv.prestige + randInt(rv.weeklyGrowth[0], rv.weeklyGrowth[1]) }));
      const avgOverall = roster.length ? roster.reduce((s, f) => s + f.overall, 0) / roster.length : 0;
      const prestige = state.prestige + Math.round(avgOverall / 4) + Math.min(5, Math.floor(funds / 15000));

      // Amateurs quietly pick up bouts on their own schedule, building
      // toward a pro promotion — no news noise, just their record ticking.
      const amateurs = (state.amateurs || []).map(a => {
        if (Math.random() >= 0.35) return a;
        const opponentStrength = randInt(3, 9);
        const won = a.overall + randInt(-3, 3) >= opponentStrength;
        const amateurRecord = { ...a.amateurRecord };
        if (won) amateurRecord.wins += 1;
        else amateurRecord.losses += 1;
        return { ...a, amateurRecord };
      });

      // free agents age; if their window closes, a rival scoops them up
      const stillFree = [];
      let worldPool = state.worldPool;
      state.freeAgents.forEach(agent => {
        const weeksLeft = agent.weeksLeft - 1;
        if (weeksLeft <= 0) {
          const promo = pick(state.rivals);
          worldPool = {
            ...worldPool,
            [agent.weightClass]: [...worldPool[agent.weightClass], { ...agent, promotionId: promo.id, champion: false, weeksLeft: undefined }],
          };
          news.unshift({ id: `n${Date.now()}_${agent.id}`, week, category: 'poached', title: `${agent.name} signs with ${promo.name}`, body: `${promo.name} moved fast to lock up ${agent.name} while you were still deciding.` });
        } else {
          stillFree.push({ ...agent, weeksLeft });
        }
      });
      let freeAgents = stillFree;
      if (freeAgents.length < 3 && Math.random() < 0.4) {
        freeAgents = [...freeAgents, makeFreeAgent()];
      }

      // light flavor news from the rival landscape
      if (Math.random() < 0.12) {
        const promo = pick(state.rivals);
        news.unshift({ id: `n${Date.now()}_flavor`, week, category: 'rival', title: `${promo.name} announces a new card`, body: `${promo.name} continues to expand its reach as a ${promo.tier.toLowerCase()} organization.` });
      }

      return {
        ...state,
        week,
        cards,
        scheduledFights,
        funds,
        roster,
        amateurs,
        hallOfFame,
        titles,
        rivals,
        prestige,
        freeAgents,
        worldPool,
        news,
        meta: { ...state.meta, brokeWeeks },
        ui: bankrupt ? { ...state.ui, screen: 'gameOver' } : state.ui,
      };
    }

    case 'PREPARE_FIGHT_SIM': {
      const fight = state.scheduledFights.find(f => f.id === action.fightId);
      if (!fight) return state;
      const fighter = findFighterAnywhere(state, fight.fighterId);
      const opponent = findFighterAnywhere(state, fight.opponentId);
      const rounds = fight.rounds || 3;

      // With "auto-skip fights" on, the player never watches — resolve the
      // whole thing at once with the pre-fight gameplan locked in, same as
      // the game always worked before between-rounds adjustments existed.
      if (state.meta.autoSkipFights) {
        const gameplanFighter = applyGameplan(applyAgeCurve(fighter), fight.gameplan);
        const sim = simulateFight(gameplanFighter, applyAgeCurve(opponent), { rounds });
        return {
          ...state,
          activeFight: { fightId: fight.id, fighterId: fighter.id, opponentId: opponent.id, gameplan: fight.gameplan, finished: true, sim },
          ui: { ...state.ui, screen: 'fightSim' },
        };
      }

      // Otherwise simulate just Round 1 — the reducer pauses here and
      // waits for ADVANCE_FIGHT_ROUND (or SKIP_FIGHT_TO_END) so the player
      // can adjust their gameplan between rounds, corner-style.
      const session = initFightSession(fighter, opponent);
      const { roundsData, stopped, session: nextSession } = runFightRounds(fighter, opponent, fight.gameplan, session, 1, rounds, 'one');
      const finished = !!stopped || rounds <= 1;
      const totalStats = { A: nextSession.A.stats, B: nextSession.B.stats };
      const result = finished ? computeFightResult(fighter.id, opponent.id, roundsData, stopped, rounds, totalStats) : null;
      return {
        ...state,
        activeFight: {
          fightId: fight.id,
          fighterId: fighter.id,
          opponentId: opponent.id,
          gameplan: fight.gameplan,
          session: nextSession,
          stoppedAt: stopped,
          finished,
          sim: { fighterAId: fighter.id, fighterBId: opponent.id, rounds, roundsData, result },
        },
        ui: { ...state.ui, screen: 'fightSim' },
      };
    }

    case 'ADVANCE_FIGHT_ROUND': {
      const active = state.activeFight;
      if (!active || active.finished || !active.session) return state;
      const fighter = findFighterAnywhere(state, active.fighterId);
      const opponent = findFighterAnywhere(state, active.opponentId);
      const gameplan = action.gameplan || active.gameplan;
      const nextRoundNum = active.sim.roundsData.length + 1;
      const { roundsData: newRounds, stopped, session } = runFightRounds(fighter, opponent, gameplan, active.session, nextRoundNum, active.sim.rounds, 'one');
      const roundsData = [...active.sim.roundsData, ...newRounds];
      const stoppedAt = stopped || active.stoppedAt;
      const finished = !!stopped || nextRoundNum >= active.sim.rounds;
      const totalStats = { A: session.A.stats, B: session.B.stats };
      const result = finished ? computeFightResult(active.fighterId, active.opponentId, roundsData, stoppedAt, active.sim.rounds, totalStats) : null;
      return {
        ...state,
        activeFight: { ...active, gameplan, session, stoppedAt, finished, sim: { ...active.sim, roundsData, result } },
      };
    }

    case 'SKIP_FIGHT_TO_END': {
      const active = state.activeFight;
      if (!active || active.finished || !active.session) return state;
      const fighter = findFighterAnywhere(state, active.fighterId);
      const opponent = findFighterAnywhere(state, active.opponentId);
      const nextRoundNum = active.sim.roundsData.length + 1;
      const { roundsData: newRounds, stopped, session } = runFightRounds(fighter, opponent, active.gameplan, active.session, nextRoundNum, active.sim.rounds, 'all');
      const roundsData = [...active.sim.roundsData, ...newRounds];
      const stoppedAt = stopped || active.stoppedAt;
      const totalStats = { A: session.A.stats, B: session.B.stats };
      const result = computeFightResult(active.fighterId, active.opponentId, roundsData, stoppedAt, active.sim.rounds, totalStats);
      return {
        ...state,
        activeFight: { ...active, session, stoppedAt, finished: true, sim: { ...active.sim, roundsData, result } },
      };
    }

    case 'RESOLVE_FIGHT': {
      const active = state.activeFight;
      if (!active || !active.sim.result) return state;
      const fight = state.scheduledFights.find(f => f.id === active.fightId);
      const { result } = active.sim;

      const draw = result.method === 'DRAW';
      const isFinish = result.method === 'KO' || result.method === 'TKO' || result.method === 'SUB';
      const fighterWon = !draw && result.winnerId === active.fighterId;

      // final damage taken, for injury odds — A is always the booked
      // fighter and B the opponent (see PREPARE_FIGHT_SIM below)
      const lastRound = active.sim.roundsData[active.sim.roundsData.length - 1];
      const damageTakenA = lastRound?.endDamageA ?? 0;
      const damageTakenB = lastRound?.endDamageB ?? 0;

      const rollInjuryWeeks = (damageTaken, lostByFinish) => {
        const chance = Math.min(0.6, (damageTaken / 100) * 0.35 + (lostByFinish ? 0.15 : 0));
        if (Math.random() >= chance) return 0;
        return lostByFinish ? randInt(4, 10) : randInt(2, 6);
      };

      // Winning draws eyes, especially against a bigger name or in a
      // finish; losing costs you some, more so if it was an upset loss to
      // a lesser-rated opponent. Draws are a small net gain either way —
      // fans remember a good scrap.
      const followerChange = (won, drew, opponentOverall, fighterOverall, finish, titleFight) => {
        if (drew) return randInt(10, 40);
        const gap = opponentOverall - fighterOverall;
        if (won) {
          let gain = randInt(80, 220) + Math.max(0, gap) * 25;
          if (finish) gain *= 1.5;
          if (titleFight) gain *= 2;
          return Math.round(gain);
        }
        let loss = randInt(40, 120) + Math.max(0, -gap) * 15;
        if (titleFight) loss *= 1.5;
        return -Math.round(loss);
      };

      const updateRecord = (fighter, won, drew, finishType, damageTaken, opponentOverall) => {
        if (!fighter) return fighter;
        const record = { ...fighter.record };
        if (drew) record.draws += 1;
        else if (won) {
          record.wins += 1;
          if (finishType === 'KO' || finishType === 'TKO') record.kos += 1;
          if (finishType === 'SUB') record.subs += 1;
        } else {
          record.losses += 1;
        }
        const lostByFinish = !drew && !won && isFinish;
        const injuryWeeks = rollInjuryWeeks(damageTaken, lostByFinish);
        const followerDelta = followerChange(won, drew, opponentOverall, fighter.overall, isFinish, !!fight?.isTitle);
        return {
          fighter: {
            ...fighter,
            record,
            xp: fighter.xp + randInt(400, 900),
            fatigue: Math.min(100, fighter.fatigue + 40),
            injuryWeeks: Math.max(fighter.injuryWeeks || 0, injuryWeeks),
            followers: Math.max(0, (fighter.followers || 0) + followerDelta),
          },
          followerDelta,
        };
      };

      let fighterInjuryWeeks = 0;
      let opponentInjuryWeeks = 0;
      let fighterFollowerDelta = 0;
      let opponentFollowerDelta = 0;

      const roster = state.roster.map(f => {
        if (f.id === active.fighterId) {
          const oppOverall = findFighterAnywhere(state, active.opponentId)?.overall || f.overall;
          const { fighter: updated, followerDelta } = updateRecord(f, fighterWon, draw, isFinish ? result.method : null, damageTakenA, oppOverall);
          fighterInjuryWeeks = updated.injuryWeeks;
          fighterFollowerDelta = followerDelta;
          return updated;
        }
        return f;
      });

      const worldPool = { ...state.worldPool };
      Object.keys(worldPool).forEach(wc => {
        worldPool[wc] = worldPool[wc].map(f => {
          if (f.id === active.opponentId) {
            const oppWon = !draw && result.winnerId === active.opponentId;
            const bookedFighterOverall = state.roster.find(r => r.id === active.fighterId)?.overall || f.overall;
            const { fighter: updated, followerDelta } = updateRecord(f, oppWon, draw, isFinish ? result.method : null, damageTakenB, bookedFighterOverall);
            opponentInjuryWeeks = updated.injuryWeeks;
            opponentFollowerDelta = followerDelta;
            return updated;
          }
          return f;
        });
      });

      const purse = fight ? fight.purse : 0;
      const earned = draw ? Math.round(purse * 0.5) : fighterWon ? purse : Math.round(purse * 0.3);
      const funds = state.funds + earned;

      const record = { ...state.record };
      if (draw) record.draws += 1;
      else if (fighterWon) record.wins += 1;
      else record.losses += 1;

      let prestigeDelta = draw ? 2 : fighterWon ? (isFinish ? 20 : 12) : -6;
      // Beating a fighter you were expected to lose to is worth a lot more
      // than a routine "stay busy" win over a heavy underdog — and an
      // expected loss to a much better opponent barely costs you.
      if (!draw) prestigeDelta = Math.round(prestigeDelta * prestigeUpsetFactor(fight?.winProbability, fighterWon));
      // A crossover win over a rival's contracted fighter is a much bigger
      // statement than beating another free agent — a loss stings less,
      // since you were the one crashing their card.
      if (fight?.isSuperFight) prestigeDelta += fighterWon ? 30 : draw ? 5 : -3;

      const fighterRef = findFighterAnywhere(state, active.fighterId);
      const oppRef = findFighterAnywhere(state, active.opponentId);
      const oppPromo = oppRef?.promotionId ? RIVAL_PROMOTIONS.find(p => p.id === oppRef.promotionId) : null;
      const methodText = { KO: 'by knockout', TKO: 'by TKO', SUB: 'by submission', UD: 'by unanimous decision', SD: 'by split decision', MD: 'by majority decision', DRAW: 'to a draw' }[result.method];
      const headline = draw
        ? `${fighterRef?.name} and ${oppRef?.name} battle ${methodText}`
        : `${fighterWon ? fighterRef?.name : oppRef?.name} defeats ${fighterWon ? oppRef?.name : fighterRef?.name} ${methodText}`;

      const news = [{ id: `n${Date.now()}`, week: state.week, category: 'fight', title: headline, body: 'A fight for the ages in front of the crowd.' }];
      let socialFeed = state.socialFeed;
      const reactionChirp = fightReactionChirp(state, {
        fighter: fighterRef,
        opponentName: oppRef?.name,
        fighterWon,
        draw,
        winProbability: fight?.winProbability,
      });
      if (reactionChirp) socialFeed = pushChirp(socialFeed, reactionChirp);
      if (fight?.isSuperFight) {
        news.unshift({
          id: `n${Date.now()}_super`,
          week: state.week,
          category: 'superfight',
          title: `Crossover event: ${fighterRef?.name} vs. ${oppRef?.name}${oppPromo ? ` (${oppPromo.name})` : ''}`,
          body: fighterWon
            ? `${state.meta.promotionName} makes a statement, taking down ${oppPromo ? `a ${oppPromo.name} fighter` : 'a rival name'} in a landmark crossover booking.`
            : `${oppPromo ? oppPromo.name : 'The rival camp'} gets the last laugh in a high-profile crossover card.`,
        });
      }
      if (fighterInjuryWeeks > 0) {
        news.unshift({ id: `n${Date.now()}_inja`, week: state.week, category: 'injury', title: `${fighterRef?.name} injured, out ${fighterInjuryWeeks} weeks`, body: `${fighterRef?.name} picked up an injury in the fight and won't be bookable for ${fighterInjuryWeeks} weeks.` });
      }
      if (opponentInjuryWeeks > 0) {
        news.unshift({ id: `n${Date.now()}_injb`, week: state.week, category: 'injury', title: `${oppRef?.name} injured, out ${opponentInjuryWeeks} weeks`, body: `${oppRef?.name} picked up an injury in the fight and will be sidelined for ${opponentInjuryWeeks} weeks.` });
      }
      if (fighterFollowerDelta >= 220) {
        news.unshift({ id: `n${Date.now()}_trend`, week: state.week, category: 'trending', title: `${fighterRef?.name} is trending`, body: `That performance is going viral — ${fighterRef?.name} picked up ${fighterFollowerDelta.toLocaleString()} followers overnight.` });
      }

      // Home promotion title fight: win it (or defend it) to hold the belt;
      // a losing champion vacates it rather than handing it to an outside
      // free agent — your promotion's belt only ever sits with your roster.
      let titles = state.titles;
      let roster2 = roster;
      let titlesWon = state.meta.titlesWon || 0;
      if (fight?.isTitle && fighterRef) {
        const wcId = fighterRef.weightClass;
        const wcName = WEIGHT_CLASS_MAP[wcId]?.name;
        const currentHolder = titles[wcId];
        const wasDefense = currentHolder && currentHolder.holderId === active.fighterId;
        if (fighterWon) {
          const defenses = wasDefense ? currentHolder.defenses + 1 : 0;
          titles = { ...titles, [wcId]: { holderId: active.fighterId, holderName: fighterRef.name, defenses } };
          roster2 = roster.map(f => (f.id === active.fighterId ? { ...f, title: wcName } : f));
          prestigeDelta += defenses > 0 ? 15 : 40;
          if (defenses === 0) titlesWon += 1;
          news.unshift({
            id: `n${Date.now()}_title`,
            week: state.week,
            category: 'title',
            title: defenses > 0 ? `${fighterRef.name} retains the ${wcName} title` : `${fighterRef.name} becomes ${state.meta.promotionName}'s ${wcName} Champion`,
            body: defenses > 0 ? `${fighterRef.name} makes the ${defenses === 1 ? '1st' : `${defenses}th`} defense of the belt.` : `${fighterRef.name} wins the newly created ${wcName} Championship.`,
          });
        } else if (wasDefense && !draw) {
          titles = { ...titles, [wcId]: null };
          roster2 = roster.map(f => (f.id === active.fighterId ? { ...f, title: null } : f));
          news.unshift({ id: `n${Date.now()}_titlevacant`, week: state.week, category: 'title', title: `${wcName} title vacated`, body: `${fighterRef.name} lost the belt — the ${wcName} championship is now vacant.` });
        }
      }

      // Your fighter's contract counts down only when they actually
      // compete — if this was their last fight under contract, they walk
      // to a rival the same way an unrenewed deal always has. How you
      // booked them also shapes how they feel about re-signing later.
      const bookedFighterPostFight = roster2.find(f => f.id === active.fighterId);
      if (bookedFighterPostFight) {
        const contractFightsLeft = (bookedFighterPostFight.contractFightsLeft ?? DEFAULT_CONTRACT_FIGHTS) - 1;
        const loyaltyDelta = loyaltyDeltaForFight({
          winProbability: fight?.winProbability ?? 0.5,
          isTitle: !!fight?.isTitle,
          isSuperFight: !!fight?.isSuperFight,
          won: fighterWon,
          drew: draw,
          injured: fighterInjuryWeeks > 0,
        });
        const loyalty = clampLoyalty((bookedFighterPostFight.loyalty ?? LOYALTY_BASELINE) + loyaltyDelta);
        if (contractFightsLeft <= 0) {
          if (titles[bookedFighterPostFight.weightClass]?.holderId === bookedFighterPostFight.id) {
            titles = { ...titles, [bookedFighterPostFight.weightClass]: null };
          }
          const promo = pick(state.rivals);
          const { contractFightsLeft: oldFightsLeft, signed, title, ...departed } = bookedFighterPostFight;
          worldPool[bookedFighterPostFight.weightClass] = [...worldPool[bookedFighterPostFight.weightClass], { ...departed, loyalty, promotionId: promo.id, champion: false, title: null }];
          roster2 = roster2.filter(f => f.id !== bookedFighterPostFight.id);
          news.unshift({
            id: `n${Date.now()}_contractdone`,
            week: state.week,
            category: 'poached',
            title: `${bookedFighterPostFight.name}'s contract is up — signs with ${promo.name}`,
            body: departureFlavor(bookedFighterPostFight.name, promo.name, loyalty),
          });
          socialFeed = pushChirp(socialFeed, makeChirp(state, { fighter: bookedFighterPostFight, category: 'departure', text: pick(DEPARTURE_CHIRPS)(promo.name) }));
        } else {
          roster2 = roster2.map(f => (f.id === bookedFighterPostFight.id ? { ...f, contractFightsLeft, loyalty, weeksSinceLastFight: 0 } : f));
          const beefChirp = loyaltyBeefChirp(state, bookedFighterPostFight, loyalty);
          if (beefChirp) socialFeed = pushChirp(socialFeed, beefChirp);
        }
      }

      const prestige = Math.max(0, state.prestige + prestigeDelta);
      const remainingFights = state.scheduledFights.filter(f => f.id !== active.fightId);
      // A card with no bouts left on it (this was the last one) drops off —
      // its venue fee was already spent, nothing left to track.
      const cards = fight?.cardId && !remainingFights.some(f => f.cardId === fight.cardId)
        ? (state.cards || []).filter(c => c.id !== fight.cardId)
        : (state.cards || []);

      return {
        ...state,
        roster: roster2,
        worldPool,
        funds,
        record,
        prestige,
        titles,
        cards,
        meta: { ...state.meta, totalEarnings: (state.meta.totalEarnings || 0) + earned, titlesWon },
        scheduledFights: remainingFights,
        fightHistory: [{
          id: active.fightId,
          week: state.week,
          fighterId: active.fighterId,
          opponentId: active.opponentId,
          fighterName: fighterRef?.name,
          opponentName: oppRef?.name,
          fighterWeightClass: fighterRef?.weightClass,
          result,
          isTitle: !!fight?.isTitle,
          fighterFollowerDelta,
          opponentFollowerDelta,
        }, ...state.fightHistory],
        news: [...news, ...state.news],
        socialFeed,
        activeFight: null,
        ui: { ...state.ui, screen: 'fightResult' },
      };
    }

    default:
      return state;
  }
}
