CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key_id` text NOT NULL,
	`user_name` text NOT NULL,
	`prefix` text NOT NULL,
	`is_active` integer DEFAULT true,
	`expires_at` integer,
	`usage_count` integer DEFAULT 0,
	`last_used` integer,
	`created_at` integer DEFAULT (unixepoch()),
	`created_by` text DEFAULT 'admin',
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_id_unique` ON `api_keys` (`key_id`);