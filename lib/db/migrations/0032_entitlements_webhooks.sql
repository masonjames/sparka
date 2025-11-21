CREATE TABLE IF NOT EXISTS "Entitlement" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"source" varchar(50) NOT NULL,
	"externalId" varchar(255) NOT NULL,
	"tier" varchar(100),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"creditsGranted" integer DEFAULT 0 NOT NULL,
	"metadata" json,
	"startDate" timestamp,
	"endDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"source" varchar(50) NOT NULL,
	"eventId" varchar(255) NOT NULL,
	"eventType" varchar(100) NOT NULL,
	"payload" json NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processedAt" timestamp,
	"error" text,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entitlement_user_id_idx" ON "Entitlement" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entitlement_source_external_id_idx" ON "Entitlement" USING btree ("source","externalId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entitlement_status_idx" ON "Entitlement" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_event_source_event_id_idx" ON "WebhookEvent" USING btree ("source","eventId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_event_processed_idx" ON "WebhookEvent" USING btree ("processed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_event_created_at_idx" ON "WebhookEvent" USING btree ("createdAt");
