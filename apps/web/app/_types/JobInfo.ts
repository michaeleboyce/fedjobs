import { Job } from "./Job";

export type JobInfo = {
    jobPostingURL: string;
    jobDescription: string;
    job?: Job;
  };