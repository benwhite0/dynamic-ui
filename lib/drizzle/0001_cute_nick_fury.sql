CREATE TABLE IF NOT EXISTS "Holiday" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL
);
