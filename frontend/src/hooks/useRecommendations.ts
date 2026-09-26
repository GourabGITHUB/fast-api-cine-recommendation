import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  fetchRecommendations,
  isQueryType,
  type QueryType,
  type RecommendationItem,
} from "../api/recommend";

export type RequestStatus = "idle" | "loading" | "success" | "error";

export interface LastQuery {
  query_type: QueryType;
  query: string;
}

export interface RecState {
  status: RequestStatus;
  items: RecommendationItem[];
  error: string | null;
  lastQuery: LastQuery | null;
}

export function useRecommendations() {
  const [state, setState] = useState<RecState>({
    status: "idle",
    items: [],
    error: null,
    lastQuery: null,
  });

  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<LastQuery | null>(null);

  // abort any in-flight request when the app unmounts
  useEffect(() => () => abortRef.current?.abort(), []);

  const request = useCallback(async (queryType: string, rawQuery: string) => {
    const fail = (message: string) =>
      setState((s) => ({ ...s, status: "error", error: message }));

    if (!isQueryType(queryType)) {
      fail(`Query type must be "context" or "title".`);
      return;
    }
    const query = rawQuery.trim();
    if (!query) {
      fail("Describe a mood or name a title before launching a search.");
      return;
    }

    const id = ++requestId.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const lastQuery: LastQuery = { query_type: queryType, query };
    lastQueryRef.current = lastQuery;
    setState({ status: "loading", items: [], error: null, lastQuery });

    try {
      const items = await fetchRecommendations(lastQuery, { signal: controller.signal });
      if (requestId.current !== id) return; // superseded
      if (items.length === 0) {
        setState({
          status: "error",
          items: [],
          error: "The engine came back with zero matches for that signal — try rephrasing or widening the vibe.",
          lastQuery,
        });
        return;
      }
      setState({ status: "success", items, error: null, lastQuery });
    } catch (error) {
      if (requestId.current !== id) return; // superseded by a newer request
      const message =
        error instanceof ApiError
          ? error.message
          : "Something unexpected happened while contacting the engine.";
      setState({ status: "error", items: [], error: message, lastQuery });
    }
  }, []);

  const retry = useCallback(() => {
    const last = lastQueryRef.current;
    if (last) void request(last.query_type, last.query);
  }, [request]);

  const reset = useCallback(() => {
    requestId.current += 1;
    abortRef.current?.abort();
    lastQueryRef.current = null;
    setState({ status: "idle", items: [], error: null, lastQuery: null });
  }, []);

  return { ...state, request, retry, reset };
}
