CREATE TYPE "public"."document_source" AS ENUM('USER_UPLOADED', 'APPLICATION_GENERATED');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('cover_letter', 'ecq', 'resume', 'tcq', 'other');--> statement-breakpoint
CREATE TYPE "public"."generation_type" AS ENUM('cover_letter', 'ecq', 'resume', 'tcq', 'other');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'REMOTE', 'HYBRID', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('ACTIVE', 'INACTIVE', 'FILLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('GOVERNMENT', 'NONPROFIT', 'PRIVATE', 'PUBLIC', 'ACADEMIC', 'STARTUP', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('ACTIVE', 'INACTIVE', 'ERROR', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."parsing_type" AS ENUM('cover_letter', 'ecq', 'resume', 'tcq', 'other');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('INTERESTED', 'NOT_INTERESTED', 'APPLIED', 'SAVED', 'VIEWED');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "document_type" NOT NULL,
	"source" "document_source" DEFAULT 'USER_UPLOADED' NOT NULL,
	"url" text NOT NULL,
	"s3_key" text NOT NULL,
	"text" text NOT NULL,
	"is_parsed" boolean DEFAULT false NOT NULL,
	"in_knowledge_bank" boolean DEFAULT false NOT NULL,
	"data" json DEFAULT '{}'::json NOT NULL,
	"name" varchar(75) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"generation_type" "generation_type" NOT NULL,
	"is_paragraph" boolean NOT NULL,
	"prompt" text NOT NULL,
	"completion" text NOT NULL,
	"temperature" numeric(2, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"external_id" varchar(255),
	"title" varchar(255) NOT NULL,
	"organization" varchar(255) NOT NULL,
	"organization_type" "organization_type",
	"department" varchar(255),
	"location" varchar(255),
	"description" text NOT NULL,
	"salary" text,
	"requirements" text,
	"url" text NOT NULL,
	"type" "employment_type",
	"experience" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"status" "job_status" DEFAULT 'ACTIVE' NOT NULL,
	"date_posted" timestamp with time zone,
	"date_scraped" timestamp with time zone DEFAULT now() NOT NULL,
	"structured_data" json DEFAULT '{}'::json,
	"benefits" text,
	"skills" json DEFAULT '[]'::json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"keywords" text DEFAULT '',
	"last_scraped" timestamp with time zone,
	"status" "source_status" DEFAULT 'ACTIVE' NOT NULL,
	"error_message" text,
	"refresh_frequency" varchar(20) DEFAULT 'DAILY',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parsings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"parsing_type" "parsing_type" NOT NULL,
	"prompt" text NOT NULL,
	"completion" text NOT NULL,
	"document_id" integer,
	"analysis_percent" integer DEFAULT 0 NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"temperature" numeric(2, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"position_uuid" varchar(36) NOT NULL,
	"user_id" text NOT NULL,
	"document_id" integer,
	"organization" text NOT NULL,
	"title" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"present" boolean NOT NULL,
	"activities" json NOT NULL,
	"accomplishments" json NOT NULL,
	"is_employment_history" boolean DEFAULT false NOT NULL,
	"original_position_uuid" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"original_document_id" varchar,
	"similar_position_uuids" json DEFAULT '[]' NOT NULL,
	"approved_similar_position_uuids" json DEFAULT '[]' NOT NULL,
	"rejected_similar_position_uuids" json DEFAULT '[]' NOT NULL,
	CONSTRAINT "positions_position_uuid_unique" UNIQUE("position_uuid")
);
--> statement-breakpoint
CREATE TABLE "user_job_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" integer NOT NULL,
	"feedback_type" "feedback_type" NOT NULL,
	"reasons" text,
	"viewed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_source_id_job_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."job_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parsings" ADD CONSTRAINT "parsings_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_job_feedback" ADD CONSTRAINT "user_job_feedback_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;