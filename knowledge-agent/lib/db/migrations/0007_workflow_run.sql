CREATE TABLE IF NOT EXISTS "WorkflowRun" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
  "phaseId" varchar(16) NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'active',
  "step" varchar(64) NOT NULL DEFAULT 'collect_params',
  "params" json,
  "requiredInputs" json,
  "artifacts" json,
  "approvals" json,
  "runInfo" json,
  "createdAt" timestamp NOT NULL,
  "updatedAt" timestamp NOT NULL
); 