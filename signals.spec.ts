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

  test("computed should be a producer as well", () => {
    const person = signal({ firstname: "Jessica", name: "Smith" });
    const prettyName = computed(() => {
      return `${person().firstname} ${person().name}`;
    });

    const prettyNameLog = computed(() => `Signals - INFO - ${prettyName()}`);

    expect(prettyNameLog()).toBe("Signals - INFO - Jessica Smith");
    person.update((value) => ({ ...value, name: "Johnson" }));
    expect(prettyNameLog()).toBe("Signals - INFO - Jessica Johnson");
  });

  it("should be glitch-free", () => {
    let prettyNameCount = 0;
    const person = signal({ firstname: "Jessica", name: "Smith" });
    const log = computed(() => {
      prettyNameCount++;
      // renderDOM();
      console.log(`${person().firstname} ${person().name}`);
    });
    log();

    person.update((value) => ({ ...value, name: "Johnson" }));
    person.update((value) => ({ ...value, firstname: "Anna" }));

    expect(prettyNameCount).toBe(1);
  });

  it("should support dynamic dependencies", () => {
    let computedRunCount = 0;
    const lunch = signal({ name: "Schnitzel", price: 10.5 });
    const dinner = signal({ name: "Jause", price: 3.9 });
    const isEvening = signal(true);

    const menu = computed(() => {
      computedRunCount++;
      const meal = isEvening() ? dinner() : lunch();
      return `Dinner: ${meal.name}: ${meal.price.toFixed(2)}`;
    });

    menu();
    isEvening.update(() => false);
    menu();
    dinner.update((value) => ({ ...value, price: 4.5 }));
    menu();
    expect(computedRunCount).toBe(2);
  });
});
