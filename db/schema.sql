CREATE TABLE `access_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`feature_id` text,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`anchors` text NOT NULL,
	`resolved` integer DEFAULT 0 NOT NULL,
	`resolved_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comments_parent` ON `comments` (`parent_id`);--> statement-breakpoint
CREATE TABLE `edits` (
	`block_id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`version` integer NOT NULL,
	`author_id` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_name_key` ON `people` (`name_key`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`feature_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`note` text NOT NULL,
	`content_hash` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`feature_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`block_id` text NOT NULL,
	`author_id` text NOT NULL,
	`before_text` text NOT NULL,
	`after_text` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revisions_block_version` ON `revisions` (`block_id`,`version`);--> statement-breakpoint
CREATE INDEX `revisions_created_at` ON `revisions` (`created_at`);