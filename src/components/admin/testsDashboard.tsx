"use client";

import { useState, useEffect, useRef } from "react";
import TestsTable from "./TestsTable";
import TestRunPieChart from "./TestRunPieChart";
import TestRunner from "./TestRunner";
import { getTestsWithStatus } from "@/app/actions/tests";
import type { TestWithUser } from "@/services/testsService";

interface TestsDashboardProps {
  searchParams: {
    page?: string;
    search?: string;
  };
}

export default function TestsDashboard({ searchParams }: TestsDashboardProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const searchQuery = searchParams?.search || "";
  const itemsPerPage = 10;

  const [data, setData] = useState<{
    tests: TestWithUser[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  } | null>(null);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pieChartRefreshRef = useRef<() => void>(undefined);
  const tableRefreshRef = useRef<() => void>(undefined);

  // Function to refresh both components
  const refreshComponents = () => {
    setRefreshTrigger(prev => prev + 1);
    pieChartRefreshRef.current?.();
    tableRefreshRef.current?.();
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getTestsWithStatus(
          searchQuery.trim() || undefined,
          itemsPerPage,
          currentPage
        );
        setData(result);
      } catch (error) {
        console.error("Error fetching tests:", error);
      }
    };

    fetchData();
  }, [currentPage, searchQuery, refreshTrigger]);

  if (!data) {
    return (
      <div className="flex flex-col w-full max-w-350 mx-4 2xl:mx-auto my-4 gap-4">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-350 mx-4 2xl:mx-auto my-4 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tests Dashboard</h1>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6 items-start px-3">
        <div className="w-full lg:w-1/2 order-2 lg:order-1">
          <TestRunPieChart 
            onRefreshRef={(refreshFn) => { pieChartRefreshRef.current = refreshFn; }}
          />
        </div>
        <div className="w-full lg:w-1/2 h-full flex justify-start lg:justify-center items-center order-1 lg:order-2">
          <TestRunner onTestsComplete={refreshComponents} />
        </div>
      </div>
      
      <TestsTable
        tests={data.tests}
        pagination={data.pagination}
        searchQuery={searchQuery}
        onRefreshRef={(refreshFn) => { tableRefreshRef.current = refreshFn; }}
      />
    </div>
  );
}