/**
 * Consume a Server-Sent Events stream from the query endpoint.
 * Calls onToken for each streamed token, then calls onDone with final metadata.
 */
export async function consumeSSEStream(
  url: string,
  body: object,
  token: string,
  onToken: (token: string) => void,
  onDone: (data: { conversation_id: string; message_id?: string; sources: Source[] }) => void,
  onError?: (err: Error) => void,
  signal?: AbortSignal,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    let detail = response.statusText;
    try {
      const json = (await response.json()) as { detail?: string };
      if (json.detail) detail = json.detail;
    } catch {
      // non-JSON error body
    }
    onError?.(new Error(detail));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        if (parsed.token !== undefined) {
          onToken(parsed.token);
        }
        if (parsed.done) {
          onDone({
            conversation_id: parsed.conversation_id,
            message_id: parsed.message_id,
            sources: parsed.sources ?? [],
          });
        }
      } catch {
        // malformed SSE line — skip
      }
    }
  }
}

export interface Source {
  doc_id: string;
  filename: string;
  chunk_index: number;
  excerpt: string;
}
