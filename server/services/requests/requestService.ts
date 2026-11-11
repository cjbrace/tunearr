import type { Request } from "../../db/index";
import {
  findPendingRequestForAlbum,
  findRequestById,
  insertRequest,
  listRequests,
  saveRequest,
  deleteRequest,
} from "../../db/requests";
import { hasPermission, Permission } from "../../../shared/permissions";
import { getAlbumByMbid } from "../lidarr/helpers";
import { fulfillRequest } from "./fulfillRequest";
import { createLogger } from "../../logger";
import { AsyncLock } from "../../api/asyncLock";
import { classifyRequest, refreshLidarrData } from "./lidarrEnrichment";
import {
  notifyRequestApproved,
  notifyRequestCreated,
  notifyRequestDeclined,
} from "../notifications";

type CreateRequestResult =
  | { status: "approved"; requestId: number }
  | { status: "pending"; requestId: number }
  | { status: "already_monitored"; requestId: number }
  | { status: "duplicate_pending"; requestId: number }
  | { status: "failed"; requestId: number };

type ApproveRequestResult =
  | { status: "approved" }
  | { status: "already_monitored" }
  | { status: "not_found" }
  | { status: "already_resolved" }
  | { status: "failed" };

const APPROVAL_STATUSES = new Set(["pending", "approved", "declined"]);

type DeclineRequestResult =
  | { status: "declined" }
  | { status: "not_found" }
  | { status: "already_resolved" };

const log = createLogger("requests");
const failedRequestLock = new AsyncLock();

type FailedRequestActionResult =
  | { status: "not_found" | "not_failed" }
  | { status: "wanted" | "imported" | "downloading" }
  | { status: "failed"; error: string };

/**
 * Retry the existing historical request, including albums already monitored
 * with missing files. An active download is left alone.
 */
export async function retryFailedRequest(
  requestId: number
): Promise<FailedRequestActionResult> {
  return failedRequestLock.acquire(String(requestId), async () => {
    const request = await findRequestById(requestId);
    if (!request) return { status: "not_found" };
    if (request.status !== "approved" || request.lidarr_status !== "failed")
      return { status: "not_failed" };

    try {
      const { queueMap, importedMap, wantedMap } = await refreshLidarrData();
      const live = classifyRequest(
        request.album_mbid,
        queueMap,
        importedMap,
        wantedMap
      );
      if (live.status === "downloading") {
        request.lidarr_status = "downloading";
        await saveRequest(request);
        return { status: "downloading" };
      }

      const result = await fulfillRequest(request.album_mbid, {
        searchIfMonitored: true,
      });
      request.lidarr_status = result.searchQueued ? "wanted" : "imported";
      await saveRequest(request);
      log.info(
        `Retried failed request #${requestId}: ${request.lidarr_status}`
      );
      return { status: result.searchQueued ? "wanted" : "imported" };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Retry failed";
      request.lidarr_status = "failed";
      await saveRequest(request);
      log.error(`Failed to retry request #${requestId}: ${error}`);
      return { status: "failed", error };
    }
  });
}

/** Delete only a failed request row; do not change Lidarr or media. */
export async function removeFailedRequest(
  requestId: number
): Promise<{ status: "removed" | "not_found" | "not_failed" }> {
  return failedRequestLock.acquire(String(requestId), async () => {
    const request = await findRequestById(requestId);
    if (!request) return { status: "not_found" };
    if (request.status !== "approved" || request.lidarr_status !== "failed")
      return { status: "not_failed" };
    await deleteRequest(request);
    log.info(`Removed failed request history #${requestId}`);
    return { status: "removed" };
  });
}

function shouldAutoApprove(userPermissions: number): boolean {
  return hasPermission(userPermissions, [
    Permission.ADMIN,
    Permission.AUTO_APPROVE,
    Permission.MANAGE_REQUESTS,
  ]);
}

async function resolveAlbumInfo(
  albumMbid: string
): Promise<{ artistName: string; albumTitle: string }> {
  const lookupAlbum = await getAlbumByMbid(albumMbid);
  return {
    artistName: lookupAlbum.artist?.artistName ?? "Unknown Artist",
    albumTitle: lookupAlbum.title ?? "Unknown Album",
  };
}

export async function createRequest(
  userId: number,
  userPermissions: number,
  albumMbid: string
): Promise<CreateRequestResult> {
  const existingPending = await findPendingRequestForAlbum(albumMbid);
  if (existingPending) {
    return { status: "duplicate_pending", requestId: existingPending.id };
  }

  const { artistName, albumTitle } = await resolveAlbumInfo(albumMbid);

  const saved = await insertRequest({
    userId,
    albumMbid,
    artistName,
    albumTitle,
  });
  log.info(`Request #${saved.id} created by user ${userId} for ${albumTitle}`);

  if (shouldAutoApprove(userPermissions)) {
    return processApproval(saved, userId);
  }

  // Only a request that still needs a decision is worth an admin's attention.
  void notifyRequestCreated(saved);

  return { status: "pending", requestId: saved.id };
}

async function processApproval(
  request: Request,
  approvedBy: number
): Promise<CreateRequestResult> {
  request.status = "approved";
  request.approved_by = approvedBy;
  request.approved_at = new Date().toISOString();

  try {
    const result = await fulfillRequest(request.album_mbid);
    await saveRequest(request);

    log.info(`Request #${request.id} auto-approved and fulfilled`);

    if (result.status === "already_monitored") {
      return { status: "already_monitored", requestId: request.id };
    }

    return { status: "approved", requestId: request.id };
  } catch (err) {
    request.lidarr_status = "failed";
    await saveRequest(request);
    log.error(`Failed to fulfill request #${request.id}: ${err}`);
    return { status: "failed", requestId: request.id };
  }
}

export async function approveRequest(
  requestId: number,
  approvedBy: number
): Promise<ApproveRequestResult> {
  const request = await findRequestById(requestId);

  if (!request) {
    return { status: "not_found" };
  }

  if (request.status !== "pending") {
    return { status: "already_resolved" };
  }

  request.status = "approved";
  request.approved_by = approvedBy;
  request.approved_at = new Date().toISOString();

  try {
    const result = await fulfillRequest(request.album_mbid);
    await saveRequest(request);

    log.info(`Request #${requestId} approved by user ${approvedBy}`);
    void notifyRequestApproved(request);

    if (result.status === "already_monitored") {
      return { status: "already_monitored" };
    }

    return { status: "approved" };
  } catch (err) {
    request.lidarr_status = "failed";
    await saveRequest(request);
    log.error(`Failed to fulfill request #${requestId}: ${err}`);
    return { status: "failed" };
  }
}

export async function declineRequest(
  requestId: number
): Promise<DeclineRequestResult> {
  const request = await findRequestById(requestId);

  if (!request) {
    return { status: "not_found" };
  }

  if (request.status !== "pending") {
    return { status: "already_resolved" };
  }

  request.status = "declined";
  await saveRequest(request);

  log.info(`Request #${requestId} declined`);
  void notifyRequestDeclined(request);

  return { status: "declined" };
}

export async function getRequests(filters?: {
  status?: string[];
  userId?: number;
}) {
  return listRequests(filters, APPROVAL_STATUSES);
}
