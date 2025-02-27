// File path: apps/web/app/(routes)/review-positions/page.tsx
// File: apps/web/app/(routes)/review-positions/page.tsx

"use client";

import React from "react";
import { PositionsProvider } from "@/app/features/positions/context";
import ReviewPositions from "@/app/features/positions/components/ReviewPositions";

export default function ReviewPositionsPage() {
  return (
    <PositionsProvider>
      <ReviewPositions />
    </PositionsProvider>
  );
}
