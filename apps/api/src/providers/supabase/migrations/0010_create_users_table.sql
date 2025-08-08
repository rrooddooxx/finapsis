-- Migration: Create Users Table
-- Description: Add a table to store user information.

CREATE TABLE IF NOT EXISTS "users" (
    "id" varchar(191) PRIMARY KEY NOT NULL,
    "email" text NOT NULL UNIQUE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "users_email_index" ON "users" ("email");