import { DocumentCheckIcon } from "@heroicons/react/24/outline";

export function FormPerformanceOverview() {
  return (
    <div className="flex h-full flex-col rounded-xl bg-white p-4 shadow-md transition hover:shadow-[0_2px_6px_rgba(34,197,94,0.25)] dark:bg-gray-800">
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <DocumentCheckIcon className="h-15 w-15 text-gray-300 dark:text-gray-600" />
        <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white">
          Add your analytical experience here
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Show Graph data for better understanding
        </p>
      </div>
    </div>
  );
}
