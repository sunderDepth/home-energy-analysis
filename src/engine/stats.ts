export function sum(arr: number[]): number {
  let s = 0;
  for (const v of arr) s += v;
  return s;
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

export function dotProduct(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Solve a 2x2 linear system: Ax = b
 * A = [[a00, a01], [a10, a11]], b = [b0, b1]
 * Returns [x0, x1] or null if singular.
 */
export function solve2x2(
  a00: number, a01: number,
  a10: number, a11: number,
  b0: number, b1: number,
): [number, number] | null {
  const det = a00 * a11 - a01 * a10;
  if (Math.abs(det) < 1e-12) return null;
  return [
    (a11 * b0 - a01 * b1) / det,
    (a00 * b1 - a10 * b0) / det,
  ];
}

/**
 * Solve a 3x3 linear system using Cramer's rule.
 * Returns [x0, x1, x2] or null if singular.
 */
export function solve3x3(
  a: number[][], // 3x3
  b: number[],   // 3
): [number, number, number] | null {
  const det3 = (m: number[][]): number =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  const detA = det3(a);
  if (Math.abs(detA) < 1e-12) return null;

  const replaceCol = (col: number): number[][] =>
    a.map((row, i) => row.map((v, j) => (j === col ? b[i] : v)));

  return [
    det3(replaceCol(0)) / detA,
    det3(replaceCol(1)) / detA,
    det3(replaceCol(2)) / detA,
  ];
}

/**
 * Calculate R² (coefficient of determination)
 */
export function rSquared(observed: number[], fitted: number[]): number {
  const meanObs = mean(observed);
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < observed.length; i++) {
    ssTot += (observed[i] - meanObs) ** 2;
    ssRes += (observed[i] - fitted[i]) ** 2;
  }
  if (ssTot === 0) return 0;
  return Math.max(0, 1 - ssRes / ssTot);
}
