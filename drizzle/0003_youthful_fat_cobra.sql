CREATE TABLE `handComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`handId` int NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `handComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `handUpvotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`handId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `handUpvotes_id` PRIMARY KEY(`id`)
);
