import { simulateFight } from './engine';
import { makeFighter } from './generateFighter';

test('simulateFight always produces a terminal result', () => {
  for (let i = 0; i < 25; i++) {
    const a = makeFighter({ level: 'prospect' });
    const b = makeFighter({ weightClassId: a.weightClass, level: 'contender' });
    const { result, roundsData } = simulateFight(a, b, { rounds: 3 });

    expect(['KO', 'TKO', 'SUB', 'UD', 'SD', 'MD', 'DRAW']).toContain(result.method);
    expect(roundsData.length).toBeGreaterThan(0);
    expect(roundsData.length).toBeLessThanOrEqual(3);

    if (result.method === 'DRAW') {
      expect(result.winnerId).toBeNull();
    } else {
      expect([a.id, b.id]).toContain(result.winnerId);
      expect([a.id, b.id]).toContain(result.loserId);
    }

    expect(result.totalStats.A.strikes.thrown).toBeGreaterThanOrEqual(0);
    expect(result.totalStats.B.strikes.thrown).toBeGreaterThanOrEqual(0);
  }
});
