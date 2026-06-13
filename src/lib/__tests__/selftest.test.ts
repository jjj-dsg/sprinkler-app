import { describe, it, expect } from 'vitest';
import { runSelfTests } from '../selftest';

/**
 * The landing page shows a "Self-test: N/N passing" badge driven by runSelfTests().
 * This guards that the badge can never silently show a green checkmark while broken —
 * if any in-app assertion regresses, CI fails here too.
 */
describe('in-app self-test panel', () => {
  const results = runSelfTests();

  it('reports a non-trivial number of checks', () => {
    expect(results.length).toBeGreaterThanOrEqual(15);
  });

  it('all in-app self-tests pass', () => {
    const failed = results.filter((r) => !r.pass);
    expect(failed, failed.map((f) => `${f.name}: ${f.msg}`).join('\n')).toHaveLength(0);
  });
});
