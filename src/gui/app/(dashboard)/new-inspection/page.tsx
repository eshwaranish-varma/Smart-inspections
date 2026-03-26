import { Suspense } from "react";
import NewInspection from "@/components/inspection-pages/NewInspection";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NewInspection />
    </Suspense>
  );
}
