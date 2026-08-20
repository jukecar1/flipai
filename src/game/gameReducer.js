import { WEIGHT_CLASSES, STARTING_FUNDS, FIGHT_TYPES } from './constants';
import { makeStartingRoster, makeOpponentPool, makeBoxer } from './generateBoxer';
import { CITIES } from './namePool';
import { simulateFight } from './engine';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function buildWorldPool() {
  const pool = {};
  WEIGHT_CLASSES.forEach(wc => {
    pool[wc.id] = makeOpponentPool(wc.id, 12);
  });
  return pool;
}

export function newCareerState({ managerName, promotionName, hq }) {
  const roster = makeStartingRoster(3).map(b => ({ ...b, signed: true }));
  return {
    meta: {
      managerName: managerName || 'Player',
      promotionName: promotionName || `${managerName}'s Fight Management`,
      hq: hq || pick(CITIES).city,
      createdAt: Date.now(),
    },
    week: 1,
    funds: STARTING_FUNDS,
    record: { wins: 0, losses: 0, draws: 0 },
    roster,
    worldPool: buildWorldPool(),
    scheduledFights: [],
    fightHistory: [],
    news: [
      { id: 'n0', week: 1, title: 'Welcome to Fight Empire', body: `${promotionName || 'Your promotion'} opens its doors in ${hq || 'your hometown'}. Build a roster, book fights, and chase titles.` },
    ],
    activeFight: null, // { fightId, sim } while a fight is being played out
    ui: { screen: 'hub' },
  };
}

function findBoxerAnywhere(state, boxerId) {
  const own = state.roster.find(b => b.id === boxerId);
  if (own) return own;
  for (const wc of Object.keys(state.worldPool)) {
    const found = state.worldPool[wc].find(b => b.id === boxerId);
    if (found) return found;
  }
  return null;
}

function purseForFight(boxer, type, venue) {
  const base = boxer.purseFloor;
  const typeMult = type === FIGHT_TYPES.MAIN_EVENT ? 2.4 : type === FIGHT_TYPES.SHOWCASE ? 1.3 : 1;
  const venueMult = 1 + venue.capacity / 20000;
  return Math.round(base * typeMult * venueMult);
}

function costForFight(type, venue) {
  const siteFeeShare = type === FIGHT_TYPES.SINGLE ? 0 : venue.fee;
  return siteFeeShare;
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.state;

    case 'SET_SCREEN':
      return { ...state, ui: { ...state.ui, screen: action.screen, params: action.params || null } };

    case 'SCOUT_PROSPECT': {
      const cost = 1500;
      if (state.funds < cost) return state;
      const prospect = makeBoxer({ weightClassId: action.weightClassId, level: 'prospect' });
      prospect.signed = true;
      return {
        ...state,
        funds: state.funds - cost,
        roster: [...state.roster, prospect],
        news: [{ id: `n${Date.now()}`, week: state.week, title: `${state.meta.promotionName} signs ${prospect.name}`, body: `A new ${WEIGHT_CLASSES.find(w => w.id === prospect.weightClass).name} prospect joins the stable.` }, ...state.news],
      };
    }

    case 'SCHEDULE_FIGHT': {
      const { boxerId, opponent, fightType, venue } = action;
      const boxer = state.roster.find(b => b.id === boxerId);
      if (!boxer || !opponent) return state;
      const cost = costForFight(fightType, venue);
      if (state.funds < cost) return state;
      const weeksOut = randInt(2, 6);
      const fight = {
        id: `f${Date.now()}_${randInt(0, 9999)}`,
        boxerId,
        opponentId: opponent.id,
        opponentName: opponent.name,
        type: fightType,
        venue,
        weeksOut,
        purse: purseForFight(boxer, fightType, venue),
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
      // light upkeep cost
      const upkeep = 25 * state.roster.length;
      const funds = Math.max(0, state.funds - upkeep);
      // fatigue/injury recovery
      const roster = state.roster.map(b => ({
        ...b,
        fatigue: Math.max(0, b.fatigue - 15),
        injuryWeeks: Math.max(0, b.injuryWeeks - 1),
      }));
      return { ...state, week, scheduledFights, funds, roster };
    }

    case 'PREPARE_FIGHT_SIM': {
      const fight = state.scheduledFights.find(f => f.id === action.fightId);
      if (!fight) return state;
      const boxer = findBoxerAnywhere(state, fight.boxerId);
      const opponent = findBoxerAnywhere(state, fight.opponentId);
      const rounds = fight.type === FIGHT_TYPES.MAIN_EVENT ? 12 : fight.type === FIGHT_TYPES.SHOWCASE ? 10 : 8;
      const sim = simulateFight(boxer, opponent, { rounds });
      return {
        ...state,
        activeFight: { fightId: fight.id, sim, boxerId: boxer.id, opponentId: opponent.id },
        ui: { ...state.ui, screen: 'fightSim' },
      };
    }

    case 'RESOLVE_FIGHT': {
      const active = state.activeFight;
      if (!active) return state;
      const fight = state.scheduledFights.find(f => f.id === active.fightId);
      const { result } = active.sim;

      const updateRecord = (boxer, won, drew, ko) => {
        if (!boxer) return boxer;
        const record = { ...boxer.record };
        if (drew) record.draws += 1;
        else if (won) {
          record.wins += 1;
          if (ko) record.kos += 1;
        } else {
          record.losses += 1;
        }
        return { ...boxer, record, xp: boxer.xp + randInt(400, 900), fatigue: Math.min(100, boxer.fatigue + 40) };
      };

      const draw = result.method === 'DRAW';
      const isKO = result.method === 'KO' || result.method === 'TKO';
      const boxerWon = !draw && result.winnerId === active.boxerId;

      const roster = state.roster.map(b => {
        if (b.id === active.boxerId) return updateRecord(b, boxerWon, draw, isKO && boxerWon);
        return b;
      });

      const worldPool = { ...state.worldPool };
      Object.keys(worldPool).forEach(wc => {
        worldPool[wc] = worldPool[wc].map(b => {
          if (b.id === active.opponentId) {
            const oppWon = !draw && result.winnerId === active.opponentId;
            return updateRecord(b, oppWon, draw, isKO && oppWon);
          }
          return b;
        });
      });

      const purse = fight ? fight.purse : 0;
      const funds = state.funds + (draw ? Math.round(purse * 0.5) : boxerWon ? purse : Math.round(purse * 0.3));

      const record = { ...state.record };
      if (draw) record.draws += 1;
      else if (boxerWon) record.wins += 1;
      else record.losses += 1;

      const boxerRef = findBoxerAnywhere(state, active.boxerId);
      const oppRef = findBoxerAnywhere(state, active.opponentId);
      const methodText = { KO: 'by knockout', TKO: 'by TKO', UD: 'by unanimous decision', SD: 'by split decision', MD: 'by majority decision', DRAW: 'to a draw' }[result.method];
      const headline = draw
        ? `${boxerRef?.name} and ${oppRef?.name} battle ${methodText}`
        : `${boxerWon ? boxerRef?.name : oppRef?.name} defeats ${boxerWon ? oppRef?.name : boxerRef?.name} ${methodText}`;

      return {
        ...state,
        roster,
        worldPool,
        funds,
        record,
        scheduledFights: state.scheduledFights.filter(f => f.id !== active.fightId),
        fightHistory: [{ id: active.fightId, week: state.week, boxerId: active.boxerId, opponentId: active.opponentId, result }, ...state.fightHistory],
        news: [{ id: `n${Date.now()}`, week: state.week, title: headline, body: `A ${state.activeFight ? '' : ''}fight for the ages in front of the crowd.` }, ...state.news],
        activeFight: null,
        ui: { ...state.ui, screen: 'fightResult' },
      };
    }

    default:
      return state;
  }
}
