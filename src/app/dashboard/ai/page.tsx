import React, { Suspense } from "react";
import { AITutorStudio } from "@/components/tutor/AITutorStudio";

export default function DashboardAIPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-10 text-center text-sm font-bold text-slate-500">
          Loading AI Voice Studio...
        </div>
      }
    >
      <AITutorStudio />
    </Suspense>
  );
}
