"use client";
export function ConnectionStatusCard({ status, loading, hasCredentials }) {
    if (loading) {
        return (<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-20 animate-pulse rounded bg-slate-100"/>
      </div>);
    }
    return (<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Connection Status</h3>

      {!hasCredentials ? (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-slate-300"/>
            <span className="text-sm font-medium text-slate-500">Not configured</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Enter your WhatsApp credentials below to connect.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${status?.connected ? "bg-emerald-500" : "bg-red-500"}`}/>
            <span className="text-sm font-medium text-slate-900">
              {status?.connected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-xs text-slate-500">
              Provider: <span className="font-medium text-slate-700">Meta WhatsApp Cloud API</span>
            </div>
            {status?.health_check_passed !== null && (
              <div className="text-xs text-slate-500">
                Health check:{" "}
                <span className={`font-medium ${status?.health_check_passed ? "text-emerald-600" : "text-red-600"}`}>
                  {status?.health_check_passed ? "Passed" : "Failed"}
                </span>
              </div>
            )}
            {status?.last_health_check_at && (
              <div className="text-xs text-slate-500">
                Last checked:{" "}
                <span className="font-medium text-slate-700">
                  {new Date(status.last_health_check_at).toLocaleString()}
                </span>
              </div>
            )}
            {status?.last_successful_message ? (
              <div className="text-xs text-slate-500">
                Last sent:{" "}
                <span className="font-medium text-slate-700">
                  {new Date(status.last_successful_message).toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="text-xs text-slate-400">No messages sent yet</div>
            )}
          </div>
        </>
      )}
    </div>);
}
