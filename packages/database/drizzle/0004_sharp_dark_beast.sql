ALTER TABLE "user_job_feedback" DROP CONSTRAINT "user_job_feedback_job_id_job_postings_id_fk";
--> statement-breakpoint
ALTER TABLE "user_job_feedback" ADD CONSTRAINT "user_job_feedback_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;