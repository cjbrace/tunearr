import { useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { RequestItem } from "@/types";
import RequestCardActions from "./RequestCardActions";
import RequestCardAdminDetails from "./RequestCardAdminDetails";

interface RequestCardProps {
  request: RequestItem;
  index: number;
  showUser?: boolean;
  showActions?: boolean;
  showAdminDetails?: boolean;
  showFailedActions?: boolean;
  onApprove?: (id: number) => void;
  onDecline?: (id: number) => void;
  onSearch?: (albumId: number) => void;
  onUnmonitor?: (albumMbid: string) => void;
  onRetry?: (id: number) => Promise<void>;
  onRemove?: (id: number) => Promise<void>;
}

function resolveDisplayStatus(request: RequestItem): string {
  if (request.lidarr?.status) return request.lidarr.status;
  return request.status;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

export default function RequestCard({
  request,
  index,
  showUser = false,
  showActions = false,
  showAdminDetails = false,
  showFailedActions = false,
  onApprove,
  onDecline,
  onSearch,
  onUnmonitor,
  onRetry,
  onRemove,
}: RequestCardProps) {
  const displayStatus = resolveDisplayStatus(request);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (action: (id: number) => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action(request.id);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Request action failed"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="stagger-fade-in bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border-2 border-black shadow-cartoon-md hover:-translate-y-0.5 hover:shadow-cartoon-lg transition-all"
      style={{ "--stagger-index": index } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-gray-900 dark:text-gray-100 font-medium truncate">
            <a
              href={`/album/${encodeURIComponent(request.albumMbid)}`}
              className="hover:underline"
              title="View album details and track list"
            >
              {request.albumTitle || request.albumMbid}
            </a>
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
            {request.artistName || "Unknown Artist"}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-400 text-xs">
              {formatDate(request.createdAt)}
            </span>
            {showUser && request.user && (
              <span className="flex items-center gap-1 text-gray-400 text-xs">
                {request.user.thumb && (
                  <img
                    src={request.user.thumb}
                    alt=""
                    className="w-4 h-4 rounded-full"
                  />
                )}
                {request.user.username}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3 shrink-0">
          {showActions && request.status === "pending" && (
            <RequestCardActions
              requestId={request.id}
              onApprove={onApprove}
              onDecline={onDecline}
            />
          )}
          <StatusBadge status={displayStatus} />
        </div>
      </div>

      {showAdminDetails && request.lidarr && request.lidarr.status && (
        <RequestCardAdminDetails
          lidarr={request.lidarr}
          albumMbid={request.albumMbid}
          onSearch={onSearch}
          onUnmonitor={onUnmonitor}
        />
      )}

      {showFailedActions && request.retryable && (
        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            disabled={busy}
            onClick={() => onRetry && void runAction(onRetry)}
            className="px-2 py-1 text-xs font-bold rounded-md border-2 border-black bg-pink-400 hover:bg-pink-300 disabled:opacity-50"
          >
            Retry request
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                onRemove &&
                window.confirm(
                  "Remove this failed request from history? Lidarr and music files will stay as they are."
                )
              )
                void runAction(onRemove);
            }}
            className="px-2 py-1 text-xs font-bold rounded-md border-2 border-black bg-gray-200 dark:bg-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Remove request
          </button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="mt-2 text-xs text-rose-500">
          {actionError}
        </p>
      )}
    </div>
  );
}
