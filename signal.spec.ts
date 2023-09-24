import { describe, expect, it } from "vitest";
import { computed, signal } from "./signal";

type Meal = {
  name: string;
  price: number;
};

describe("Signals", () => {
  it("should create a signal", () => {
    const lunch = signal<Meal>({ name: "Schnitzel", price: 10.5 });
    expect(lunch()).toEqual({ name: "Schnitzel", price: 10.5 });

    lunch.set({ name: "Jause", price: 3.9 });
    expect(lunch().name).toBe("Jause");
    expect(lunch().price).toBe(3.9);

    lunch.update((value) => ({ ...value, price: 8 }));
    expect(lunch()).toEqual({ name: "Jause", price: 8 });
  });

  describe("computed", () => {
    it("should produce a derived value", () => {
      const lunch = signal<Meal>({ name: "Schnitzel", price: 10.5 });
      const prettyName = computed(
        () => `${lunch().name}: EUR ${lunch().price.toFixed(2)}`,
      );

      expect(prettyName()).toBe("Schnitzel: EUR 10.50");

      lunch.update((value) => ({ ...value, price: 12 }));
      expect(prettyName()).toBe("Schnitzel: EUR 12.00");
    });

    it("should be reactive", () => {
      let computedCount = 0;
      const lunch = signal<Meal>({ name: "Schnitzel", price: 10.5 });
      const prettyName = computed(() => {
        computedCount++;
        return `${lunch().name}: EUR ${lunch().price.toFixed(2)}`;
      });

      expect(computedCount).toBe(0);

      prettyName();
      expect(computedCount).toBe(1);

      prettyName();
      expect(computedCount).toBe(1);

      lunch.update((value) => ({ ...value, price: 12 }));
      prettyName();
      expect(computedCount).toBe(2);
    });
  });
});
