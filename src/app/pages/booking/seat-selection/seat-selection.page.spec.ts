import { splitColumnGroups } from './seat-selection.page';

/** The seat map must render every seat letter in exactly one group —
 *  no seat may go missing on the right side of the bus. */
describe('splitColumnGroups', () => {
  it('splits 2+2 into left/right groups', () => {
    expect(splitColumnGroups(['A', 'B', '|', 'C', 'D'])).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ]);
  });

  it('splits 2+3 into left/right groups', () => {
    expect(splitColumnGroups(['A', 'B', '|', 'C', 'D', 'E'])).toEqual([
      ['A', 'B'],
      ['C', 'D', 'E'],
    ]);
  });

  it('splits 2+1 into left/right groups', () => {
    expect(splitColumnGroups(['A', 'B', '|', 'C'])).toEqual([['A', 'B'], ['C']]);
  });

  it('splits the 1+1+1 sleeper into three groups (two aisles)', () => {
    expect(splitColumnGroups(['A', '|', 'B', '|', 'C'])).toEqual([
      ['A'],
      ['B'],
      ['C'],
    ]);
  });

  it('keeps aisle-free van layouts in a single group', () => {
    expect(splitColumnGroups(['A', 'B', 'C'])).toEqual([['A', 'B', 'C']]);
    expect(splitColumnGroups(['A', 'B', 'C', 'D'])).toEqual([
      ['A', 'B', 'C', 'D'],
    ]);
  });

  it('ignores stray leading/trailing gaps', () => {
    expect(splitColumnGroups(['|', 'A', 'B', '|'])).toEqual([['A', 'B']]);
  });
});
