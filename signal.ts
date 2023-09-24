export type Signal<T> = (() => T) & {
  set(newValue: T): void;
  update(updateFn: (value: T) => T): void;
};

export function signal<T>(initialValue: T): Signal<T> {
  let value = initialValue;

  function signalFn() {
    return value;
  }
  signalFn.set = (newValue: T) => {
    value = newValue;
  };

  signalFn.update = (updateFn: (value: T) => T) => {
    value = updateFn(value);
  };

  return signalFn;
}
