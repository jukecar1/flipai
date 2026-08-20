// Fight Empire — MMA fight simulation engine.
// Produces a fight round by round (round data is plain, serializable
// progress state) which the FightSim screen then "plays back" beat by beat
// for the animated cage view. Rounds are simulated one at a time so the UI
// can pause between rounds — e.g. for a between-rounds gameplan/corner
// adjustment — without having to know the whole fight up front.

function rand() {
  return Math.random();
}

function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Beats per round and how often a beat is spent "circling" instead of
// actually throwing/attempting something — tuned so a fight reads as
// genuinely busy (more thrown strikes, more scrambles) rather than two
// fighters mostly feeling each other out.
const BEATS_PER_ROUND = 26;
const IDLE_CHANCE_STANDING = 0.09;
const IDLE_CHANCE_GROUND = 0.06;

const STRIKE_FLAVORS = ['jab', 'cross', 'hook', 'head kick', 'leg kick', 'body kick'];
const GROUND_STRIKE_FLAVORS = ['ground-and-pound', 'elbow'];
const SUB_FLAVORS = ['rear-naked choke', 'armbar', 'triangle choke', 'guillotine', 'kimura', 'D\'Arce choke'];

function emptyActionStats() {
  return {
    strikes: { thrown: 0, landed: 0 },
    groundStrikes: { thrown: 0, landed: 0 },
    takedowns: { thrown: 0, landed: 0 },
    submissions: { thrown: 0, landed: 0 },
    controlBeats: 0,
  };
}

function commentaryStrike(actorName, oppName, flavor, landed) {
  if (landed) {
    return pick([
      `${actorName} lands a sharp ${flavor}`,
      `${actorName} finds the mark with the ${flavor}`,
      `Clean ${flavor} from ${actorName}`,
      `${actorName} scores with the ${flavor} — ${oppName} feels that one`,
    ]);
  }
  return pick([
    `${actorName} throws the ${flavor} but it's blocked`,
    `${oppName} slips the ${flavor}`,
    `${actorName} reaches with the ${flavor} but it's short`,
    `${oppName} avoids — ${actorName}'s ${flavor} misses`,
  ]);
}

function walk(pos) {
  const nx = clamp(pos.x + randInt(-8, 8), 8, 92);
  const ny = clamp(pos.y + randInt(-8, 8), 8, 92);
  return { x: nx, y: ny };
}

// A fighter who hasn't fully recovered from their last camp starts with
// less in the tank — fatigue accumulates after a fight and decays weekly
// (see ADVANCE_WEEK in gameReducer.js), so booking too aggressively costs
// real in-fight performance.
const startCardio = fighter => clamp(100 - (fighter.fatigue || 0) * 0.4, 55, 100);

/**
 * Fresh, plain-data progress state for a fight — carries damage, cardio,
 * cumulative action stats, and cage position for both corners across
 * however many rounds get simulated. Safe to store in Redux state/
 * localStorage as-is (no functions/refs), so a fight can be simulated one
 * round at a time between UI turns (e.g. picking a gameplan between
 * rounds) instead of all at once.
 */
export function initFightSession(fighterA, fighterB) {
  return {
    A: { damage: 0, cardio: startCardio(fighterA), stats: emptyActionStats(), pos: { x: 35, y: 50 } },
    B: { damage: 0, cardio: startCardio(fighterB), stats: emptyActionStats(), pos: { x: 65, y: 50 } },
  };
}

/**
 * Simulate exactly one round given a session's carried-over progress
 * state. fighterARef/fighterBRef are the stat sets to use for THIS round
 * (already gameplan-adjusted by the caller if applicable) — damage/
 * cardio/action stats/position always continue from the session
 * regardless of gameplan. Returns the round's beat data, a stoppage
 * descriptor if the round ended the fight, and the updated session to
 * pass into the next round.
 */
export function simulateFightRound(session, fighterARef, fighterBRef, roundNum) {
  const fighters = {
    A: { ref: fighterARef, ...session.A },
    B: { ref: fighterBRef, ...session.B },
  };
  const { roundData, stopped } = runRound(fighters, roundNum);
  return {
    roundData,
    stopped,
    session: {
      A: { damage: fighters.A.damage, cardio: fighters.A.cardio, stats: fighters.A.stats, pos: fighters.A.pos },
      B: { damage: fighters.B.damage, cardio: fighters.B.cardio, stats: fighters.B.stats, pos: fighters.B.pos },
    },
  };
}

function runRound(fighters, roundNum) {
  const beats = [];
  const roundScore = { A: 0, B: 0 };
  let position = 'standing';
  let topKey = null;
  let stopped = null;

  fighters.A.cardio = clamp(fighters.A.cardio + 15, 0, 100);
  fighters.B.cardio = clamp(fighters.B.cardio + 15, 0, 100);

  for (let b = 0; b < BEATS_PER_ROUND; b++) {
    const secondsRemaining = Math.round(300 - (b / BEATS_PER_ROUND) * 300);

    let actorKey;
    if (position === 'standing') {
      actorKey = rand() < 0.5 ? 'A' : 'B';
    } else {
      actorKey = rand() < 0.7 ? topKey : (topKey === 'A' ? 'B' : 'A');
    }
    const oppKey = actorKey === 'A' ? 'B' : 'A';
    const actor = fighters[actorKey];
    const opp = fighters[oppKey];

    actor.pos = walk(actor.pos);
    opp.pos = walk(opp.pos);

    if (position === 'ground' && actorKey === topKey) {
      fighters[topKey].stats.controlBeats++;
      roundScore[topKey] += 0.4;
    }

    const staminaFactor = actor.cardio / 100;

    // idle/positioning beat, more common when both are fresh
    if (rand() < (position === 'standing' ? IDLE_CHANCE_STANDING : IDLE_CHANCE_GROUND)) {
      beats.push({
        t: secondsRemaining,
        actor: null,
        type: 'move',
        text: position === 'standing'
          ? pick(['circling', 'feeling it out', 'resets in the center', 'working behind the jab', 'measures distance'])
          : pick(['working for position', 'posturing up', 'controlling from top', 'looking for an opening']),
        posA: { ...fighters.A.pos },
        posB: { ...fighters.B.pos },
        damageA: fighters.A.damage,
        damageB: fighters.B.damage,
        position,
      });
      continue;
    }

    let event = null;

    if (position === 'standing') {
      const pTakedown = clamp(0.14 + (actor.ref.stats.wrestling - opp.ref.stats.wrestling) * 0.012, 0.04, 0.45);
      if (rand() < pTakedown) {
        actor.stats.takedowns.thrown++;
        const successChance = clamp(0.32 + (actor.ref.stats.wrestling - opp.ref.stats.wrestling) * 0.025, 0.08, 0.85);
        const landed = rand() < successChance;
        actor.cardio = clamp(actor.cardio - 5, 0, 100);
        if (landed) {
          actor.stats.takedowns.landed++;
          position = 'ground';
          topKey = actorKey;
          roundScore[actorKey] += 3;
          event = { type: 'takedown', category: 'takedown', text: `${actor.ref.name} scores a takedown on ${opp.ref.name}!` };
        } else {
          event = { type: 'miss', category: 'takedown', text: `${opp.ref.name} stuffs the takedown attempt` };
        }
      } else {
        const flavor = pick(STRIKE_FLAVORS);
        actor.stats.strikes.thrown++;
        const landChance = clamp(0.44 + (actor.ref.stats.striking - opp.ref.stats.striking) * 0.014 * staminaFactor, 0.1, 0.85);
        const landed = rand() < landChance;
        actor.cardio = clamp(actor.cardio - 2, 0, 100);
        let knockdown = false;
        if (landed) {
          actor.stats.strikes.landed++;
          roundScore[actorKey] += 1;
          const power = actor.ref.stats.striking;
          const rawDamage = (power / opp.ref.stats.chin) * (flavor.includes('kick') ? 3.2 : 2.4) * (0.7 + rand() * 0.6);
          const damageDelt = clamp(rawDamage, 0.3, 9);
          opp.damage = clamp(opp.damage + damageDelt, 0, 100);
          const kdChance = clamp((damageDelt / 100) * 1.5 + (opp.damage / 100) * 0.25, 0, 0.5);
          if (rand() < kdChance) knockdown = true;
        }
        event = {
          type: knockdown ? 'knockdown' : landed ? 'landed' : 'miss',
          category: 'strike',
          text: knockdown
            ? `${opp.ref.name} is HURT and DOWN! Huge ${flavor} from ${actor.ref.name}!`
            : commentaryStrike(actor.ref.name, opp.ref.name, flavor, landed),
        };
        if (knockdown) {
          const surviveChance = clamp(1 - opp.damage / 100 - (0.5 - opp.ref.stats.chin / 40), 0.05, 0.95);
          if (rand() > surviveChance || opp.damage >= 96) {
            beats.push({ t: secondsRemaining, actor: actorKey, ...event, posA: { ...fighters.A.pos }, posB: { ...fighters.B.pos }, damageA: fighters.A.damage, damageB: fighters.B.damage, position });
            stopped = { roundNum, method: opp.damage >= 98 ? 'KO' : 'TKO', loserKey: oppKey };
            break;
          }
          opp.damage = clamp(opp.damage - 15, 0, 100);
        }
      }
    } else {
      // ground position
      const isTop = actorKey === topKey;
      if (isTop) {
        const roll = rand();
        if (roll < 0.22) {
          // submission attempt
          actor.stats.submissions.thrown++;
          const flavor = pick(SUB_FLAVORS);
          const subChance = clamp(0.1 + (actor.ref.stats.submission - (opp.ref.stats.chin + opp.ref.stats.wrestling) / 2) * 0.02, 0.02, 0.4);
          if (rand() < subChance) {
            actor.stats.submissions.landed++;
            event = { type: 'submission', category: 'submission', text: `${actor.ref.name} locks in a ${flavor}! ${opp.ref.name} has nowhere to go!` };
            beats.push({ t: secondsRemaining, actor: actorKey, ...event, posA: { ...fighters.A.pos }, posB: { ...fighters.B.pos }, damageA: fighters.A.damage, damageB: fighters.B.damage, position });
            stopped = { roundNum, method: 'SUB', loserKey: oppKey };
            break;
          }
          event = { type: 'miss', category: 'submission', text: `${actor.ref.name} hunts for the ${flavor} — ${opp.ref.name} defends` };
        } else {
          const flavor = pick(GROUND_STRIKE_FLAVORS);
          actor.stats.groundStrikes.thrown++;
          const landChance = clamp(0.55 + (actor.ref.stats.striking - opp.ref.stats.wrestling) * 0.01, 0.2, 0.9);
          const landed = rand() < landChance;
          let knockdown = false;
          if (landed) {
            actor.stats.groundStrikes.landed++;
            roundScore[actorKey] += 0.8;
            const rawDamage = clamp((actor.ref.stats.striking / opp.ref.stats.chin) * 1.9 * (0.7 + rand() * 0.6), 0.2, 7);
            opp.damage = clamp(opp.damage + rawDamage, 0, 100);
            const kdChance = clamp((rawDamage / 100) * 1.4 + (opp.damage / 100) * 0.3, 0, 0.5);
            if (rand() < kdChance) knockdown = true;
          }
          event = {
            type: knockdown ? 'knockdown' : landed ? 'landed' : 'miss',
            category: 'groundStrike',
            text: knockdown
              ? `${opp.ref.name} is covering up — ${actor.ref.name} is unloading!`
              : commentaryStrike(actor.ref.name, opp.ref.name, flavor, landed),
          };
          if (knockdown) {
            const surviveChance = clamp(1 - opp.damage / 100 - (0.5 - opp.ref.stats.chin / 40), 0.05, 0.95);
            if (rand() > surviveChance || opp.damage >= 96) {
              beats.push({ t: secondsRemaining, actor: actorKey, ...event, posA: { ...fighters.A.pos }, posB: { ...fighters.B.pos }, damageA: fighters.A.damage, damageB: fighters.B.damage, position });
              stopped = { roundNum, method: opp.damage >= 98 ? 'KO' : 'TKO', loserKey: oppKey };
              break;
            }
            opp.damage = clamp(opp.damage - 12, 0, 100);
          }
        }
      } else {
        // bottom fighter: submission attempt or scramble
        if (rand() < 0.45) {
          actor.stats.submissions.thrown++;
          const flavor = pick(SUB_FLAVORS);
          const subChance = clamp(0.06 + (actor.ref.stats.submission - opp.ref.stats.wrestling) * 0.015, 0.01, 0.3);
          if (rand() < subChance) {
            actor.stats.submissions.landed++;
            event = { type: 'submission', category: 'submission', text: `${actor.ref.name} catches a ${flavor} off the bottom! ${opp.ref.name} taps!` };
            beats.push({ t: secondsRemaining, actor: actorKey, ...event, posA: { ...fighters.A.pos }, posB: { ...fighters.B.pos }, damageA: fighters.A.damage, damageB: fighters.B.damage, position });
            stopped = { roundNum, method: 'SUB', loserKey: oppKey };
            break;
          }
          event = { type: 'miss', category: 'submission', text: `${actor.ref.name} looks for a ${flavor} from the bottom — ${opp.ref.name} postures out` };
        } else {
          const scrambleChance = clamp(0.28 + (actor.ref.stats.wrestling - opp.ref.stats.wrestling) * 0.02, 0.05, 0.7);
          if (rand() < scrambleChance) {
            position = 'standing';
            topKey = null;
            event = { type: 'scramble', category: 'scramble', text: `${actor.ref.name} scrambles back up to their feet!` };
          } else {
            event = { type: 'move', category: 'scramble', text: `${actor.ref.name} looks to create space but stays trapped underneath` };
          }
        }
      }
    }

    beats.push({
      t: secondsRemaining,
      actor: actorKey,
      ...event,
      posA: { ...fighters.A.pos },
      posB: { ...fighters.B.pos },
      damageA: fighters.A.damage,
      damageB: fighters.B.damage,
      position,
    });
  }

  return { roundData: finishRound(roundNum, beats, roundScore, fighters), stopped };
}

/**
 * Turn accumulated round data (+ a stoppage descriptor, if any) into a
 * final fight result — decision scoring when nobody was finished, or a
 * straight stoppage result otherwise. Shared by the whole-fight path and
 * by the reducer once an incrementally-simulated fight wraps up.
 */
export function computeFightResult(fighterAId, fighterBId, roundsData, stoppedAt, totalRounds, totalStats) {
  if (stoppedAt) {
    return {
      winnerId: stoppedAt.loserKey === 'A' ? fighterBId : fighterAId,
      loserId: stoppedAt.loserKey === 'A' ? fighterAId : fighterBId,
      method: stoppedAt.method,
      roundEnded: stoppedAt.roundNum,
      totalStats,
    };
  }

  const cardsA = [0, 0, 0];
  const cardsB = [0, 0, 0];
  roundsData.forEach(rd => {
    for (let j = 0; j < 3; j++) {
      const wobble = rand() < 0.1;
      const aWon = wobble ? rd.scoreB > rd.scoreA : rd.scoreA >= rd.scoreB;
      if (Math.abs(rd.scoreA - rd.scoreB) < 0.15) {
        cardsA[j] += 10;
        cardsB[j] += 10;
      } else if (aWon) {
        cardsA[j] += 10;
        cardsB[j] += 9;
      } else {
        cardsA[j] += 9;
        cardsB[j] += 10;
      }
    }
  });
  const judgesForA = cardsA.filter((v, i) => v > cardsB[i]).length;
  const judgesForB = cardsB.filter((v, i) => v > cardsA[i]).length;
  let winnerId = null;
  let method = 'MD';
  if (judgesForA === 3 || judgesForB === 3) method = 'UD';
  else if (judgesForA === 0 && judgesForB === 0) method = 'DRAW';
  else method = 'SD';

  if (judgesForA > judgesForB) winnerId = fighterAId;
  else if (judgesForB > judgesForA) winnerId = fighterBId;
  else method = 'DRAW';

  return {
    winnerId,
    loserId: winnerId ? (winnerId === fighterAId ? fighterBId : fighterAId) : null,
    method,
    roundEnded: totalRounds,
    cards: { A: cardsA, B: cardsB },
    totalStats,
  };
}

/**
 * Simulate a full MMA fight between two fighters in one shot (used when
 * the player doesn't want a between-rounds gameplan check-in — e.g. the
 * "auto-skip fights" setting — and by tests). Built on the same
 * round-by-round primitives the interactive path uses.
 * @param {object} fighterA
 * @param {object} fighterB
 * @param {object} opts { rounds }
 */
export function simulateFight(fighterA, fighterB, opts = {}) {
  const rounds = opts.rounds || 3;
  let session = initFightSession(fighterA, fighterB);
  const roundsData = [];
  let stoppedAt = null;

  for (let r = 1; r <= rounds; r++) {
    const out = simulateFightRound(session, fighterA, fighterB, r);
    session = out.session;
    roundsData.push(out.roundData);
    if (out.stopped) {
      stoppedAt = out.stopped;
      break;
    }
  }

  const totalStats = { A: session.A.stats, B: session.B.stats };
  const result = computeFightResult(fighterA.id, fighterB.id, roundsData, stoppedAt, rounds, totalStats);

  return { fighterAId: fighterA.id, fighterBId: fighterB.id, rounds, roundsData, result };
}

function finishRound(roundNum, beats, roundScore, fighters) {
  const scoreA = roundScore.A >= roundScore.B ? 10 : 9;
  const scoreB = roundScore.B >= roundScore.A ? 10 : 9;
  return {
    roundNum,
    beats,
    landedA: roundScore.A,
    landedB: roundScore.B,
    scoreA: Math.abs(roundScore.A - roundScore.B) < 0.15 ? 10 : scoreA,
    scoreB: Math.abs(roundScore.A - roundScore.B) < 0.15 ? 10 : scoreB,
    endDamageA: fighters.A.damage,
    endDamageB: fighters.B.damage,
  };
}

export { STRIKE_FLAVORS, GROUND_STRIKE_FLAVORS, SUB_FLAVORS };
