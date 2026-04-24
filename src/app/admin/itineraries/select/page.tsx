// src/app/admin/itineraries/select/page.tsx
import { Suspense } from "react";
import SelectItineraryClient from "./SelectItineraryClient";

export default function AdminItinerarySelectPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">불러오는 중…</div>}>
      <SelectItineraryClient />
    </Suspense>
  );
}
