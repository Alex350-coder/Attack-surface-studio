"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAssistantQuery } from "../api/use-assistant-query";

type Props = {
  projectId: string;
};

/**
 * Read-only Q&A over this project's graph. Renders the answer as plain text -- never as
 * executable markup -- and surfaces `truncated` so the user knows when the graph context sent to
 * the model was capped rather than complete.
 */
export function AssistantQueryPanel({ projectId }: Props) {
  const [question, setQuestion] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const assistantQuery = useAssistantQuery(projectId);

  function handleSubmit(): void {
    if (!question.trim()) {
      setValidationError("Ask a question first.");
      return;
    }
    setValidationError(null);
    assistantQuery.mutate({ question: question.trim() });
  }

  const errorMessage = validationError ?? (assistantQuery.isError ? assistantQuery.error.message : null);

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        id="assistant-question"
        label="Ask about this project's graph"
        value={question}
        onChange={setQuestion}
        placeholder="Which hosts have unpatched critical findings?"
        disabled={assistantQuery.isPending}
      />

      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--node-critical)]">
          {errorMessage}
        </p>
      ) : null}

      <Button type="button" size="sm" disabled={assistantQuery.isPending} onClick={handleSubmit} className="self-start">
        {assistantQuery.isPending ? "Asking…" : "Ask"}
      </Button>

      {assistantQuery.data ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
          <p className="whitespace-pre-wrap text-sm text-[var(--color-foreground)]">{assistantQuery.data.answer}</p>
          {assistantQuery.data.truncated ? (
            <p className="text-xs text-[var(--color-foreground-muted)]">
              The graph context sent to the assistant was truncated to the most relevant nodes.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
