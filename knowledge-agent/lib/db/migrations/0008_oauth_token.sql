CREATE TABLE IF NOT EXISTS "OAuthToken" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(32) NOT NULL,
  "userId" uuid NOT NULL,
  "accessToken" text,
  "refreshToken" text,
  "expiresAt" timestamp,
  "createdAt" timestamp NOT NULL,
  "updatedAt" timestamp NOT NULL,
  CONSTRAINT "OAuthToken_id_pk" PRIMARY KEY("id")
);
DO $$ BEGIN
  ALTER TABLE "OAuthToken" ADD CONSTRAINT "OAuthToken_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "OAuthToken_provider_userId_idx" ON "OAuthToken" ("provider", "userId"); 