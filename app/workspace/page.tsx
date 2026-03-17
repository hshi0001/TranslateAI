import { Suspense } from "react";
import { WorkspaceClient } from "./workspace-client";

export default function WorkspacePage() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-[13px] text-gray-500">Loading...</div>}>
        <WorkspaceClient />
      </Suspense>
    </div>
  );
}

