/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { measureFrame, measurableCount } from "./posture-metrics";

const L = (x: number, y: number, visibility = 0.99) => ({ x, y, visibility });
function body(shoulderDrop = 0) {
  const lm = Array.from({ length: 33 }, () => L(0.5, 0.5, 0));
  lm[0] = L(0.5, 0.2);
  lm[7] = L(0.55, 0.2);
  lm[8] = L(0.45, 0.2);
  lm[11] = L(0.62, 0.35);
  lm[12] = L(0.38, 0.35 + shoulderDrop);
  lm[23] = L(0.58, 0.65);
  lm[24] = L(0.42, 0.65);
  return lm;
}

describe("posture measurements", () => {
  test("no person detected gives no measurable metrics", () => {
    expect(measurableCount(measureFrame(undefined, 1000, 1000, "front"))).toBe(0);
  });
  test("level shoulders are within pageant range", () => {
    const m = measureFrame(body(0), 1000, 1000, "front");
    expect(m.shoulder_tilt.status).toBe("within");
  });
  test("a clearly dropped shoulder needs adjustment", () => {
    const m = measureFrame(body(0.06), 1000, 1000, "front");
    expect(m.shoulder_tilt.status).toBe("adjust");
  });
  test("stability is not measurable from a single photo", () => {
    expect(measureFrame(body(0), 1000, 1000, "front").stability?.value ?? null).toBeNull();
  });
});
