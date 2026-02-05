ALTER TABLE `hands` ADD `shareToken` varchar(32);--> statement-breakpoint
ALTER TABLE `hands` ADD `isPublic` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `hands` ADD CONSTRAINT `hands_shareToken_unique` UNIQUE(`shareToken`);