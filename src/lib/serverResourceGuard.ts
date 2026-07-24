import "server-only";

type Waiter = {
  resolve: (release: () => void) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type ResourceState = {
  active: number;
  limit: number;
  maxQueue: number;
  waiters: Waiter[];
};

declare global {
  // eslint-disable-next-line no-var
  var __baltzServerResources: Map<string, ResourceState> | undefined;
}

export class ResourceBusyError extends Error {
  constructor(resource: string) {
    super(`${resource} is busy. Try again in a moment.`);
    this.name = "ResourceBusyError";
  }
}

function resources() {
  globalThis.__baltzServerResources ??= new Map();
  return globalThis.__baltzServerResources;
}

function stateFor(resource: string, limit: number, maxQueue: number) {
  const existing = resources().get(resource);
  if (existing) return existing;
  const created: ResourceState = { active: 0, limit, maxQueue, waiters: [] };
  resources().set(resource, created);
  return created;
}

function releaseResource(state: ResourceState) {
  const next = state.waiters.shift();
  if (next) {
    clearTimeout(next.timer);
    next.resolve(() => releaseResource(state));
    return;
  }
  state.active = Math.max(0, state.active - 1);
}

async function acquireResource(
  resource: string,
  limit: number,
  maxQueue: number,
  waitMs: number,
) {
  const state = stateFor(resource, limit, maxQueue);
  if (state.active < state.limit) {
    state.active += 1;
    return () => releaseResource(state);
  }
  if (state.waiters.length >= state.maxQueue) throw new ResourceBusyError(resource);

  return new Promise<() => void>((resolve, reject) => {
    const waiter: Waiter = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const index = state.waiters.indexOf(waiter);
        if (index >= 0) state.waiters.splice(index, 1);
        reject(new ResourceBusyError(resource));
      }, waitMs),
    };
    state.waiters.push(waiter);
  });
}

export async function withExclusiveServerResource<T>(
  resource: string,
  work: () => Promise<T>,
  options: { waitMs?: number; maxQueue?: number } = {},
) {
  const release = await acquireResource(
    resource,
    1,
    options.maxQueue ?? 2,
    options.waitMs ?? 15_000,
  );
  try {
    return await work();
  } finally {
    release();
  }
}
