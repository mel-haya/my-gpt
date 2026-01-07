"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import TestsTable from "./TestsTable";
import TestRunPieChart from "./TestRunPieChart";
import TestRunner from "./TestRunner";
import { getTestsWithStatus } from "@/app/actions/tests";
import type { TestWithUser } from "@/services/testsService";

interface TestStatusResult {
  isRunning: boolean;
  progress?: {
    Success: number;
    Failed: number;
    Running: number;
    Pending: number;
    Evaluating: number;
    Stopped: number;
    total: number;
  };
  startedAt?: string;
}

interface TestsDashboardProps {
  initialData: {
    tests: TestWithUser[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  searchQuery: string;
}

export default function TestsDashboard({ initialData, searchQuery }: TestsDashboardProps) {
  const searchParams = useSearchParams();
  const [isTestsRunning, setIsTestsRunning] = useState(false);
  const [lastStatusResult, setLastStatusResult] = useState<TestStatusResult | undefined>(undefined);
  const [lastCompletedCount, setLastCompletedCount] = useState<number>(0);
  const [tableData, setTableData] = useState(initialData);
  
  const pieChartRefreshRef = useRef<(() => void) | null>(null);
  const tableRefreshRef = useRef<(() => void) | null>(null);
  const wasRunningRef = useRef(false);
  const currentPageRef = useRef(Number(searchParams.get('page')) || 1);

  // Function to refresh table data while preserving current page
  const refreshTableData = useCallback(async () => {
    try {
      const currentPage = Number(searchParams.get('page')) || 1;
      const newData = await getTestsWithStatus(
        searchQuery.trim() || undefined,
        10, // itemsPerPage
        currentPage // preserve current page
      );
      setTableData(newData);
    } catch (error) {
      console.error("Error refreshing table data:", error);
    }
  }, [searchQuery, searchParams]);

  // Update table data when URL search params change (for pagination/search)
  useEffect(() => {
    const newPage = Number(searchParams.get('page')) || 1;
    const pageChanged = newPage !== currentPageRef.current;
    
    if (pageChanged) {
      // Update page reference and schedule state reset
      currentPageRef.current = newPage;
      // Use setTimeout to avoid cascading renders
      setTimeout(() => {
        setLastCompletedCount(0);
        setLastStatusResult(undefined);
      }, 0);
    }
    
    Promise.resolve().then(() => {
      refreshTableData();
    });
  }, [searchParams, refreshTableData]);

  // Function to check test status and update polling state
  const checkTestStatus = useCallback(async () => {
    try {
      const statusResponse = await fetch('/api/admin/test-status');
      if (statusResponse.ok) {
        const statusResult = await statusResponse.json();
        
        // Check if the status result is different from the previous one
        const statusChanged = JSON.stringify(statusResult) !== JSON.stringify(lastStatusResult);
        
        // Check if tests were running and now completed
        const wasRunning = wasRunningRef.current;
        const isStillRunning = statusResult.isRunning;
        
        setIsTestsRunning(isStillRunning);
        
        // If tests just started (weren't running before, but are now), refresh table immediately
        if (!wasRunning && isStillRunning) {
          refreshTableData();
        }
        
        if (isStillRunning) {
          // Calculate completed count (Success + Failed) from progress
          if (statusResult.progress) {
            const currentCompletedCount = (statusResult.progress.Success || 0) + (statusResult.progress.Failed || 0);
            
            // Initialize lastCompletedCount if it's 0 (first run or after page change)
            if (lastCompletedCount === 0 && currentCompletedCount > 0) {
              setLastCompletedCount(currentCompletedCount);
            }
            // Refresh table when completed count increases (tests finish)
            else if (currentCompletedCount > lastCompletedCount) {
              setLastCompletedCount(currentCompletedCount);
              // Refresh table data when tests complete
              setTimeout(() => {
                refreshTableData();
              }, 1000);
            }
            // Also refresh if status changed significantly (could indicate test completion)
            else if (statusChanged && currentCompletedCount > 0) {
              setTimeout(() => {
                refreshTableData();
              }, 1000);
            }
          }
        } else {
          // If tests were running and now stopped, refresh table with final results
          if ((wasRunning && !isStillRunning) || statusChanged) {
            // Reset completion tracking when tests stop
            setLastCompletedCount(0);
            // Refresh table data
            setTimeout(() => {
              refreshTableData();
            }, 1000); // Small delay to ensure backend processing is complete
          }
        }
        
        // Update the ref and last status for next iteration
        wasRunningRef.current = isStillRunning;
        setLastStatusResult(statusResult);
      }
    } catch (error) {
      console.error("Error checking test status:", error);
    }
  }, [lastStatusResult, lastCompletedCount, refreshTableData]);

  // Initial status check to see if tests are already running
  useEffect(() => {
    async function checkInitialStatus() {
      try {
        const statusResponse = await fetch('/api/admin/test-status');
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();
          setIsTestsRunning(statusResult.isRunning);
          if (statusResult.isRunning) {
            wasRunningRef.current = true;
            setLastStatusResult(statusResult);
            
            // Initialize completed count tracking
            if (statusResult.progress) {
              const initialCompletedCount = (statusResult.progress.Success || 0) + (statusResult.progress.Failed || 0);
              setLastCompletedCount(initialCompletedCount);
            }
          }
        }
      } catch (error) {
        console.error("Error checking initial test status:", error);
      }
    }
    checkInitialStatus();
  }, []); // Only run once on mount

  // Polling effect - only runs when tests are running
  useEffect(() => {
    if (!isTestsRunning) return;

    const interval = setInterval(checkTestStatus, 2000); // Poll every 2 seconds when tests are running

    return () => clearInterval(interval);
  }, [isTestsRunning, checkTestStatus]);

  // Function to handle test completion from TestRunner
  const handleTestsComplete = useCallback(() => {
    // When tests start, immediately begin polling
    if (!isTestsRunning) {
      setIsTestsRunning(true);
      // Reset completion tracking when starting new tests
      setLastCompletedCount(0);
      setLastStatusResult(undefined);
    }
    // Immediately refresh table data when tests start
    refreshTableData();
    // Force a status check
    checkTestStatus();
  }, [checkTestStatus, isTestsRunning, refreshTableData]);

  return (
    <div className="flex flex-col w-full max-w-350 mx-4 2xl:mx-auto my-4 gap-4 px-3">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tests Dashboard</h1>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-1/2 order-2 lg:order-1">
          <TestRunPieChart 
            onRefreshRef={(refreshFn) => {
              pieChartRefreshRef.current = refreshFn;
            }}
            isTestsRunning={isTestsRunning}
            pollingStats={lastStatusResult}
          />
        </div>
        <div className="w-full lg:w-1/2 h-full flex justify-start lg:justify-center items-center order-1 lg:order-2">
          <TestRunner onTestsComplete={handleTestsComplete} isTestsRunning={isTestsRunning} />
        </div>
      </div>
      
      <TestsTable
        tests={tableData.tests}
        pagination={tableData.pagination}
        searchQuery={searchQuery}
        onRefreshRef={(refreshFn) => {
          tableRefreshRef.current = refreshFn;
        }}
        onDataRefresh={refreshTableData}
      />
    </div>
  );
}