"use client";
export function ConnectionStatusCard({ status, loading, hasCredentials }) {
    if (loading) {
        return (<div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="h-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800"/>
      </div>);
    }
    return (<div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Connection Status</h3>

      {!hasCredentials ? (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-gray-300"/>
            <span className="text-sm font-medium text-gray-500">Not configured</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Enter your WhatsApp credentials below to connect.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${status?.connected ? "bg-green-500" : "bg-red-500"}`}/>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {status?.connected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Provider: <span className="font-medium text-gray-700 dark:text-gray-300">Meta WhatsApp Cloud API</span>
            </div>
            {status?.health_check_passed !== null && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Health check:{" "}
                <span className={`font-medium ${status?.health_check_passed ? "text-green-600" : "text-red-600"}`}>
                  {status?.health_check_passed ? "Passed" : "Failed"}
                </span>
              </div>
            )}
            {status?.last_health_check_at && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last checked:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {new Date(status.last_health_check_at).toLocaleString()}
                </span>
              </div>
            )}
            {status?.last_successful_message ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last sent:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {new Date(status.last_successful_message).toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="text-xs text-gray-400">No messages sent yet</div>
            )}
          </div>
        </>
      )}
    </div>);
}
