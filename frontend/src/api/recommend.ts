/**
 * API layer for the NEBULA recommendation engine.
 * Talks to the existing FastAPI backend via POST /recommend.
 * No presentation concerns live here.
 */
export type QueryType = "context" | "title";

export interface RecommendationItem {
  title: string;
  description: string;
}

export interface RecommendRequest {
  query_type: QueryType;
  query: string;
}

export class ApiError extends Error {
  status?: number;
  detail?: string;
  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Runtime validation — accepts only the two contract values. */
export function isQueryType(value: unknown): value is QueryType {
  return value === "context" || value === "title";
}

function normalizeItem(raw: unknown): RecommendationItem | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const title = typeof rec.title === "string" ? rec.title.trim() : "";
  if (!title) return null;
  const description =
    typeof rec.description === "string" && rec.description.trim().length > 0
      ? rec.description.trim()
      : "No synopsis was provided for this recommendation.";
  return { title, description };
}

function extractItems(payload: unknown): RecommendationItem[] {
  const list: unknown = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as Record<string, unknown>).recommendations ??
        (payload as Record<string, unknown>).results ??
        (payload as Record<string, unknown>).items)
      : null;

  if (!Array.isArray(list)) {
    throw new ApiError("The engine responded in an unexpected format (missing recommendations list).");
  }
  return list.map(normalizeItem).filter((x): x is RecommendationItem => x !== null);
}

export async function fetchRecommendations(
  request: RecommendRequest,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<RecommendationItem[]> {
  if (!isQueryType(request.query_type)) {
    throw new ApiError(`Invalid query_type "${String(request.query_type)}" — expected "context" or "title".`);
  }
  const query = request.query.trim();
  if (query.length === 0) {
    throw new ApiError("The query is empty — describe a mood or name a title first.");
  }

  const { signal, timeoutMs = 40000 } = options ?? {};
  const controller = new AbortController();
  const relayAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", relayAbort, { once: true });
  }
  const timer = window.setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    timeoutMs,
  );
async function getRequestToken() {
  const API_URL = import.meta.env.VITE_API_URL;

  const response = await fetch(`${API_URL}/request-token`);

  if (!response.ok) {
    throw new Error("Could not obtain request token");
  }

  const data = await response.json();

  return data.token;
}

try {
  const API_URL = import.meta.env.VITE_API_URL;

  // Get a fresh, single-use token
  const token = await getRequestToken();

  const response = await fetch(`${API_URL}/recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Token": token,
    },
    body: JSON.stringify({
      query_type: request.query_type,
      query,
    }),
    signal: controller.signal,
  });


    if (!response.ok) {
      let detail = "";
      try {
        detail = (await response.text()).slice(0, 240);
      } catch {
        /* body unreadable — ignore */
      }
      const friendly =
        response.status === 404
          ? "The /recommend endpoint was not found on this server."
          : response.status === 422
            ? "The engine rejected the request format (HTTP 422)."
            : `The engine answered with an error (HTTP ${response.status}).`;
      throw new ApiError(friendly, response.status, detail || undefined);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError("The engine returned a response that was not valid JSON.");
    }
    return extractItems(payload);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const reason = (controller.signal.reason ?? error) as { name?: string } | null;
    if (reason?.name === "AbortError") throw error; // superseded by a newer request
    if (reason?.name === "TimeoutError") {
      throw new ApiError("The engine is taking too long to answer — it may be waking up. Try again.");
    }
    throw new ApiError(
      "Could not reach the recommendation service server, please try again.",
    );
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", relayAbort);
  }
}
