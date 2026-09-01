"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <EmptyState
        title="The panel missed a refresh."
        body={error.message || "A public source failed in a way we could not isolate."}
      />
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
