// File path: apps/web/app/(routes)/review-positions/page.tsx
// File: apps/web/app/(routes)/review-positions/page.tsx

"use client";

import React from "react";
import { PositionsProvider } from "@/app/_components/PositionCard/Context/PositionsContext";
import ReviewPositions from "@/app/_components/ReviewPositions";

export default function ReviewPositionsPage() {
  return (
    <PositionsProvider>
      <ReviewPositions />
    </PositionsProvider>
  );
}
