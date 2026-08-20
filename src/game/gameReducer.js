import { WEIGHT_CLASSES, WEIGHT_CLASS_MAP, STARTING_FUNDS, FIGHT_TYPES, RIVAL_PROMOTIONS, PRESTIGE_TIERS, GYM_LEVELS, rosterLimitForGym, RETIREMENT_AGE, AMATEUR_SIGN_COST, AMATEUR_PROMOTION_WINS, AMATEUR_POOL_LIMIT, WEEKS_PER_YEAR } from './constants';
import { makeStartingRoster, makeOpponentPool, makeFighter } from './generateFighter';
import { CITIES, randomFighterName } from './namePool';
import { simulateFight } from './engine';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
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

export function newCareerState({ managerName, promotionName, hq, selectedFighters }) {
  const roster = (selectedFighters && selectedFighters.length ? selectedFighters : makeStartingRoster(3))
    .map(f => ({ ...f, signed: true }));
  return {
    meta: {
      managerName: managerName || 'Player',
      promotionName: promotionName || `${managerName}'s MMA`,
      hq: hq || pick(CITIES).city,
      gymLevel: 1,
      coachName: randomFighterName().name,
      createdAt: Date.now(),
    },
    week: 1,
    funds: STARTING_FUNDS,
    record: { wins: 0, losses: 0, draws: 0 },
    prestige: 50,
    titles: {}, // weightClassId -> { holderId, holderName, defenses } | null (vacant until a Main Event is booked)
    rivals: RIVAL_PROMOTIONS.map(p => ({ ...p, prestige: p.basePrestige })),
    freeAgents: [makeFreeAgent(), makeFreeAgent()],
    roster,
    amateurs: [],
    hallOfFame: [],
    worldPool: buildWorldPool(),
    scheduledFights: [],
    fightHistory: [],
    news: [
      { id: 'n0', week: 1, category: 'welcome', title: 'Welcome to Fight Empire', body: `${promotionName || 'Your promotion'} opens its doors in ${hq || 'your hometown'}. Sign fighters, book cards, and climb past the sport's giants.` },
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

function purseForFight(fighter, opponent, type, venue) {
  const base = fighter.purseFloor;
  const typeMult = type === FIGHT_TYPES.MAIN_EVENT ? 2.4 : type === FIGHT_TYPES.SHOWCASE ? 1.3 : 1;
  const venueMult = 1 + venue.capacity / 20000;
  const drawMult = drawMultiplier(fighter.followers, opponent?.followers);
  return Math.round(base * typeMult * venueMult * drawMult);
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
        meta: action.state.meta
          ? { gymLevel: 1, coachName: randomFighterName().name, ...action.state.meta }
          : action.state.meta,
      };

    case 'SET_SCREEN':
      return { ...state, ui: { ...state.ui, screen: action.screen, params: action.params || null } };

    case 'SIGN_SCOUTED_PROSPECT': {
      const cost = 1500;
      const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
      if (!action.fighter || state.funds < cost || state.roster.length >= rosterLimit) return state;
      const prospect = { ...action.fighter, signed: true };
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
      const cost = Math.round(agent.purseFloor * 3);
      const rosterLimit = rosterLimitForGym(state.meta.gymLevel);
      if (state.funds < cost || state.roster.length >= rosterLimit) return state;
      const { weeksLeft, ...fighter } = agent;
      return {
        ...state,
        funds: state.funds - cost,
        roster: [...state.roster, { ...fighter, signed: true }],
        freeAgents: state.freeAgents.filter(f => f.id !== agent.id),
        prestige: state.prestige + 15,
        news: [{ id: `n${Date.now()}`, week: state.week, category: 'signing', title: `${state.meta.promotionName} signs free agent ${fighter.name}`, body: `${fighter.name} turned down interest from rival promotions to join ${state.meta.promotionName}.` }, ...state.news],
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
      const prospect = { ...base, overall, signed: true, record: { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 } };
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

    case 'SCHEDULE_FIGHT': {
      const { fighterId, opponent, fightType, venue } = action;
      const fighter = state.roster.find(f => f.id === fighterId);
      if (!fighter || !opponent || fighter.injuryWeeks > 0) return state;
      const cost = costForFight(fightType, venue);
      if (state.funds < cost) return state;
      const weeksOut = randInt(2, 6);
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
        purse: Math.round(purseForFight(fighter, opponent, fightType, venue) * (titleFight ? 1.6 : 1)),
        isTitle: titleFight,
        createdWeek: state.week,
      };
      return {
        ...state,
        funds: state.funds - cost,
        scheduledFights: [...state.scheduledFights, fight],
      };
    }

    case 'CANCEL_FIGHT':
      return { ...state, scheduledFights: state.scheduledFights.filter(f => f.id !== action.fightId) };

    case 'ADVANCE_WEEK': {
      const week = state.week + 1;
      const scheduledFights = state.scheduledFights.map(f => ({ ...f, weeksOut: Math.max(0, f.weeksOut - 1) }));
      const upkeep = 25 * state.roster.length;
      const funds = Math.max(0, state.funds - upkeep);
      const agedRoster = state.roster.map(f => ({
        ...f,
        fatigue: Math.max(0, f.fatigue - 15),
        injuryWeeks: Math.max(0, f.injuryWeeks - 1),
        age: week % WEEKS_PER_YEAR === 0 ? f.age + 1 : f.age,
      }));

      // Anyone who's aged into retirement leaves the roster — a genuinely
      // great career earns a Hall of Fame plaque, and a vacated belt goes
      // back on the table for someone else to win.
      const news = [...state.news];
      let titles = state.titles;
      let hallOfFame = state.hallOfFame || [];
      const roster = [];
      agedRoster.forEach(f => {
        if (f.age < RETIREMENT_AGE) {
          roster.push(f);
          return;
        }
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
      });

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

      return { ...state, week, scheduledFights, funds, roster, amateurs, hallOfFame, titles, rivals, prestige, freeAgents, worldPool, news };
    }

    case 'PREPARE_FIGHT_SIM': {
      const fight = state.scheduledFights.find(f => f.id === action.fightId);
      if (!fight) return state;
      const fighter = findFighterAnywhere(state, fight.fighterId);
      const opponent = findFighterAnywhere(state, fight.opponentId);
      const sim = simulateFight(fighter, opponent, { rounds: fight.rounds || 3 });
      return {
        ...state,
        activeFight: { fightId: fight.id, sim, fighterId: fighter.id, opponentId: opponent.id },
        ui: { ...state.ui, screen: 'fightSim' },
      };
    }

    case 'RESOLVE_FIGHT': {
      const active = state.activeFight;
      if (!active) return state;
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
      const funds = state.funds + (draw ? Math.round(purse * 0.5) : fighterWon ? purse : Math.round(purse * 0.3));

      const record = { ...state.record };
      if (draw) record.draws += 1;
      else if (fighterWon) record.wins += 1;
      else record.losses += 1;

      let prestigeDelta = draw ? 2 : fighterWon ? (isFinish ? 20 : 12) : -6;

      const fighterRef = findFighterAnywhere(state, active.fighterId);
      const oppRef = findFighterAnywhere(state, active.opponentId);
      const methodText = { KO: 'by knockout', TKO: 'by TKO', SUB: 'by submission', UD: 'by unanimous decision', SD: 'by split decision', MD: 'by majority decision', DRAW: 'to a draw' }[result.method];
      const headline = draw
        ? `${fighterRef?.name} and ${oppRef?.name} battle ${methodText}`
        : `${fighterWon ? fighterRef?.name : oppRef?.name} defeats ${fighterWon ? oppRef?.name : fighterRef?.name} ${methodText}`;

      const news = [{ id: `n${Date.now()}`, week: state.week, category: 'fight', title: headline, body: 'A fight for the ages in front of the crowd.' }];
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

      const prestige = Math.max(0, state.prestige + prestigeDelta);

      return {
        ...state,
        roster: roster2,
        worldPool,
        funds,
        record,
        prestige,
        titles,
        scheduledFights: state.scheduledFights.filter(f => f.id !== active.fightId),
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
        activeFight: null,
        ui: { ...state.ui, screen: 'fightResult' },
      };
    }

    default:
      return state;
  }
}
