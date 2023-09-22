import { describe, expect, it, test } from "vitest";
import { computed, signal } from "./signal";

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

  describe("computed", () => {
    test("computed should produce a derived value", () => {
      const person = signal({ firstname: "Jessica", name: "Smith" });
      const prettyName = computed(
        () => `${person().firstname} ${person().name}`,
      );
      expect(prettyName()).toBe("Jessica Smith");
    });

    test("computed should be reactive", () => {
      let computedCount = 0;
      const person = signal({ firstname: "Jessica", name: "Smith" });
      const prettyName = computed(() => {
        computedCount++;
        return `${person().firstname} ${person().name}`;
      });
      expect(prettyName()).toBe("Jessica Smith");
      person.update((value) => ({ ...value, name: "Johnson" }));
      expect(prettyName()).toBe("Jessica Johnson");
      expect(prettyName()).toBe("Jessica Johnson");

      expect(computedCount).toBe(2);
    });
  });

  test.skip("computed should be a producer as well");
});
