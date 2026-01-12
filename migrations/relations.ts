import { relations } from "drizzle-orm/relations";
import { conversations, messages, users, uploadedFiles, documents, systemPrompts, testProfiles, testProfileModels, testProfileTests, tests, subscriptions, testRuns, testRunResults } from "./schema";

export const messagesRelations = relations(messages, ({one}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({many}) => ({
	messages: many(messages),
}));

export const uploadedFilesRelations = relations(uploadedFiles, ({one, many}) => ({
	user: one(users, {
		fields: [uploadedFiles.userId],
		references: [users.id]
	}),
	documents: many(documents),
}));

export const usersRelations = relations(users, ({many}) => ({
	uploadedFiles: many(uploadedFiles),
	systemPrompts: many(systemPrompts),
	testProfiles: many(testProfiles),
	subscriptions: many(subscriptions),
	tests: many(tests),
	testRuns: many(testRuns),
}));

export const documentsRelations = relations(documents, ({one}) => ({
	uploadedFile: one(uploadedFiles, {
		fields: [documents.uploadedFileId],
		references: [uploadedFiles.id]
	}),
}));

export const systemPromptsRelations = relations(systemPrompts, ({one}) => ({
	user: one(users, {
		fields: [systemPrompts.userId],
		references: [users.id]
	}),
}));

export const testProfilesRelations = relations(testProfiles, ({one, many}) => ({
	user: one(users, {
		fields: [testProfiles.userId],
		references: [users.id]
	}),
	testProfileModels: many(testProfileModels),
	testProfileTests: many(testProfileTests),
	testRuns: many(testRuns),
}));

export const testProfileModelsRelations = relations(testProfileModels, ({one}) => ({
	testProfile: one(testProfiles, {
		fields: [testProfileModels.profileId],
		references: [testProfiles.id]
	}),
}));

export const testProfileTestsRelations = relations(testProfileTests, ({one}) => ({
	testProfile: one(testProfiles, {
		fields: [testProfileTests.profileId],
		references: [testProfiles.id]
	}),
	test: one(tests, {
		fields: [testProfileTests.testId],
		references: [tests.id]
	}),
}));

export const testsRelations = relations(tests, ({one, many}) => ({
	testProfileTests: many(testProfileTests),
	user: one(users, {
		fields: [tests.userId],
		references: [users.id]
	}),
	testRunResults: many(testRunResults),
}));

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id]
	}),
}));

export const testRunsRelations = relations(testRuns, ({one, many}) => ({
	user: one(users, {
		fields: [testRuns.userId],
		references: [users.id]
	}),
	testProfile: one(testProfiles, {
		fields: [testRuns.profileId],
		references: [testProfiles.id]
	}),
	testRunResults: many(testRunResults),
}));

export const testRunResultsRelations = relations(testRunResults, ({one}) => ({
	testRun: one(testRuns, {
		fields: [testRunResults.testRunId],
		references: [testRuns.id]
	}),
	test: one(tests, {
		fields: [testRunResults.testId],
		references: [tests.id]
	}),
}));