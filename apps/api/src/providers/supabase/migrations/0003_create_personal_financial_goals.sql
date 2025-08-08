-- Create personal_financial_goals table
CREATE TABLE IF NOT EXISTS "personal_financial_goals" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"goal_type" varchar(100) NOT NULL,
	"target_amount" decimal(15,2),
	"current_amount" decimal(15,2) DEFAULT 0,
	"target_date" date,
	"description" text NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS "personalGoalsUserIndex" ON "personal_financial_goals" USING btree ("user_id");

-- Create index for status queries
CREATE INDEX IF NOT EXISTS "personalGoalsStatusIndex" ON "personal_financial_goals" USING btree ("status");

-- Create composite index for user + status queries
CREATE INDEX IF NOT EXISTS "personalGoalsUserStatusIndex" ON "personal_financial_goals" USING btree ("user_id", "status");