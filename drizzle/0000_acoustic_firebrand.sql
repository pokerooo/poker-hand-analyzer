CREATE TABLE `hands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255),
	`description` text,
	`smallBlind` int NOT NULL,
	`bigBlind` int NOT NULL,
	`ante` int NOT NULL DEFAULT 0,
	`heroPosition` enum('UTG','UTG+1','UTG+2','MP','MP+1','CO','BTN','SB','BB') NOT NULL,
	`heroCard1` varchar(3) NOT NULL,
	`heroCard2` varchar(3) NOT NULL,
	`flopCard1` varchar(3),
	`flopCard2` varchar(3),
	`flopCard3` varchar(3),
	`turnCard` varchar(3),
	`riverCard` varchar(3),
	`actions` json NOT NULL,
	`overallRating` decimal(3,1),
	`preflopRating` decimal(3,1),
	`flopRating` decimal(3,1),
	`turnRating` decimal(3,1),
	`riverRating` decimal(3,1),
	`mistakeTags` json,
	`analysis` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mistakePatterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mistakeType` varchar(100) NOT NULL,
	`mistakeLabel` varchar(255) NOT NULL,
	`occurrenceCount` int NOT NULL DEFAULT 1,
	`handIds` json,
	`firstOccurrence` timestamp NOT NULL DEFAULT (now()),
	`lastOccurrence` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mistakePatterns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalHands` int NOT NULL DEFAULT 0,
	`averageRating` decimal(3,1),
	`avgPreflopRating` decimal(3,1),
	`avgFlopRating` decimal(3,1),
	`avgTurnRating` decimal(3,1),
	`avgRiverRating` decimal(3,1),
	`topMistakes` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userStats_id` PRIMARY KEY(`id`),
	CONSTRAINT `userStats_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
