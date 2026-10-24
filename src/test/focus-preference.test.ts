import { expect, it } from "vitest";
import { FOCUS_PREFERENCE_DEFAULT, focusPreferenceEnabled } from "@/lib/focus-preference";

it("automatic focus mode defaults on without a saved preference", () => {
  expect(FOCUS_PREFERENCE_DEFAULT).toBe(true);
  expect(focusPreferenceEnabled(null)).toBe(true);
});
it("respects the student's saved off and on preferences", () => {
  expect(focusPreferenceEnabled("off")).toBe(false);
  expect(focusPreferenceEnabled("on")).toBe(true);
});