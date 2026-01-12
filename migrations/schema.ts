import { pgTable, foreignKey, serial, jsonb, text, uniqueIndex, index, date, integer, timestamp, boolean, vector, unique, real, pgEnum } from "drizzle-orm/pg-core"

export const fileStatus = pgEnum("file_status", ['processing', 'completed', 'failed'])
export const roles = pgEnum("roles", ['system', 'user', 'assistant'])
export const testResultStatus = pgEnum("test_result_status", ['Pending', 'Running', 'Success', 'Failed', 'Evaluating', 'Stopped'])
export const testRunStatus = pgEnum("test_run_status", ['Running', 'Failed', 'Done', 'Stopped'])


export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	conversationId: serial("conversation_id").notNull(),
	role: roles().notNull(),
	parts: jsonb().notNull(),
	textContent: text("text_content"),
}, (table) => [
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_conversations_id_fk"
		}),
]);

export const conversations = pgTable("conversations", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	title: text(),
});

export const userTokenUsage = pgTable("user_token_usage", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	usageDate: date("usage_date").defaultNow().notNull(),
	messagesSent: integer("messages_sent").default(0).notNull(),
	tokensUsed: integer("tokens_used").default(0).notNull(),
	dailyMessageLimit: integer("daily_message_limit").default(10).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("user_date_index").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.usageDate.asc().nullsLast().op("date_ops")),
	index("user_id_index").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const uploadedFiles = pgTable("uploaded_files", {
	id: serial().primaryKey().notNull(),
	fileName: text("file_name").notNull(),
	fileHash: text("file_hash").notNull(),
	status: fileStatus().default('completed').notNull(),
	userId: text("user_id").notNull(),
	active: boolean().default(true).notNull(),
}, (table) => [
	uniqueIndex("file_hash_index").using("btree", table.fileHash.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "uploaded_files_user_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	username: text().notNull(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("email_index").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("username_index").using("btree", table.username.asc().nullsLast().op("text_ops")),
]);

export const documents = pgTable("documents", {
	id: serial().primaryKey().notNull(),
	content: text().notNull(),
	uploadedFileId: integer("uploaded_file_id"),
	embedding: vector({ dimensions: 1536 }),
}, (table) => [
	index().using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	foreignKey({
			columns: [table.uploadedFileId],
			foreignColumns: [uploadedFiles.id],
			name: "documents_uploaded_file_id_uploaded_files_id_fk"
		}),
]);

export const settings = pgTable("settings", {
	id: serial().primaryKey().notNull(),
	key: text().notNull(),
	value: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("settings_key_unique").on(table.key),
]);

export const systemPrompts = pgTable("system_prompts", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	prompt: text().notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	default: boolean().default(false).notNull(),
}, (table) => [
	uniqueIndex("system_prompts_name_user_index").using("btree", table.name.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	index().using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "system_prompts_user_id_users_id_fk"
		}),
]);

export const testProfiles = pgTable("test_profiles", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	systemPrompt: text("system_prompt").notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("test_profiles_name_user_index").using("btree", table.name.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	index().using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "test_profiles_user_id_users_id_fk"
		}),
]);

export const testProfileModels = pgTable("test_profile_models", {
	id: serial().primaryKey().notNull(),
	profileId: integer("profile_id").notNull(),
	modelName: text("model_name").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index().using("btree", table.profileId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("test_profile_models_unique").using("btree", table.profileId.asc().nullsLast().op("int4_ops"), table.modelName.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [testProfiles.id],
			name: "test_profile_models_profile_id_test_profiles_id_fk"
		}).onDelete("cascade"),
]);

export const testProfileTests = pgTable("test_profile_tests", {
	id: serial().primaryKey().notNull(),
	profileId: integer("profile_id").notNull(),
	testId: integer("test_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index().using("btree", table.profileId.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.testId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("test_profile_tests_unique").using("btree", table.profileId.asc().nullsLast().op("int4_ops"), table.testId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [testProfiles.id],
			name: "test_profile_tests_profile_id_test_profiles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.testId],
			foreignColumns: [tests.id],
			name: "test_profile_tests_test_id_tests_id_fk"
		}).onDelete("cascade"),
]);

export const subscriptions = pgTable("subscriptions", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	createdDate: timestamp("created_date", { mode: 'string' }).defaultNow().notNull(),
	expiryDate: timestamp("expiry_date", { mode: 'string' }).notNull(),
}, (table) => [
	index().using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "subscriptions_user_id_users_id_fk"
		}),
]);

export const tests = pgTable("tests", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	prompt: text().notNull(),
	expectedResult: text("expected_result").notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index().using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tests_user_id_users_id_fk"
		}),
]);

export const testRuns = pgTable("test_runs", {
	id: serial().primaryKey().notNull(),
	status: testRunStatus().default('Running').notNull(),
	launchedAt: timestamp("launched_at", { mode: 'string' }).defaultNow().notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	profileId: integer("profile_id"),
}, (table) => [
	index().using("btree", table.profileId.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index().using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "test_runs_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [testProfiles.id],
			name: "test_runs_profile_id_test_profiles_id_fk"
		}).onDelete("set null"),
]);

export const testRunResults = pgTable("test_run_results", {
	id: serial().primaryKey().notNull(),
	testRunId: integer("test_run_id"),
	testId: integer("test_id").notNull(),
	output: text(),
	status: testResultStatus().default('Running').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	explanation: text(),
	toolCalls: jsonb("tool_calls"),
	modelUsed: text("model_used"),
	systemPrompt: text("system_prompt"),
	tokensCost: real("tokens_cost"),
	executionTimeMs: integer("execution_time_ms"),
	score: integer(),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index().using("btree", table.testId.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.testRunId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.testRunId],
			foreignColumns: [testRuns.id],
			name: "test_run_results_test_run_id_test_runs_id_fk"
		}),
	foreignKey({
			columns: [table.testId],
			foreignColumns: [tests.id],
			name: "test_run_results_test_id_tests_id_fk"
		}),
]);
