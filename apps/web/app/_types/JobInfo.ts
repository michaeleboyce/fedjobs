// File path: apps/web/app/_types/JobInfo.ts
import { Job } from "./Job";

export type JobInfo = {
    jobPostingURL: string;
    jobDescription: string;
    job?: Job;
  };