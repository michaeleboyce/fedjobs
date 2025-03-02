// File path: apps/web/app/features/positions/components/ReviewPositions/EditPositionsForm.tsx

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { Position } from "@fedjobs/types";
import { Button } from '@/app/shared/components/ui/Button';

interface EditPositionFormProps {
  position: Position;
  onCancel: () => void;
  onSave: () => void;
  isLoading: boolean;
  onChange: (field: keyof Position, value: any) => void;
}

export const EditPositionForm: React.FC<EditPositionFormProps> = ({
  position,
  onCancel,
  onSave,
  isLoading,
  onChange,
}) => {
  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="font-bold">Edit Position:</h4>
      {/* Title */}
      <div className="mb-2">
        <label className="block font-semibold">Title:</label>
        <input
          type="text"
          value={position.title?.title || ""}
          onChange={(e) =>
            onChange("title", { title: e.target.value })
          }
          className="border p-2 rounded w-full"
        />
      </div>
      {/* Organization */}
      <div className="mb-2">
        <label className="block font-semibold">Organization:</label>
        <input
          type="text"
          value={position.organization?.name || ""}
          onChange={(e) =>
            onChange("organization", { name: e.target.value })
          }
          className="border p-2 rounded w-full"
        />
      </div>
      {/* Dates */}
      <div className="mb-2 flex space-x-2">
        <div>
          <label className="block font-semibold">Start Date:</label>
          <input
            type="date"
            value={position.date?.startDate || ""}
            onChange={(e) =>
              onChange("date", {
                ...position.date,
                startDate: e.target.value,
              })
            }
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="block font-semibold">End Date:</label>
          <input
            type="date"
            value={position.date?.endDate || ""}
            onChange={(e) =>
              onChange("date", {
                ...position.date,
                endDate: e.target.value,
              })
            }
            className="border p-2 rounded"
          />
        </div>
        <div className="flex items-center mt-6">
          <input
            type="checkbox"
            checked={position.date?.present || false}
            onChange={(e) =>
              onChange("date", {
                ...position.date,
                present: e.target.checked,
              })
            }
            className="mr-2"
          />
          <label>Present</label>
        </div>
      </div>
      {/* Activities */}
      <div className="mb-2">
        <h5 className="font-semibold">Activities:</h5>
        {position.details?.activities && position.details.activities.length > 0 ? (
          <ul className="list-disc list-inside space-y-2">
            {position.details.activities.map((activity, idx) => (
              <li key={idx} className="bg-gray-100 p-2 rounded-lg">
                <input
                  type="text"
                  value={activity}
                  onChange={(e) => {
                    const newActivities = [
                      ...(position.details?.activities || []),
                    ];
                    newActivities[idx] = e.target.value;
                    onChange("details", {
                      ...position.details,
                      activities: newActivities,
                    });
                  }}
                  className="border p-2 rounded w-full"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No activities found.</p>
        )}
      </div>
      {/* Accomplishments */}
      <div className="mb-2">
        <h5 className="font-semibold">Accomplishments:</h5>
        {position.details?.accomplishments &&
        position.details.accomplishments.length > 0 ? (
          <ul className="list-disc list-inside space-y-2">
            {position.details.accomplishments.map(
              (accomplishment, idx) => (
                <li key={idx} className="bg-gray-100 p-2 rounded-lg">
                  <input
                    type="text"
                    value={accomplishment}
                    onChange={(e) => {
                      const newAccomplishments = [
                        ...(position.details?.accomplishments || []),
                      ];
                      newAccomplishments[idx] = e.target.value;
                      onChange("details", {
                        ...position.details,
                        accomplishments: newAccomplishments,
                      });
                    }}
                    className="border p-2 rounded w-full"
                  />
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="text-gray-500">No accomplishments found.</p>
        )}
      </div>

      {/* Save and Cancel Buttons */}
      <div className="flex space-x-2 mt-4">
        <Button
          onClick={onSave}
          variant="primary"
          disabled={isLoading}
          leftIcon={<FontAwesomeIcon icon={faCheckCircle} />}
          className="bg-green-500 hover:bg-green-600"
        >
          Save
        </Button>
        <Button
          onClick={onCancel}
          variant="secondary"
          leftIcon={<FontAwesomeIcon icon={faTimesCircle} />}
          className="bg-gray-500 text-white hover:bg-gray-600"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

