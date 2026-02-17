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
export const feedbackTypeEnum = pgEnum("feedback_type", [
  "positive",
  "negative",
]);

export const activityCategoryEnum = pgEnum("activity_category", [
  "restaurants",
  "tours",
  "wellness",
  "sports",
  "entertainment",
  "shopping",
  "culture",
  "nature",
]);

export const priceIndicatorEnum = pgEnum("price_indicator", [
  "free",
  "$",
  "$$",
  "$$$",
  "$$$$",
]);

export const staffRequestCategoryEnum = pgEnum("staff_request_category", [
  "reservation",
  "room_issue",
  "room_service",
  "housekeeping",
  "maintenance",
  "concierge",
  "other",
]);

export const staffRequestUrgencyEnum = pgEnum("staff_request_urgency", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const staffRequestStatusEnum = pgEnum("staff_request_status", [
  "pending",
  "in_progress",
  "done",
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",

  "hotel_owner",
  "hotel_staff",
]);

export const staffRequests = pgTable(
  "staff_requests",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    admin_title: text("admin_title"),
    admin_description: text("admin_description"),
    category: staffRequestCategoryEnum("category").notNull(),
    urgency: staffRequestUrgencyEnum("urgency").notNull().default("medium"),
    room_number: integer("room_number"),
    guest_contact: text("guest_contact"),
    status: staffRequestStatusEnum("status").notNull().default("pending"),
    completed_by: text("completed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    completion_note: text("completion_note"),
    hotel_id: integer("hotel_id").references(() => hotels.id, {
      onDelete: "set null",
    }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    completed_at: timestamp("completed_at"),
  },
  (table) => [
    index("staff_requests_status_index").on(table.status),
    index("staff_requests_urgency_index").on(table.urgency),
    index("staff_requests_created_at_index").on(table.created_at),
    index("staff_requests_hotel_id_index").on(table.hotel_id),
  ],
);

export const hotels = pgTable(
  "hotels",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    image: text("image"),
    location: text("location").notNull(),
    preferred_language: text("preferred_language").notNull().default("english"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    slug: text("slug").unique(),
    system_prompt_id: integer("system_prompt_id").references(
      () => systemPrompts.id,
      { onDelete: "set null" },
    ),
    model_id: integer("model_id").references(() => models.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("hotels_name_index").on(table.name),
    uniqueIndex("hotels_name_unique").on(table.name),
    index("hotels_system_prompt_id_index").on(table.system_prompt_id),
    index("hotels_model_id_index").on(table.model_id),
  ],
);

export const hotelStaff = pgTable(
  "hotel_staff",
  {
    id: serial("id").primaryKey(),
    hotel_id: integer("hotel_id")
      .notNull()
      .references(() => hotels.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("hotel_staff_hotel_id_index").on(table.hotel_id),
    index("hotel_staff_user_id_index").on(table.user_id),
    uniqueIndex("hotel_staff_unique").on(table.hotel_id, table.user_id),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    uploaded_file_id: integer("uploaded_file_id").references(
      () => uploadedFiles.id,
    ),
  },
  (table) => [
    index("documents_embedding_index").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  user_id: text("user_id"),
  title: text("title"),
  hotel_id: integer("hotel_id").references(() => hotels.id, {
    onDelete: "cascade",
  }),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversation_id: integer("conversation_id")
    .notNull()
    .references(() => conversations.id),
  role: rolesEnum("role").notNull(),
  parts: jsonb("parts").notNull(),
  text_content: text("text_content"),
  model_used: text("model_used"),
  created_at: timestamp("created_at").notNull().defaultNow(),
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
    downloadUrl: text("download_url"),
    hotel_id: integer("hotel_id").references(() => hotels.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("file_hash_index").on(table.fileHash),
    index("uploaded_files_hotel_id_index").on(table.hotel_id),
  ],
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
  ],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // Clerk user ID as string
    username: text("username").notNull(),
    email: text("email").notNull(),
    role: userRoleEnum("role").default("hotel_staff"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("email_index").on(table.email),
    uniqueIndex("username_index").on(table.username),
  ],
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
  (table) => [index("subscriptions_user_id_index").on(table.user_id)],
);

export const tests = pgTable(
  "tests",
  {
    id: serial("id").primaryKey(),
    prompt: text("prompt").notNull(),
    expected_result: text("expected_result").notNull(),
    category: text("category"),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    is_manual: boolean("is_manual").notNull().default(false),
  },
  (table) => [index("tests_user_id_index").on(table.user_id)],
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
    profile_id: integer("profile_id").references(() => testProfiles.id, {
      onDelete: "set null",
    }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("test_runs_user_id_index").on(table.user_id),
    index("test_runs_status_index").on(table.status),
    index("test_runs_profile_id_index").on(table.profile_id),
  ],
);

export const testRunResults = pgTable(
  "test_run_results",
  {
    id: serial("id").primaryKey(),
    test_run_id: integer("test_run_id").references(() => testRuns.id),
    test_id: integer("test_id").references(() => tests.id),
    output: text("output"),
    explanation: text("explanation"),
    score: integer("score"), // Added score field for evaluation scores (1-10)
    tool_calls: jsonb("tool_calls"),
    model_id: integer("model_id").references(() => models.id, {
      onDelete: "set null",
    }),

    tokens_cost: real("tokens_cost"), // Changed from integer to real to store dollar amounts
    token_count: integer("token_count"),
    execution_time_ms: integer("execution_time_ms"),
    status: testResultStatusEnum("status").notNull().default("Running"),
    evaluator_model: text("evaluator_model"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("test_run_results_test_run_id_index").on(table.test_run_id),
    index("test_run_results_test_id_index").on(table.test_id),
    index("test_run_results_status_index").on(table.status),
    index("test_run_results_model_id_index").on(table.model_id),
  ],
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
  ],
);

export const testProfiles = pgTable(
  "test_profiles",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    system_prompt_id: integer("system_prompt_id").references(
      () => systemPrompts.id,
      { onDelete: "set null" },
    ),
    manual_tests: jsonb("manual_tests"),
    hotel_id: integer("hotel_id").references(() => hotels.id, {
      onDelete: "set null",
    }),
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
  ],
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
    uniqueIndex("test_profile_tests_unique").on(
      table.profile_id,
      table.test_id,
    ),
  ],
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
    uniqueIndex("test_profile_models_unique").on(
      table.profile_id,
      table.model_name,
    ),
  ],
);

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  message_id: integer("message_id").references(() => messages.id),
  feedback: feedbackTypeEnum("feedback").notNull(),
  submitted_at: timestamp("submitted_at").notNull().defaultNow(),
  submitted_by: text("submitted_by").notNull().default("anonymous"),
  conversation_id: integer("conversation_id").references(
    () => conversations.id,
  ),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  category: activityCategoryEnum("category"),
  distance_from_hotel: text("distance_from_hotel"),
  price_indicator: priceIndicatorEnum("price_indicator"),
  phone: text("phone"),
  website: text("website"),
  image_url: text("image_url"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const models = pgTable(
  "models",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    model_id: text("model_id").notNull().unique(),
    default: boolean("default").notNull().default(false),
    victories: integer("victories").notNull().default(0),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("models_model_id_index").on(table.model_id)],
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
export type SelectTestProfileWithDetails = SelectTestProfile & {
  system_prompt: string | null;
  username: string;
  hotel_name: string | null;
  latest_status: string | null;
  total_tokens_cost: number | null;
  total_tokens: number | null;
  average_score: number | null;
  best_model: string | null;
};
export type InsertTestProfileTest = typeof testProfileTests.$inferInsert;
export type SelectTestProfileTest = typeof testProfileTests.$inferSelect;
export type InsertTestProfileModel = typeof testProfileModels.$inferInsert;
export type SelectTestProfileModel = typeof testProfileModels.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;
export type SelectFeedback = typeof feedback.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;
export type SelectActivity = typeof activities.$inferSelect;
export type InsertModel = typeof models.$inferInsert;
export type SelectModel = typeof models.$inferSelect;
export type InsertStaffRequest = typeof staffRequests.$inferInsert;
export type SelectStaffRequest = typeof staffRequests.$inferSelect;
export type InsertHotel = typeof hotels.$inferInsert;
export type SelectHotel = typeof hotels.$inferSelect;
export type InsertHotelStaff = typeof hotelStaff.$inferInsert;
export type SelectHotelStaff = typeof hotelStaff.$inferSelect;
