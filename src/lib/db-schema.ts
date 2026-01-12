import {
  serial,
  vector,
  text,
  pgTable,
  index,
  jsonb,
  pgEnum,
  uniqueIndex,
  integer,
  date,
  timestamp,
  boolean,
  real,
} from "drizzle-orm/pg-core";

export const rolesEnum = pgEnum("roles", ["system", "user", "assistant"]);
export const statusEnum = pgEnum("file_status", [
  "processing",
  "completed",
  "failed",
]);
export const testRunStatusEnum = pgEnum("test_run_status", [
  "Running",
  "Failed",
  "Done",
  "Stopped",
]);
export const testResultStatusEnum = pgEnum("test_result_status", [
  "Pending",
  "Running",
  "Success",
  "Failed",
  "Evaluating",
  "Stopped",
]);
export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    uploaded_file_id: integer("uploaded_file_id").references(
      () => uploadedFiles.id
    ),
  },
  (table) => [
    index("documents_embedding_index").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  title: text("title"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversation_id: integer("conversation_id")
    .notNull()
    .references(() => conversations.id),
  role: rolesEnum("role").notNull(),
  parts: jsonb("parts").notNull(),
  text_content: text("text_content"),
});

export const uploadedFiles = pgTable(
  "uploaded_files",
  {
    id: serial("id").primaryKey(),
    fileName: text("file_name").notNull(),
    fileHash: text("file_hash").notNull(),
    status: statusEnum("status").notNull().default("completed"),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    active: boolean("active").notNull().default(true),
  },
  (table) => [uniqueIndex("file_hash_index").on(table.fileHash)]
);

export const userTokenUsage = pgTable(
  "user_token_usage",
  {
    id: serial("id").primaryKey(),
    user_id: text("user_id").notNull(),
    usage_date: date("usage_date").notNull().defaultNow(),
    messages_sent: integer("messages_sent").notNull().default(0),
    tokens_used: integer("tokens_used").notNull().default(0),
    daily_message_limit: integer("daily_message_limit").notNull().default(10),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_date_index").on(table.user_id, table.usage_date),
    index("user_id_index").on(table.user_id),
  ]
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // Clerk user ID as string
    username: text("username").notNull(),
    email: text("email").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("email_index").on(table.email),
    uniqueIndex("username_index").on(table.username),
  ]
);

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    created_date: timestamp("created_date").notNull().defaultNow(),
    expiry_date: timestamp("expiry_date").notNull(),
  },
  (table) => [index("subscriptions_user_id_index").on(table.user_id)]
);

export const tests = pgTable(
  "tests",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    prompt: text("prompt").notNull(),
    expected_result: text("expected_result").notNull(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("tests_user_id_index").on(table.user_id)
  ]
);

export const testRuns = pgTable(
  "test_runs",
  {
    id: serial("id").primaryKey(),
    status: testRunStatusEnum("status").notNull().default("Running"),
    launched_at: timestamp("launched_at").notNull().defaultNow(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    profile_id: integer("profile_id").references(() => testProfiles.id, { onDelete: "set null" }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("test_runs_user_id_index").on(table.user_id),
    index("test_runs_status_index").on(table.status),
    index("test_runs_profile_id_index").on(table.profile_id),
  ]
);

export const testRunResults = pgTable(
  "test_run_results",
  {
    id: serial("id").primaryKey(),
    test_run_id: integer("test_run_id").references(() => testRuns.id),
    test_id: integer("test_id")
      .notNull()
      .references(() => tests.id),
    output: text("output"),
    explanation: text("explanation"),
    score: integer("score"), // Added score field for evaluation scores (1-10)
    tool_calls: jsonb("tool_calls"),
    model_used: text("model_used"),
    system_prompt: text("system_prompt"),
    tokens_cost: real("tokens_cost"), // Changed from integer to real to store dollar amounts
    execution_time_ms: integer("execution_time_ms"),
    status: testResultStatusEnum("status").notNull().default("Running"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("test_run_results_test_run_id_index").on(table.test_run_id),
    index("test_run_results_test_id_index").on(table.test_id),
    index("test_run_results_status_index").on(table.status),
  ]
);

export const systemPrompts = pgTable(
  "system_prompts",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    prompt: text("prompt").notNull(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    default: boolean("default").notNull().default(false),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("system_prompts_user_id_index").on(table.user_id),
    uniqueIndex("system_prompts_name_user_index").on(table.name, table.user_id),
  ]
);

export const testProfiles = pgTable(
  "test_profiles",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    system_prompt_id: integer("system_prompt_id")
      .references(() => systemPrompts.id, { onDelete: "set null" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("test_profiles_user_id_index").on(table.user_id),
    index("test_profiles_system_prompt_id_index").on(table.system_prompt_id),
    uniqueIndex("test_profiles_name_user_index").on(table.name, table.user_id),
  ]
);

export const testProfileTests = pgTable(
  "test_profile_tests",
  {
    id: serial("id").primaryKey(),
    profile_id: integer("profile_id")
      .notNull()
      .references(() => testProfiles.id, { onDelete: "cascade" }),
    test_id: integer("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("test_profile_tests_profile_id_index").on(table.profile_id),
    index("test_profile_tests_test_id_index").on(table.test_id),
    uniqueIndex("test_profile_tests_unique").on(table.profile_id, table.test_id),
  ]
);

export const testProfileModels = pgTable(
  "test_profile_models",
  {
    id: serial("id").primaryKey(),
    profile_id: integer("profile_id")
      .notNull()
      .references(() => testProfiles.id, { onDelete: "cascade" }),
    model_name: text("model_name").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("test_profile_models_profile_id_index").on(table.profile_id),
    uniqueIndex("test_profile_models_unique").on(table.profile_id, table.model_name),
  ]
);

export type InsertDocument = typeof documents.$inferInsert;
export type SelectDocument = typeof documents.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type SelectConversation = typeof conversations.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;
export type InsertUploadedFile = typeof uploadedFiles.$inferInsert;
export type SelectUploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUserTokenUsage = typeof userTokenUsage.$inferInsert;
export type SelectUserTokenUsage = typeof userTokenUsage.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertSettings = typeof settings.$inferInsert;
export type SelectSettings = typeof settings.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type SelectSubscription = typeof subscriptions.$inferSelect;
export type InsertTest = typeof tests.$inferInsert;
export type SelectTest = typeof tests.$inferSelect;
export type InsertTestRun = typeof testRuns.$inferInsert;
export type SelectTestRun = typeof testRuns.$inferSelect;
export type InsertTestRunResult = typeof testRunResults.$inferInsert;
export type SelectTestRunResult = typeof testRunResults.$inferSelect;
export type InsertSystemPrompt = typeof systemPrompts.$inferInsert;
export type SelectSystemPrompt = typeof systemPrompts.$inferSelect;
export type InsertTestProfile = typeof testProfiles.$inferInsert;
export type SelectTestProfile = typeof testProfiles.$inferSelect;
export type SelectTestProfileWithPrompt = SelectTestProfile & {
  system_prompt: string | null;
  username: string;
};
export type InsertTestProfileTest = typeof testProfileTests.$inferInsert;
export type SelectTestProfileTest = typeof testProfileTests.$inferSelect;
export type InsertTestProfileModel = typeof testProfileModels.$inferInsert;
export type SelectTestProfileModel = typeof testProfileModels.$inferSelect;
