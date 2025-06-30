CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key_id` text NOT NULL,
	`user_name` text NOT NULL,
	`prefix` text NOT NULL,
	`is_active` integer DEFAULT true,
	`usage_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_id_unique` ON `api_keys` (`key_id`);--> statement-breakpoint
CREATE TABLE `snippets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`prefix` text NOT NULL,
	`body` text NOT NULL,
	`description` text NOT NULL,
	`scope` text,
	`category` text DEFAULT 'general',
	`usage_count` integer DEFAULT 0,
	`last_used` integer DEFAULT (unixepoch()),
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`created_by` text DEFAULT 'system',
	FOREIGN KEY (`created_by`) REFERENCES `api_keys`(`key_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snippets_prefix_unique` ON `snippets` (`prefix`);--> statement-breakpoint
CREATE TABLE `usage_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snippet_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`language` text NOT NULL,
	`file_extension` text,
	`search_time` real,
	`was_accepted` integer DEFAULT true,
	`timestamp` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`snippet_id`) REFERENCES `snippets`(`id`) ON UPDATE no action ON DELETE cascade
);
