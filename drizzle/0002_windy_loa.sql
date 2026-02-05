ALTER TABLE `hands` MODIFY COLUMN `mistakeTags` json;--> statement-breakpoint
ALTER TABLE `mistakePatterns` MODIFY COLUMN `handIds` json;--> statement-breakpoint
ALTER TABLE `userStats` MODIFY COLUMN `topMistakes` json;