CREATE TYPE "public"."global_cache_status" AS ENUM('ACTIVE', 'STALE', 'ERROR', 'PENDING');--> statement-breakpoint
CREATE TABLE "global_source_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"normalized_url" text NOT NULL,
	"original_url" text NOT NULL,
	"domain" varchar(255) NOT NULL,
	"last_crawled" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"refresh_frequency" varchar(20) DEFAULT 'DAILY',
	"status" "global_cache_status" DEFAULT 'ACTIVE' NOT NULL,
	"error_message" text,
	"job_count" integer DEFAULT 0,
	"user_count" integer DEFAULT 1,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "global_source_cache_normalized_url_unique" UNIQUE("normalized_url")
);
--> statement-breakpoint
ALTER TABLE "job_sources" ADD COLUMN "global_cache_id" integer;--> statement-breakpoint
ALTER TABLE "job_sources" ADD COLUMN "used_cache" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "job_sources" ADD CONSTRAINT "job_sources_global_cache_id_global_source_cache_id_fk" FOREIGN KEY ("global_cache_id") REFERENCES "public"."global_source_cache"("id") ON DELETE no action ON UPDATE no action;