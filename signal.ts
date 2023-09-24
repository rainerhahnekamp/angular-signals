export type CreateOptions<T> = {
  equal: (value1: T, value2: T) => boolean;
};

const defaultEqual = (value1, value2) => value1 === value2;

export interface ReactiveNode<T> {
  computation?(): T;
  consumers: ReactiveNode<unknown>[];
  consumerIndexOfThis: number[];
  value: T;
  dirty: boolean;
  version: number;
  nextProducerIndex: number;
  producerNode: ReactiveNode<unknown>[];
  producerIndexOfThis: number[];
  producerVersions: number[];
  equal: (value1: T, value2: T) => boolean;
  producerRecomputeValue: () => void;
}

function createReactiveNode<T>(
  value: T | typeof UNSET = UNSET,
  node: Partial<ReactiveNode<T>> = {},
) {
  const defaultNode: Omit<ReactiveNode<unknown>, "value"> = {
    consumers: [],
    consumerIndexOfThis: [],
    dirty: false,
    version: 0,
    nextProducerIndex: 0,
    producerNode: [],
    producerIndexOfThis: [],
    producerRecomputeValue: () => {},
    producerVersions: [],
    equal: (value1, value2) => value1 === value2,
  };

  return {
    ...defaultNode,
    value,
    ...node,
  } as ReactiveNode<T>;
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
  activeConsumer.producerVersions[idx] = node.version;
}

export function signal<T>(
  initialValue: T,
  options: CreateOptions<T> = { equal: defaultEqual },
): WritableSignal<T> {
  const node: ReactiveNode<T> = createReactiveNode(initialValue, {
    equal: options.equal,
  });

  function signalFn() {
    producerAccessed(node);
    return node.value;
  }
  signalFn.set = (newValue: T) => {
    if (options.equal(newValue, node.value)) {
      return;
    }
    node.value = newValue;
    node.version++;
    producerNotifyConsumers(node);
  };
  signalFn.update = (cb: (value: T) => T) => {
    const newValue = cb(node.value);
    if (options.equal(newValue, node.value)) {
      return;
    }

    node.value = newValue;
    node.version++;
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

function consumerPollProducersForChange<T>(node: ReactiveNode<T>): boolean {
  for (let i = 0; i < node.producerNode.length; i++) {
    const producer = node.producerNode[i];
    const seenVersion = node.producerVersions[i];
    if (seenVersion !== producer.version) {
      return true;
    }

    producer.producerRecomputeValue();
    if (seenVersion !== producer.version) {
      return true;
    }
  }

  return false;
}

function producerUpdateValueVersion<T>(node: ReactiveNode<T>) {
  if (!node.dirty) {
    return;
  }

  if (node.value !== UNSET && !consumerPollProducersForChange(node)) {
    node.dirty = false;
    return true;
  }
  node.producerRecomputeValue();
  node.dirty = false;
}

export function computed<T>(
  computation: () => T,
  options: CreateOptions<T> = { equal: defaultEqual },
): Signal<T> {
  const node: ReactiveNode<T | typeof UNSET> = createReactiveNode(UNSET, {
    computation,
    dirty: true,
    equal: options.equal,
    producerRecomputeValue: () => {
      let prevConsumer = consumerBeforeComputation(node);
      if (node.value === UNSET || node.dirty) {
        for (const producer of node.producerNode) {
          producer.producerRecomputeValue();
        }
        const newValue = node.computation();
        if (!node.equal(newValue, node.value)) {
          node.value = newValue;
          node.version++;
        }
      }
      consumerAfterComputation(prevConsumer);
    },
  });

  function computed() {
    producerUpdateValueVersion(node);
    producerAccessed(node);

    return node.value;
  }

  return computed as Signal<T>;
}
