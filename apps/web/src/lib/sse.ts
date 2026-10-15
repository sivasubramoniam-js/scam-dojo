/**
 * SSE reader over fetch for POST requests with streaming fallback.
 * Follows docs/2.frontend.md §4.
 */

import { API_BASE, ApiError, getLanguage } from "./api";

export interface SseEvent<T = any> {
  event: string;
  data: T;
}

export async function* sse(
  path: string,
  body: unknown,
  signal?: AbortSignal
): AsyncGenerator<SseEvent, void, unknown> {
  const lang = getLanguage();
  const url = `${API_BASE}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "Accept-Language": lang,
        "X-Dev-User": "guest",
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err: any) {
    if (signal?.aborted) return;
    throw new ApiError(err?.message || "Network error", "network", 0, true);
  }

  if (!res.ok) {
    let errJson: any = null;
    try {
      errJson = await res.json();
    } catch {
      // non-JSON
    }
    const err = errJson?.error;
    throw new ApiError(
      err?.message || `SSE request failed with status ${res.status}`,
      err?.code || "internal",
      res.status,
      err?.retryable ?? false,
      err?.messageKey
    );
  }

  // If response is not SSE, parse as JSON fallback
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    const json = await res.json();
    yield { event: "ack", data: json.ack };
    yield { event: "state", data: json.state };
    yield {
      event: "message_end",
      data: { i: json.message.i, text: json.message.text, role: json.message.role },
    };
    if (json.sessionEnd) {
      yield { event: "session_end", data: json.sessionEnd };
    }
    yield { event: "done", data: {} };
    return;
  }

  if (!res.body) {
    throw new ApiError("No response body received from stream", "empty_stream", 500);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let delimiterIndex: number;
      while ((delimiterIndex = buffer.indexOf("\n\n")) >= 0) {
        const rawChunk = buffer.slice(0, delimiterIndex);
        buffer = buffer.slice(delimiterIndex + 2);

        if (!rawChunk.trim() || rawChunk.startsWith(":")) {
          // Heartbeat ping comment
          continue;
        }

        const lines = rawChunk.split("\n");
        let eventType = "message";
        let dataStr = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataStr = line.slice(5).trim();
          }
        }

        if (dataStr) {
          try {
            const parsedData = JSON.parse(dataStr);
            yield { event: eventType, data: parsedData };
          } catch {
            // Raw text data
            yield { event: eventType, data: dataStr };
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
