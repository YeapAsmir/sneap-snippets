CREATE TABLE `snippets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`prefix` text NOT NULL,
	`body` text NOT NULL,
	`description` text NOT NULL,
	`scope` text,
	`category` text DEFAULT 'general',
	`tags` text,
	`usage_count` integer DEFAULT 0,
	`last_used` integer DEFAULT (unixepoch()),
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`created_by` text DEFAULT 'system',
	`avg_completion_time` real DEFAULT 0,
	`success_rate` real DEFAULT 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snippets_prefix_unique` ON `snippets` (`prefix`);--> statement-breakpoint
CREATE TABLE `usage_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snippet_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`language` text NOT NULL,
	`file_extension` text,
	`project_type` text,
	`search_time` real,
	`completion_time` real,
	`trigger_prefix` text,
	`was_accepted` integer DEFAULT true,
	`timestamp` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`snippet_id`) REFERENCES `snippets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`favorite_categories` text,
	`excluded_categories` text,
	`custom_keywords` text,
	`avg_session_length` real DEFAULT 0,
	`preferred_languages` text,
	`typing_speed` real DEFAULT 50,
	`last_active` integer DEFAULT (unixepoch()),
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_preferences_user_id_unique` ON `user_preferences` (`user_id`);