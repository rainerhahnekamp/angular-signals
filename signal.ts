export interface ReactiveNode<T> {
  computation?(): T;
  consumers: ReactiveNode<unknown>[];
  producerHasChanged: () => void;
  value: T;
}

let activeConsumer: ReactiveNode<unknown> | undefined;

export type Signal<T> = {
  (): T;
};

export interface WritableSignal<T> extends Signal<T> {
  set(newValue: T): void;
  update(updateFn: (value: T) => T): void;
}

export function signal<T>(initialValue: T): WritableSignal<T> {
  const node: ReactiveNode<T> = {
    consumers: [],
    value: initialValue,
    producerHasChanged: () => {},
  };

  function signalFn() {
    if (activeConsumer && !node.consumers.includes(activeConsumer)) {
      node.consumers.push(activeConsumer);
    }
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

function producerNotifyConsumers(node: ReactiveNode<unknown>) {
  for (const consumer of node.consumers) {
    consumer.producerHasChanged();
  }
}

const UNSET = Symbol("UNSET");

export function computed<T>(computation: () => T): Signal<T> {
  const node: ReactiveNode<T | typeof UNSET> = {
    computation,
    consumers: [],
    value: UNSET,
    producerHasChanged: () => {
      node.value = node.computation();
    },
  };

  function computed() {
    let prevConsumer = activeConsumer;
    activeConsumer = node;
    if (node.value === UNSET) {
      node.value = node.computation();
    }

    activeConsumer = prevConsumer;

    return node.value;
  }

  return computed as Signal<T>;
}
