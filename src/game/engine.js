// Fight Empire — fight simulation engine.
// Produces a full, deterministic-per-call simulation up front (round by round,
// beat by beat) which the FightSim screen then "plays back" for the animated view.

const PUNCH_TYPES = ['jab', 'cross', 'leadHook', 'rearHook', 'leadUppercut', 'rearUppercut'];
const POWER_PUNCHES = new Set(['cross', 'leadHook', 'rearHook', 'leadUppercut', 'rearUppercut']);

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

function emptyPunchStats() {
  const s = {};
  PUNCH_TYPES.forEach(p => (s[p] = { thrown: 0, landed: 0 }));
  return s;
}

function totalThrown(stats) {
  return PUNCH_TYPES.reduce((sum, p) => sum + stats[p].thrown, 0);
}
function totalLanded(stats) {
  return PUNCH_TYPES.reduce((sum, p) => sum + stats[p].landed, 0);
}

const PUNCH_LABEL = {
  jab: 'jab',
  cross: 'straight right',
  leadHook: 'lead hook',
  rearHook: 'rear hook',
  leadUppercut: 'lead uppercut',
  rearUppercut: 'rear uppercut',
};

function commentaryFor(actorName, oppName, punch, landed, isBody) {
  const label = PUNCH_LABEL[punch] + (isBody ? ' to the body' : '');
  if (landed) {
    const templates = [
      `${actorName} lands a sharp ${label}`,
      `${actorName} finds the mark with the ${label}`,
      `Clean ${label} from ${actorName}`,
      `${actorName} scores with the ${label} — ${oppName} feels that one`,
    ];
    return pick(templates);
  }
  const templates = [
    `${actorName} throws the ${label} but it's blocked`,
    `${oppName} slips the ${label}`,
    `${actorName} reaches with the ${label} but it's wide`,
    `${oppName} evades — ${actorName}'s ${label} misses`,
  ];
  return pick(templates);
}

function walk(pos) {
  const nx = clamp(pos.x + randInt(-8, 8), 8, 92);
  const ny = clamp(pos.y + randInt(-8, 8), 8, 92);
  return { x: nx, y: ny };
}

/**
 * Simulate a full fight between two boxers.
 * @param {object} boxerA
 * @param {object} boxerB
 * @param {object} opts { rounds }
 */
export function simulateFight(boxerA, boxerB, opts = {}) {
  const rounds = opts.rounds || 8;
  const beatsPerRound = 14;

  const fighters = {
    A: { ref: boxerA, damage: 0, energy: 100, punches: emptyPunchStats(), knockdowns: 0, pos: { x: 35, y: 50 } },
    B: { ref: boxerB, damage: 0, energy: 100, punches: emptyPunchStats(), knockdowns: 0, pos: { x: 65, y: 50 } },
  };

  const roundsData = [];
  let stoppedAt = null; // { roundNum, method }

  outer: for (let r = 1; r <= rounds; r++) {
    const beats = [];
    const roundLanded = { A: 0, B: 0 };

    // energy recovers a bit between rounds
    fighters.A.energy = clamp(fighters.A.energy + 12, 0, 100);
    fighters.B.energy = clamp(fighters.B.energy + 12, 0, 100);

    for (let b = 0; b < beatsPerRound; b++) {
      const secondsRemaining = Math.round(180 - (b / beatsPerRound) * 180);
      const actorKey = rand() < 0.5 ? 'A' : 'B';
      const oppKey = actorKey === 'A' ? 'B' : 'A';
      const actor = fighters[actorKey];
      const opp = fighters[oppKey];

      actor.pos = walk(actor.pos);
      opp.pos = walk(opp.pos);

      // idle/movement beat sometimes, more likely when both fresh
      if (rand() < 0.18) {
        beats.push({
          t: secondsRemaining,
          actor: null,
          type: 'move',
          text: pick(['on the move', 'circling', 'feeling it out', 'resets in the center', 'working the jab from range']),
          posA: { ...fighters.A.pos },
          posB: { ...fighters.B.pos },
          damageA: fighters.A.damage,
          damageB: fighters.B.damage,
        });
        continue;
      }

      const isBody = rand() < 0.22;
      const punchWeights = actor.energy > 40 ? [0.4, 0.14, 0.14, 0.14, 0.09, 0.09] : [0.6, 0.1, 0.1, 0.1, 0.05, 0.05];
      let roll = rand();
      let punch = 'jab';
      let acc = 0;
      for (let i = 0; i < PUNCH_TYPES.length; i++) {
        acc += punchWeights[i];
        if (roll <= acc) {
          punch = PUNCH_TYPES[i];
          break;
        }
      }

      actor.punches[punch].thrown++;

      const speedDiff = actor.ref.stats.speed - opp.ref.stats.defense;
      const staminaFactor = actor.energy / 100;
      const baseChance = punch === 'jab' ? 0.42 : 0.3;
      const landChance = clamp(baseChance + speedDiff * 0.015 * staminaFactor, 0.08, 0.85);
      const landed = rand() < landChance;

      const energyCost = punch === 'jab' ? 1.5 : 3.2;
      actor.energy = clamp(actor.energy - energyCost, 0, 100);

      let damageDelt = 0;
      let knockdown = false;

      if (landed) {
        actor.punches[punch].landed++;
        roundLanded[actorKey]++;

        const power = POWER_PUNCHES.has(punch) ? actor.ref.stats.power : actor.ref.stats.power * 0.4;
        const chin = opp.ref.stats.chin;
        const rawDamage = (power / chin) * (isBody ? 3.5 : 2.6) * (0.7 + rand() * 0.6);
        damageDelt = clamp(rawDamage, 0.3, 9);
        opp.damage = clamp(opp.damage + damageDelt, 0, 100);

        // knockdown chance scales with damage dealt and how hurt opponent already is
        if (POWER_PUNCHES.has(punch)) {
          const kdChance = clamp((damageDelt / 100) * 1.4 + (opp.damage / 100) * 0.25, 0, 0.5);
          if (rand() < kdChance) {
            knockdown = true;
            opp.knockdowns++;
          }
        }
      }

      const text = knockdown
        ? `${opp.ref.name} is DOWN! Huge ${PUNCH_LABEL[punch]} from ${actor.ref.name}!`
        : commentaryFor(actor.ref.name, opp.ref.name, punch, landed, isBody);

      beats.push({
        t: secondsRemaining,
        actor: actorKey,
        type: knockdown ? 'knockdown' : landed ? 'landed' : 'miss',
        punch,
        isBody,
        text,
        posA: { ...fighters.A.pos },
        posB: { ...fighters.B.pos },
        damageA: fighters.A.damage,
        damageB: fighters.B.damage,
      });

      if (knockdown) {
        // recovery roll: chin vs accumulated damage
        const surviveChance = clamp(1 - opp.damage / 100 - (0.5 - opp.ref.stats.chin / 40), 0.05, 0.95);
        if (rand() > surviveChance || opp.damage >= 96) {
          stoppedAt = { roundNum: r, method: opp.damage >= 98 ? 'KO' : 'TKO', loserKey: oppKey };
          roundsData.push(finishRound(r, beats, roundLanded, fighters));
          break outer;
        }
        opp.damage = clamp(opp.damage - 15, 0, 100); // stands back up, hurt but in it
      }
    }

    roundsData.push(finishRound(r, beats, roundLanded, fighters));
  }

  const totalStats = {
    A: { ...fighters.A.punches, thrown: totalThrown(fighters.A.punches), landed: totalLanded(fighters.A.punches) },
    B: { ...fighters.B.punches, thrown: totalThrown(fighters.B.punches), landed: totalLanded(fighters.B.punches) },
  };

  let result;
  if (stoppedAt) {
    result = {
      winnerId: stoppedAt.loserKey === 'A' ? boxerB.id : boxerA.id,
      loserId: stoppedAt.loserKey === 'A' ? boxerA.id : boxerB.id,
      method: stoppedAt.method,
      roundEnded: stoppedAt.roundNum,
      totalStats,
    };
  } else {
    // decision — score cards from round winners with slight judge variance
    const cardsA = [0, 0, 0];
    const cardsB = [0, 0, 0];
    roundsData.forEach(rd => {
      for (let j = 0; j < 3; j++) {
        const wobble = rand() < 0.12; // occasional judge disagreement
        const aWon = wobble ? rd.scoreB > rd.scoreA : rd.scoreA >= rd.scoreB;
        if (rd.scoreA === rd.scoreB) {
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

    if (judgesForA > judgesForB) winnerId = boxerA.id;
    else if (judgesForB > judgesForA) winnerId = boxerB.id;
    else method = 'DRAW';

    result = {
      winnerId,
      loserId: winnerId ? (winnerId === boxerA.id ? boxerB.id : boxerA.id) : null,
      method,
      roundEnded: rounds,
      cards: { A: cardsA, B: cardsB },
      totalStats,
    };
  }

  return { boxerAId: boxerA.id, boxerBId: boxerB.id, rounds, roundsData, result };
}

function finishRound(roundNum, beats, roundLanded, fighters) {
  const scoreA = roundLanded.A >= roundLanded.B ? 10 : 9;
  const scoreB = roundLanded.B >= roundLanded.A ? 10 : 9;
  return {
    roundNum,
    beats,
    landedA: roundLanded.A,
    landedB: roundLanded.B,
    scoreA: roundLanded.A === roundLanded.B ? 10 : scoreA,
    scoreB: roundLanded.A === roundLanded.B ? 10 : scoreB,
    endDamageA: fighters.A.damage,
    endDamageB: fighters.B.damage,
  };
}

export { PUNCH_TYPES, PUNCH_LABEL };
