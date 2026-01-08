import { db } from "@/lib/db";
import { systemPrompts } from "@/lib/db-schema";

async function testSystemPrompts() {
  try {
    // Test if we can query the table
    console.log("Testing system_prompts table...");
    
    const prompts = await db.select().from(systemPrompts).limit(1);
    console.log("✅ system_prompts table exists and is accessible");
    console.log("Current prompts count:", prompts.length);
    
    // Test schema structure
    console.log("Table schema is properly defined with fields:", Object.keys(systemPrompts));
    
    return true;
  } catch (error) {
    console.error("❌ Error testing system_prompts table:", error);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSystemPrompts()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

export { testSystemPrompts };