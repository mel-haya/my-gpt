import { NextRequest, NextResponse } from 'next/server';
import { checkRole } from '@/lib/checkRole';
import { db } from '@/lib/db-config';
import { userTokenUsage, type SelectUserTokenUsage } from '@/lib/db-schema';
import { sql, desc, asc } from 'drizzle-orm';

interface UserUsageStats extends SelectUserTokenUsage {
  remaining_messages: number;
  usage_percentage: number;
  total_usage_days: number;
  total_tokens_all_time: number;
  total_messages_all_time: number;
}

interface UsersUsageResponse {
  users: UserUsageStats[];
  totalUsers: number;
  totalTokensToday: number;
  totalMessagesToday: number;
  averageDailyLimit: number;
}

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const isAdmin = await checkRole('admin');
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'usage_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const dateFilter = searchParams.get('date'); // Optional date filter (YYYY-MM-DD)

    const offset = (page - 1) * limit;

    // Build the base query
    let whereCondition = sql`1=1`;
    if (dateFilter) {
      whereCondition = sql`${userTokenUsage.usage_date} = ${dateFilter}`;
    }

    // Get users with detailed statistics
    const usersWithStats = await db
      .select({
        // Basic user data
        id: userTokenUsage.id,
        user_id: userTokenUsage.user_id,
        usage_date: userTokenUsage.usage_date,
        messages_sent: userTokenUsage.messages_sent,
        tokens_used: userTokenUsage.tokens_used,
        daily_message_limit: userTokenUsage.daily_message_limit,
        created_at: userTokenUsage.created_at,
        updated_at: userTokenUsage.updated_at,
        
        // Calculated fields
        remaining_messages: sql<number>`GREATEST(0, ${userTokenUsage.daily_message_limit} - ${userTokenUsage.messages_sent})`,
        usage_percentage: sql<number>`CASE 
          WHEN ${userTokenUsage.daily_message_limit} > 0 
          THEN ROUND((${userTokenUsage.messages_sent}::numeric / ${userTokenUsage.daily_message_limit}::numeric) * 100, 2)
          ELSE 0 
        END`,
        
        // Aggregated stats per user
        total_usage_days: sql<number>`(
          SELECT COUNT(DISTINCT usage_date) 
          FROM user_token_usage u2 
          WHERE u2.user_id = ${userTokenUsage.user_id}
        )`,
        total_tokens_all_time: sql<number>`(
          SELECT COALESCE(SUM(tokens_used), 0) 
          FROM user_token_usage u3 
          WHERE u3.user_id = ${userTokenUsage.user_id}
        )`,
        total_messages_all_time: sql<number>`(
          SELECT COALESCE(SUM(messages_sent), 0) 
          FROM user_token_usage u4 
          WHERE u4.user_id = ${userTokenUsage.user_id}
        )`
      })
      .from(userTokenUsage)
      .where(whereCondition)
      .orderBy(
        sortOrder === 'desc' 
          ? desc(sql.identifier(sortBy))
          : asc(sql.identifier(sortBy))
      )
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(userTokenUsage)
      .where(whereCondition);
    
    const totalUsers = totalCountResult[0]?.count || 0;

    // Get aggregate statistics for today's date or filtered date
    const today = dateFilter || new Date().toISOString().split('T')[0];
    const todayStats = await db
      .select({
        totalTokensToday: sql<number>`COALESCE(SUM(tokens_used), 0)`,
        totalMessagesToday: sql<number>`COALESCE(SUM(messages_sent), 0)`,
        averageDailyLimit: sql<number>`COALESCE(AVG(daily_message_limit), 0)`,
        userCount: sql<number>`COUNT(*)`
      })
      .from(userTokenUsage)
      .where(sql`${userTokenUsage.usage_date} = ${today}`);

    const stats = todayStats[0] || {
      totalTokensToday: 0,
      totalMessagesToday: 0,
      averageDailyLimit: 0,
      userCount: 0
    };

    const response: UsersUsageResponse = {
      users: usersWithStats as UserUsageStats[],
      totalUsers,
      totalTokensToday: stats.totalTokensToday,
      totalMessagesToday: stats.totalMessagesToday,
      averageDailyLimit: Math.round(stats.averageDailyLimit * 100) / 100,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching user usage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user usage data' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a user's daily limit
export async function PUT(request: NextRequest) {
  try {
    // Check if user is admin
    const isAdmin = await checkRole('admin');
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, dailyLimit } = body;

    if (!userId || typeof dailyLimit !== 'number' || dailyLimit < 0) {
      return NextResponse.json(
        { error: 'Invalid userId or dailyLimit provided' },
        { status: 400 }
      );
    }

    // Update the daily limit for the user
    const today = new Date().toISOString().split('T')[0];
    
    // First, try to update existing record for today
    const updated = await db
      .update(userTokenUsage)
      .set({
        daily_message_limit: dailyLimit,
        updated_at: new Date()
      })
      .where(sql`${userTokenUsage.user_id} = ${userId} AND ${userTokenUsage.usage_date} = ${today}`)
      .returning();

    // If no record exists for today, create one
    if (updated.length === 0) {
      await db
        .insert(userTokenUsage)
        .values({
          user_id: userId,
          usage_date: today,
          messages_sent: 0,
          tokens_used: 0,
          daily_message_limit: dailyLimit
        });
    }

    return NextResponse.json({
      message: 'Daily limit updated successfully',
      userId,
      newDailyLimit: dailyLimit
    });

  } catch (error) {
    console.error('Error updating daily limit:', error);
    return NextResponse.json(
      { error: 'Failed to update daily limit' },
      { status: 500 }
    );
  }
}
