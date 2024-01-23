import { LocalStorageAdapter, encodeVideo } from "@ahmedrowaihi/hlsify";
import type { QueueOptions, WorkerListener } from "bullmq";
import { Queue, Worker } from "bullmq";
import type { hlsifyJob, hlsifyJobData } from "./types";

type workerEvents = Parameters<Worker["on"]>[0];

type hlsifyWorkerListener = {
  [U in workerEvents]?: WorkerListener<hlsifyJobData>[U];
};

interface hooks {
  prework?: (JobData: hlsifyJob) => Promise<void>;
  postwork?: (JobData: hlsifyJob) => Promise<void>;
}

interface createWorkersOptions {
  queueID?: string;
  count: number;
  on?: hlsifyWorkerListener;
  opts?: QueueOptions;
  hooks?: hooks;
}

const generateHelpers = (queueID: string, queue: Queue) => ({
  add: (data: hlsifyJobData) => queue.add(queueID, data),
  addBulk: (data: hlsifyJobData[]) =>
    queue.addBulk(data.map((d) => ({ name: queueID, data: d }))),
  obliterate: () => queue.obliterate({ force: true }),
  pause: () => queue.pause(),
  resume: () => queue.resume(),
});

export function createWorkers({
  queueID = "hlsify",
  count,
  opts = { connection: { host: "localhost", port: 6379 } },
  on = {},
  hooks = {},
}: createWorkersOptions) {
  const queue = new Queue(queueID);
  const workers = [] as Worker<hlsifyJobData>[];
  async function withHooks(job: hlsifyJob) {
    if (hooks.prework) await safeInvoke(() => hooks.prework!(job));
    const result = await proccessfn(job);
    if (hooks.postwork) await safeInvoke(() => hooks.postwork!(job));
    return result;
  }
  for (var i = 0; i < count; i++) {
    workers[i] = new Worker(queueID, withHooks, opts);
    Object.keys(on).reduce((worker, key) => {
      worker.on(key as workerEvents, on[key as workerEvents]!);
      return worker;
    }, workers[i]);
  }

  console.log(`⚡️ workers: <${workers.length}>`);
  return { workers, queue, ...generateHelpers(queueID, queue) };
}

async function proccessfn(job: hlsifyJob) {
  if (!job.data) throw new Error("no job data");

  await encodeVideo({
    input: job.data.input,
    output: job.data.output,
    adapter: new LocalStorageAdapter(),
  });

  return job.data;
}

async function safeInvoke(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.log(err);
  }
}
