type Point = [number, number];
const STEP_MS = 130;

export function placeSprite(el: HTMLElement, hero: HTMLElement, cx: number, cy: number, rot: number): void {
  const w = el.offsetWidth || 0;
  const h = el.offsetHeight || 0;
  const origin = hero.getBoundingClientRect();
  const localX = cx - origin.left;
  const localY = cy - origin.top;
  el.style.position = "absolute";
  el.style.left = "0";
  el.style.top = "0";
  el.style.transform = `translate(${localX - w / 2}px, ${localY - h / 2}px) rotate(${rot}deg)`;
}

export function headingDeg(a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.atan2(dx, -dy) * 180 / Math.PI;
}

export function buildPath(topRight: Point, leftX: number, leftY: number, topY: number, legs: number): Point[] {
  const x0 = topRight[0];
  const dx = (x0 - leftX) / legs;
  const pts: Point[] = [[x0, topRight[1]]];
  let up = true;
  for (let i = 1; i <= legs; i += 1) {
    const t = i / legs;
    const baseY = topRight[1] + (leftY - topRight[1]) * t;
    const y = up ? topY : baseY;
    pts.push([x0 - dx * i, y]);
    up = !up;
  }
  return pts;
}

export function walkPath(
  hero: HTMLElement,
  pts: Point[],
  totalMs: number,
  onPosition: (x: number, y: number, rot: number, step: number) => void,
  onProgress?: (frac: number) => void,
): Promise<void> {
  return new Promise(function (resolve): void {
    const start = performance.now();
    const legs = pts.length - 1;
    if (legs < 1) {
      resolve();
      return;
    }
    const perLeg = totalMs / legs;
    hero.style.willChange = "transform";
    function frame(now: number): void {
      const elapsed = Math.max(0, now - start);
      const progress = Math.min(elapsed / totalMs, 1);
      if (onProgress) {
        onProgress(progress);
      }
      if (progress >= 1) {
        const last = pts[legs]!;
        const prev = pts[legs - 1]!;
        onPosition(last[0], last[1], headingDeg(prev, last), Math.floor(elapsed / STEP_MS));
        hero.style.willChange = "";
        resolve();
        return;
      }
      const legIndex = Math.max(0, Math.min(Math.floor(elapsed / perLeg), legs - 1));
      const legProgress = (elapsed - legIndex * perLeg) / perLeg;
      const a = pts[legIndex]!;
      const b = pts[legIndex + 1]!;
      const x = a[0] + (b[0] - a[0]) * legProgress;
      const y = a[1] + (b[1] - a[1]) * legProgress;
      onPosition(x, y, headingDeg(a, b), Math.floor(elapsed / STEP_MS));
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

export function revealPlain(el: HTMLElement | null, x: number): void {
  if (!(el instanceof HTMLElement)) {
    return;
  }
  el.style.clipPath = `inset(0 0 0 ${Math.round(x)}px)`;
}

export function revealWords(el: HTMLElement | null, x: number, width: number): void {
  if (!(el instanceof HTMLElement)) {
    return;
  }
  const right = Math.max(0, width - x);
  el.style.clipPath = `inset(0 ${Math.round(right)}px 0 0)`;
}
