ALTER TABLE "job_postings" DROP CONSTRAINT "job_postings_source_id_job_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_source_id_job_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."job_sources"("id") ON DELETE cascade ON UPDATE no action;