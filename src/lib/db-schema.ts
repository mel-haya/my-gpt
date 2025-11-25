import { serial, vector, text, pgTable, index, jsonb, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";

export const rolesEnum = pgEnum("roles", ["system", "user", "assistant"]);
export const statusEnum = pgEnum("file_status", ["processing", "completed", "failed"]);
export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
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
});

export const uploadedFiles = pgTable(
  "uploaded_files",
  {
    id: serial("id").primaryKey(),
    fileName: text("file_name").notNull(),
    fileHash: text("file_hash").notNull(),
    status: statusEnum("status").notNull().default("completed"),
  },
  (table) => [
    uniqueIndex("file_hash_index").on(table.fileHash),
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
