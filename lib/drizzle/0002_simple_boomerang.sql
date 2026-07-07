CREATE TABLE IF NOT EXISTS "Ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(128) NOT NULL,
	"description" text,
	"status" varchar(16) DEFAULT 'todo' NOT NULL,
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
