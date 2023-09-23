export interface ReactiveNode<T> {
  computation?(): T;
  consumers: ReactiveNode<unknown>[];
  consumerIndexOfThis: number[];
  value: T;
  dirty: boolean;
  nextProducerIndex: number;
  producerNode: ReactiveNode<unknown>[];
  producerIndexOfThis: number[];
}

function createReactiveNode<T>(
  value: T | typeof UNSET = UNSET,
  node: Partial<ReactiveNode<T>> = {},
) {
  const defaultNode: Omit<ReactiveNode<unknown>, "value"> = {
    consumers: [],
    consumerIndexOfThis: [],
    dirty: false,
    nextProducerIndex: 0,
    producerNode: [],
    producerIndexOfThis: [],
  };

  return {
    ...defaultNode,
    value,
    ...node,
  } as ReactiveNode<unknown>;
}

let activeConsumer: ReactiveNode<unknown> | undefined;

export type Signal<T> = {
  (): T;
};

export interface WritableSignal<T> extends Signal<T> {
  set(newValue: T): void;
  update(updateFn: (value: T) => T): void;
}

function producerRemoveConsumer(
  staleProducer: ReactiveNode<unknown>,
  idx: number,
) {
  const lastIdx = staleProducer.consumers.length - 1;
  staleProducer.consumers[idx] = staleProducer.consumers[lastIdx];
  staleProducer.consumers.length--;

  if (idx < staleProducer.consumers.length) {
  }
}

function producerAccessed<T>(node: ReactiveNode<T>) {
  if (!activeConsumer) {
    return;
  }

  const idx = activeConsumer.nextProducerIndex;
  activeConsumer.nextProducerIndex++;

  if (
    idx < activeConsumer.producerNode.length &&
    activeConsumer.producerNode[idx] !== node
  ) {
    const staleProducer = activeConsumer.producerNode[idx];
    producerRemoveConsumer(
      staleProducer,
      activeConsumer.producerIndexOfThis[idx],
    );
  }

  activeConsumer.producerNode[idx] = node;

  if (!node.consumers.includes(activeConsumer)) {
    node.consumers.push(activeConsumer);
    node.consumerIndexOfThis.push(idx);
    activeConsumer.producerIndexOfThis[idx] = node.consumers.length - 1;
  }
}

export function signal<T>(initialValue: T): WritableSignal<T> {
  const node: ReactiveNode<T> = createReactiveNode(initialValue);

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

function consumerBeforeComputation(node: ReactiveNode<unknown>) {
  let prevConsumer = activeConsumer;
  activeConsumer = node;
  node.nextProducerIndex = 0;
  return prevConsumer;
}

function consumerAfterComputation(prevConsumer: ReactiveNode<unknown>) {
  activeConsumer = prevConsumer;
}

export function computed<T>(computation: () => T): Signal<T> {
  const node: ReactiveNode<T | typeof UNSET> = createReactiveNode(UNSET, {
    computation,
  });

  function computed() {
    producerAccessed(node);
    let prevConsumer = consumerBeforeComputation(node);
    if (node.value === UNSET || node.dirty) {
      node.value = node.computation();
      producerNotifyConsumers(node);
      node.dirty = false;
    }
    consumerAfterComputation(prevConsumer);

    return node.value;
  }

  return computed as Signal<T>;
}
