import { Suspense } from "react";
import { ExportClient } from "./export-client";

export default function ExportPage() {
  return (
    <div className="container-page">
      <Suspense
        fallback={
          <div className="text-sm text-gray-500">Preparing export view...</div>
        }
      >
        <ExportClient />
      </Suspense>
    </div>
  );
}

