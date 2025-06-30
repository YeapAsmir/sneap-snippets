ALTER TABLE `api_keys` DROP COLUMN `created_by`;--> statement-breakpoint
ALTER TABLE `snippets` DROP COLUMN `tags`;--> statement-breakpoint
ALTER TABLE `snippets` DROP COLUMN `created_by`;--> statement-breakpoint
ALTER TABLE `snippets` DROP COLUMN `avg_completion_time`;--> statement-breakpoint
ALTER TABLE `snippets` DROP COLUMN `success_rate`;--> statement-breakpoint
ALTER TABLE `usage_metrics` DROP COLUMN `project_type`;--> statement-breakpoint
ALTER TABLE `usage_metrics` DROP COLUMN `completion_time`;--> statement-breakpoint
ALTER TABLE `usage_metrics` DROP COLUMN `trigger_prefix`;