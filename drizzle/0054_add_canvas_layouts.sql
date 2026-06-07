CREATE TABLE `canvas_layouts` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `episode_id` text,
  `scope` text DEFAULT 'project' NOT NULL,
  `nodes_json` text DEFAULT '[]' NOT NULL,
  `edges_json` text DEFAULT '[]' NOT NULL,
  `viewport_json` text DEFAULT '{}' NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `canvas_layouts_project_scope_idx`
ON `canvas_layouts` (`project_id`, `scope`);
