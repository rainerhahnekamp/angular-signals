export type Signal<T> = () => T;

export interface WritableSignal<T> extends Signal<T> {
  set(newValue: T): void;
  update(updateFn: (value: T) => T): void;
}

export function signal<T>(initialValue: T): WritableSignal<T> {
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

export function computed<T>(computation: () => T): Signal<T> {
  function computed() {
    return computation();
  }

  return computed;
}
