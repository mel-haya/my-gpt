import { serial, vector, text, pgTable, index, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const rolesEnum = pgEnum("roles", ["system", "user", "assistant"]);
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


export type InsertDocument = typeof documents.$inferInsert;
export type SelectDocument = typeof documents.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type SelectConversation = typeof conversations.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;
