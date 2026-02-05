CREATE TABLE `handTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`handId` int NOT NULL,
	`userId` int NOT NULL,
	`tag` varchar(50) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#3b82f6',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `handTags_id` PRIMARY KEY(`id`)
);
