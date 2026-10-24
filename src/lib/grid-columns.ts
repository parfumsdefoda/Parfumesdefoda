/**
 * Grid columns — one type, one mapping from the owner's settings.
 *
 * The catalogue's shape is 2 / 3 / 4 (phone / tablet / wide). data/settings.json
 * still owns the numbers, so the layout can be dialled back to a wider card;
 * nothing can push it past four columns.
 */

export interface GridColumns {
  mobile: 1 | 2;
  tablet: 1 | 2 | 3;
  desktop: 1 | 2 | 3 | 4;
}

/** Clamp the owner's grid numbers onto the three shapes the grid supports. */
export function toGridColumns(grid: {
  desktop: number;
  tablet: number;
  mobile: number;
}): GridColumns {
  return {
    mobile: grid.mobile === 1 ? 1 : 2,
    tablet: grid.tablet === 1 ? 1 : grid.tablet === 2 ? 2 : 3,
    desktop:
      grid.desktop === 1
        ? 1
        : grid.desktop === 2
          ? 2
          : grid.desktop === 3
            ? 3
            : 4,
  };
}
