export type Signal<T> = () => T;

export interface WritableSignal<T> extends Signal<T> {
  set(newValue: T): void;
  update(updateFn: (value: T) => T): void;
}

type ReactiveNode<T> = {
  value: T;
  consumers: ReactiveNode<unknown>[];
  onValueChange: () => void;
};

const UNSET = Symbol();

function createReactiveNode<T>(
  value: T | typeof UNSET = UNSET,
  properties: Partial<ReactiveNode<T>> = {},
): ReactiveNode<T> {
  const defaultNode: Omit<ReactiveNode<T>, "value"> = {
    consumers: [],
    onValueChange: () => {},
  };

  return { ...defaultNode, value, ...properties } as ReactiveNode<T>;
}

let activeConsumer: ReactiveNode<unknown> | undefined;

function producerAccessed<T>(node: ReactiveNode<T>) {
  if (!activeConsumer) {
    return;
  }

  if (node.consumers.includes(activeConsumer)) {
    return;
  }

  node.consumers.push(activeConsumer);
}

function producerNotifyConsumer(node: ReactiveNode<unknown>) {
  for (const consumer of node.consumers) {
    consumer.onValueChange();
  }
}

export function signal<T>(initialValue: T): WritableSignal<T> {
  const node = createReactiveNode(initialValue);

  function signalFn() {
    producerAccessed(node);
    return node.value;
  }

  signalFn.set = (newValue: T) => {
    node.value = newValue;
    producerNotifyConsumer(node);
  };

  signalFn.update = (updateFn: (value: T) => T) => {
    node.value = updateFn(node.value);
    producerNotifyConsumer(node);
  };

  return signalFn;
}

function consumerBeforeComputation<T>(node: ReactiveNode<T>) {
  const prevConsumer = activeConsumer;
  activeConsumer = node;
  return prevConsumer;
}

function consumerAfterComputation(prevConsumer: ReactiveNode<unknown>) {
  activeConsumer = prevConsumer;
}

export function computed<T>(computation: () => T): Signal<T> {
  const node = createReactiveNode<T>(UNSET, {
    onValueChange: () => {
      node.value = computation();
    },
  });

  function computed() {
    const prevConsumer = consumerBeforeComputation(node);
    if (node.value === UNSET) {
      node.onValueChange();
    }
    consumerAfterComputation(prevConsumer);
    return node.value;
  }

  return computed;
}
