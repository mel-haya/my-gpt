interface StatisticsCardsProps {
  totalFiles: number;
  activeFilesCount: number;
  totalDocumentsCount: number;
}

export default function StatisticsCards({ 
  totalFiles, 
  activeFilesCount, 
  totalDocumentsCount 
}: StatisticsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white dark:bg-neutral-900 p-4 pb-8 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Files</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{totalFiles}</p>
          </div>
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 p-4 pb-8 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Active Files</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeFilesCount}</p>
          </div>
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 p-4 pb-8 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Embeddings</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalDocumentsCount}</p>
          </div>
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}