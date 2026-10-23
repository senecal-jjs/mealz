CREATE TABLE `favourites` (
	`recipe_id` text PRIMARY KEY NOT NULL,
	`saved_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `grocery_items` (
	`id` text PRIMARY KEY NOT NULL,
	`ingredient_id` text,
	`custom_name` text,
	`quantity` real,
	`unit` text,
	`checked` integer DEFAULT false NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`servings` integer NOT NULL,
	`added_at` integer NOT NULL,
	`cooked_at` integer,
	`rating` integer
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`id` integer PRIMARY KEY NOT NULL,
	`diet` text,
	`allergies` text DEFAULT '[]' NOT NULL,
	`disliked_ingredient_ids` text DEFAULT '[]' NOT NULL,
	`default_servings` integer DEFAULT 2 NOT NULL,
	`units` text DEFAULT 'us' NOT NULL,
	`onboarded_at` integer
);
