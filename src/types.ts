import type { Job } from "bullmq";

export type hlsifyJobData = {
  id: number;
  title: string;
  output: string;
  input: string;
};

export type hlsifyJob = Job<hlsifyJobData>;
