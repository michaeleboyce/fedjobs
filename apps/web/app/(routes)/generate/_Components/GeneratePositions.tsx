// File path: apps/web/app/(routes)/generate/_Components/GeneratePositions.tsx
// File: apps/web/app/(routes)/generate/_Components/GeneratePositions.tsx
"use client";
import React from "react";
import { Position } from "@fedjobs/types";
import { PositionCard } from "@/app/_components/PositionCard";

type GeneratePositionsProps = {
  employmentHistory: Position[];
  otherPositions: Position[];
  selectedState: {
    [positionUuid: string]: {
      selectedActivities: number[];
      selectedAccomplishments: number[];
    };
  };
  onSelectionChange: (newState: GeneratePositionsProps["selectedState"]) => void;
};

export function GeneratePositions({
  employmentHistory,
  otherPositions,
  selectedState,
  onSelectionChange,
}: GeneratePositionsProps) {
  
  // 1) Sorting: date descending
  // We'll define a helper to get a time from a position:
  function getTime(pos: Position): number {
    // Use endDate if present, else startDate
    const baseDate = pos.date.endDate || pos.date.startDate;
    return new Date(baseDate).getTime();
  }

  // Sort descending
  function sortDesc(a: Position, b: Position) {
    return getTime(b) - getTime(a);
  }

  const sortedEmployment = [...employmentHistory].sort(sortDesc);
  const sortedOther = [...otherPositions].sort(sortDesc);

  // 2) Simple checkbox toggling logic
  function handleCheckboxChange(
    positionUuid: string, 
    type: "activities" | "accomplishments", 
    idx: number
  ) {
    const current = selectedState[positionUuid] || {
      selectedActivities: [],
      selectedAccomplishments: [],
    };
    const arrayToUpdate =
      type === "activities" ? current.selectedActivities : current.selectedAccomplishments;

    let newArray;
    if (arrayToUpdate.includes(idx)) {
      newArray = arrayToUpdate.filter((i) => i !== idx);
    } else {
      newArray = [...arrayToUpdate, idx];
    }

    const newState = {
      ...selectedState,
      [positionUuid]: {
        ...current,
        [type === "activities" ? "selectedActivities" : "selectedAccomplishments"]: newArray,
      },
    };
    onSelectionChange(newState);
  }

  // “Select All” or “Clear All”
  function handleSelectAll(position: Position) {
    const current = selectedState[position.positionUuid] || {
      selectedActivities: [],
      selectedAccomplishments: [],
    };

    const allActivities = position.details.activities.map((_, i) => i);
    const allAccomplishments = position.details.accomplishments.map((_, i) => i);

    const newState = {
      ...selectedState,
      [position.positionUuid]: {
        ...current,
        selectedActivities: allActivities,
        selectedAccomplishments: allAccomplishments,
      },
    };
    onSelectionChange(newState);
  }

  function handleClearAll(position: Position) {
    const current = selectedState[position.positionUuid] || {
      selectedActivities: [],
      selectedAccomplishments: [],
    };
    const newState = {
      ...selectedState,
      [position.positionUuid]: {
        ...current,
        selectedActivities: [],
        selectedAccomplishments: [],
      },
    };
    onSelectionChange(newState);
  }

  return (
    <div className="bg-white p-4 my-4 rounded border">
      <h2 className="text-xl font-bold mb-4">Select Positions for Generation</h2>
      
      {/* Display “Employment History” first, then “Other Positions” */}
      <h3 className="text-lg font-semibold mb-2">Employment History</h3>
      {sortedEmployment.map((pos) => {
        const selections = selectedState[pos.positionUuid] || {
          selectedActivities: [],
          selectedAccomplishments: [],
        };
        return (
          <PositionCard
            key={pos.positionUuid}
            position={pos}
            isEmploymentHistory={true}
            isGenerationView={true}
            selectionMode={true}
            selectedActivities={selections.selectedActivities}
            selectedAccomplishments={selections.selectedAccomplishments}
            onCheckboxChange={(type, idx) => handleCheckboxChange(pos.positionUuid, type, idx)}
            onSelectAll={() => handleSelectAll(pos)}
            onClearAll={() => handleClearAll(pos)}
          />
        );
      })}

    </div>
  );
}
