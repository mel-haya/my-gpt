import { db } from "@/lib/db-config";
import { testRunResults, models } from "@/lib/db-schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("Checking models data...");
  const allModels = await db.select().from(models);
  console.log(
    "All Models:",
    allModels.map((m) => ({ id: m.id, name: m.name, model_id: m.model_id })),
  );

  console.log("\nChecking test_run_results for model_id=3...");
  const trr3 = await db
    .select({
      id: testRunResults.id,
      model_id: testRunResults.model_id,
      cost: testRunResults.tokens_cost,
      score: testRunResults.score,
    })
    .from(testRunResults)
    .where(eq(testRunResults.model_id, 3))
    .limit(5);
  console.log("Entries for model 3:", trr3);

  console.log("\nTesting Left Join Query...");
  const joinQuery = await db
    .select({
      id: models.id,
      name: models.name,
      avgScore: sql<number>`avg(${testRunResults.score})`,
      totalCost: sql<number>`sum(${testRunResults.tokens_cost})`,
      count: sql<number>`count(${testRunResults.id})`,
    })
    .from(models)
    .leftJoin(testRunResults, eq(models.id, testRunResults.model_id))
    .groupBy(models.id);

  console.log(
    "Join Query Result:",
    joinQuery.map((r) => ({
      id: r.id,
      name: r.name,
      avgScore: r.avgScore,
      totalCost: r.totalCost,
      count: r.count,
    })),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
