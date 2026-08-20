import { simulateFight } from './engine';
import { makeBoxer } from './generateBoxer';

test('simulateFight always produces a terminal result', () => {
  for (let i = 0; i < 25; i++) {
    const a = makeBoxer({ level: 'prospect' });
    const b = makeBoxer({ weightClassId: a.weightClass, level: 'contender' });
    const { result, roundsData } = simulateFight(a, b, { rounds: 8 });

    expect(['KO', 'TKO', 'UD', 'SD', 'MD', 'DRAW']).toContain(result.method);
    expect(roundsData.length).toBeGreaterThan(0);
    expect(roundsData.length).toBeLessThanOrEqual(8);

    if (result.method === 'DRAW') {
      expect(result.winnerId).toBeNull();
    } else {
      expect([a.id, b.id]).toContain(result.winnerId);
      expect([a.id, b.id]).toContain(result.loserId);
    }

    expect(result.totalStats.A.thrown).toBeGreaterThan(0);
    expect(result.totalStats.B.thrown).toBeGreaterThanOrEqual(0);
  }
});
