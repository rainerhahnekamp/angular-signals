import { describe, expect, it } from "vitest";
import { signal } from "./signal";

describe("Signals", () => {
  it("should create a signal", () => {
    const city = signal("New York");
    expect(city()).toBe("New York");

    city.set("Vienna");
    expect(city()).toBe("Vienna");

    city.update((value) => {
      expect(value).toBe("Vienna");
      return value;
    });
  });
});
