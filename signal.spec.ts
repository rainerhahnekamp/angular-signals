import { describe, expect, it } from "vitest";
import { signal } from "./signal";

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
});
