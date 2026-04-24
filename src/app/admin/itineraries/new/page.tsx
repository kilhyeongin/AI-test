// src/app/admin/itineraries/new/page.tsx
import { Suspense } from "react";
import AdminItineraryNewClient from "./AdminItineraryNewClient";

export default function AdminItineraryNewPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">불러오는 중…</div>}>
      <AdminItineraryNewClient />
    </Suspense>
  );
}
