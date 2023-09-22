export interface ReactiveNode<T> {
  computation?(): T;
  consumers: ReactiveNode<unknown>[];
  value: T;
  dirty: boolean;
}

let activeConsumer: ReactiveNode<unknown> | undefined;

export type Signal<T> = {
  (): T;
};

export interface WritableSignal<T> extends Signal<T> {
  set(newValue: T): void;
  update(updateFn: (value: T) => T): void;
}

function producerAccessed<T>(node: ReactiveNode<T>) {
  if (activeConsumer && !node.consumers.includes(activeConsumer)) {
    node.consumers.push(activeConsumer);
  }
}

export function signal<T>(initialValue: T): WritableSignal<T> {
  const node: ReactiveNode<T> = {
    consumers: [],
    value: initialValue,
    dirty: false,
  };

  function signalFn() {
    producerAccessed(node);
    return node.value;
  }
  signalFn.set = (newValue: T) => {
    node.value = newValue;
    producerNotifyConsumers(node);
  };
  signalFn.update = (cb: (value: T) => T) => {
    node.value = cb(node.value);
    producerNotifyConsumers(node);
  };

  return signalFn;
}

function consumerMarkDirty(node: ReactiveNode<unknown>) {
  node.dirty = true;
  producerNotifyConsumers(node);
}

function producerNotifyConsumers(node: ReactiveNode<unknown>) {
  for (const consumer of node.consumers) {
    consumerMarkDirty(consumer);
  }
}

const UNSET = Symbol("UNSET");

export function computed<T>(computation: () => T): Signal<T> {
  const node: ReactiveNode<T | typeof UNSET> = {
    computation,
    consumers: [],
    value: UNSET,
    dirty: false,
  };

  function computed() {
    producerAccessed(node);
    let prevConsumer = activeConsumer;
    activeConsumer = node;
    if (node.value === UNSET || node.dirty) {
      node.value = node.computation();
      producerNotifyConsumers(node);
      node.dirty = false;
    }

    activeConsumer = prevConsumer;

    return node.value;
  }

  return computed as Signal<T>;
}
export function effect<T>(effectFn: () => T) {
  const node: ReactiveNode<T | typeof UNSET> = {
    computation: effectFn,
    consumers: [],
    value: UNSET,
    dirty: false,
  };

  let prevConsumer = activeConsumer;
  activeConsumer = node;
  node.computation();
  activeConsumer = prevConsumer;
}
