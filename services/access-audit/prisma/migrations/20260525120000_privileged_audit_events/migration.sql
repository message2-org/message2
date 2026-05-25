-- CreateTable
CREATE TABLE "privileged_audit_events" (
    "id" UUID NOT NULL,
    "deployment_profile" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope_json" JSONB NOT NULL,
    "reason_code" TEXT NOT NULL,
    "reason_text" TEXT NOT NULL,
    "legal_ref" TEXT NOT NULL,
    "disclosure_level" TEXT NOT NULL,
    "user_facing_summary" TEXT,
    "actor" TEXT NOT NULL,
    "privileged_operation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privileged_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "privileged_audit_events_legal_ref_key" ON "privileged_audit_events"("legal_ref");

-- CreateIndex
CREATE INDEX "privileged_audit_events_created_at_idx" ON "privileged_audit_events"("created_at" DESC);
