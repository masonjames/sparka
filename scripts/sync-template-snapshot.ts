import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const join = (...segments: readonly string[]): string => path.join(...segments);

const SNAPSHOT_CONCURRENCY = 32;
const NO_OPERATIONS = 0;
const MINIMUM_SNAPSHOT_CONCURRENCY = 1;
const ONE_OPERATION = 1;

/* oxlint-disable typescript/consistent-type-definitions -- The exported SnapshotOptions alias retains implicit Record index assignability; converting it to an interface changes that structural contract. */
type SnapshotOptions = {
  concurrency?: number;
  onActiveOperationsChange?: (activeOperations: number) => void;
};
/* oxlint-enable typescript/consistent-type-definitions */

class SnapshotIoLimiter {
  private activeOperations = NO_OPERATIONS;
  private readonly concurrency: number;
  private readonly queue: { resolve: (value: null) => void }[] = [];
  private reservedOperations = NO_OPERATIONS;
  private readonly onActiveOperationsChange?: (
    activeOperations: number
  ) => void;

  public constructor({
    concurrency,
    onActiveOperationsChange,
  }: Readonly<SnapshotOptions>) {
    this.concurrency = concurrency ?? SNAPSHOT_CONCURRENCY;
    if (
      !Number.isInteger(this.concurrency) ||
      this.concurrency < MINIMUM_SNAPSHOT_CONCURRENCY
    ) {
      throw new RangeError("Snapshot concurrency must be a positive integer");
    }
    this.onActiveOperationsChange = onActiveOperationsChange;
  }

  public async run<Result>(operation: () => Promise<Result>): Promise<Result> {
    if (
      this.activeOperations >= this.concurrency ||
      this.reservedOperations > NO_OPERATIONS
    ) {
      const deferred = Promise.withResolvers<null>();
      this.queue.push(deferred);
      await deferred.promise;
      this.reservedOperations -= ONE_OPERATION;
    }

    this.activeOperations += ONE_OPERATION;
    this.onActiveOperationsChange?.(this.activeOperations);
    try {
      return await operation();
    } finally {
      this.release();
    }
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      this.reservedOperations += ONE_OPERATION;
      this.activeOperations -= ONE_OPERATION;
      next.resolve(null);
    } else {
      this.activeOperations -= ONE_OPERATION;
      if (this.onActiveOperationsChange) {
        this.onActiveOperationsChange(this.activeOperations);
      }
    }
  }
}

/* oxlint-disable typescript/promise-function-async -- The readdir/readFile callbacks hand their native promises directly to the limiter; async changes promise identity and synchronous throw timing. */
const collectSnapshotWithLimiter = async (
  dir: string,
  prefix: string,
  limiter: Readonly<SnapshotIoLimiter>
): Promise<Map<string, string>> => {
  const entries = await limiter.run(() =>
    readdir(dir, { withFileTypes: true })
  );
  const snapshots = await Promise.all(
    entries.map(async (entry: Readonly<(typeof entries)[number]>) => {
      const absolute = join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        return await collectSnapshotWithLimiter(absolute, rel, limiter);
      }
      if (!entry.isFile()) {
        return new Map<string, string>();
      }
      const bytes = await limiter.run(() => readFile(absolute));
      const hash = createHash("sha256").update(bytes).digest("hex");
      return new Map([[rel, hash]]);
    })
  );
  const output = new Map<string, string>();
  for (const snapshot of snapshots) {
    for (const [nestedPath, hash] of snapshot) {
      output.set(nestedPath, hash);
    }
  }
  return output;
};
/* oxlint-enable typescript/promise-function-async */

/* oxlint-disable typescript/promise-function-async -- collectSnapshot: Keep synchronous validation/throws and the original promise identity; adding async changes those observable boundaries. */
const collectSnapshot = (
  dir: string,
  prefix = "",
  options: Readonly<SnapshotOptions> = {}
): Promise<Map<string, string>> =>
  collectSnapshotWithLimiter(dir, prefix, new SnapshotIoLimiter(options));
/* oxlint-enable typescript/promise-function-async */
export { collectSnapshot, SNAPSHOT_CONCURRENCY };
export type { SnapshotOptions };
