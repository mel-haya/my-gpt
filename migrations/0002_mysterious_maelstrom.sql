DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_conversation_id_conversations_id_fk'
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" 
        FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") 
        ON DELETE no action ON UPDATE no action;
    END IF;
END $$;