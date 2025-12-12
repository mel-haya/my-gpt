import { serial, vector, text, pgTable, index, jsonb, pgEnum, uniqueIndex, integer, date, timestamp, boolean } from "drizzle-orm/pg-core";

export const rolesEnum = pgEnum("roles", ["system", "user", "assistant"]);
export const statusEnum = pgEnum("file_status", ["processing", "completed", "failed"]);
export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    uploaded_file_id: integer("uploaded_file_id").references(() => uploadedFiles.id),
  },
  (table) => [
    index("documents_embedding_index").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    user_id: text("user_id").notNull(),
    title: text("title"),
  }
);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversation_id: serial("conversation_id").notNull().references(() => conversations.id),
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
    user_id: text("user_id").notNull().references(() => users.id),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("file_hash_index").on(table.fileHash),
  ]
);

export const userTokenUsage = pgTable(
  "user_token_usage",
  {
    id: serial("id").primaryKey(),
    user_id: text("user_id").notNull(), // Clerk user ID as string
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
