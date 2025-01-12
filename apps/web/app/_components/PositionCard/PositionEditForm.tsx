// File path: apps/web/app/_components/PositionCard/PositionEditForm.tsx
import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

const buttonBase = "inline-flex items-center gap-1 text-sm px-2 py-1 rounded";
const buttonClasses = {
  primary: `${buttonBase} bg-blue-600 text-white hover:bg-blue-700`,
  danger: `${buttonBase} bg-red-600 text-white hover:bg-red-700`,
};

interface PositionEditFormProps {
  tempTitle: string;
  setTempTitle: (value: string) => void;
  tempOrg: string;
  setTempOrg: (value: string) => void;
  tempStartDate: string;
  setTempStartDate: (value: string) => void;
  tempEndDate: string;
  setTempEndDate: (value: string) => void;
  tempPresent: boolean;
  setTempPresent: (value: boolean) => void;
  tempActivities: string[];
  setTempActivities: (activities: string[]) => void;
  tempAccomplishments: string[];
  setTempAccomplishments: (accomplishments: string[]) => void;
}

export const PositionEditForm: React.FC<PositionEditFormProps> = ({
  tempTitle,
  setTempTitle,
  tempOrg,
  setTempOrg,
  tempStartDate,
  setTempStartDate,
  tempEndDate,
  setTempEndDate,
  tempPresent,
  setTempPresent,
  tempActivities,
  setTempActivities,
  tempAccomplishments,
  setTempAccomplishments,
}) => {
  return (
    <div className="space-y-4">
      {/* Organization and date fields */}
      <div>
        <label className="block text-sm">Organization:</label>
        <input
          className="border rounded px-2 py-1 w-full mb-2"
          value={tempOrg}
          onChange={(e) => setTempOrg(e.target.value)}
          placeholder="Organization"
        />
      </div>
      <div className="flex flex-wrap gap-4 mt-2">
        <div>
          <label className="block text-sm">Start Date:</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={tempStartDate}
            onChange={(e) => setTempStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm">End Date:</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={tempEndDate}
            onChange={(e) => setTempEndDate(e.target.value)}
            disabled={tempPresent}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={tempPresent}
            onChange={(e) => setTempPresent(e.target.checked)}
          />
          <span>Present</span>
        </label>
      </div>

      {/* Activities */}
      <div>
        <label className="font-bold block mb-2">Activities:</label>
        <div className="space-y-2">
          {tempActivities.map((activity, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={activity}
                onChange={(e) => {
                  const newActivities = [...tempActivities];
                  newActivities[idx] = e.target.value;
                  setTempActivities(newActivities);
                }}
                className="flex-1 border rounded px-2 py-1"
              />
              <button
                onClick={() => setTempActivities(tempActivities.filter((_, i) => i !== idx))}
                className={buttonClasses.danger}
              >
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                <span>Remove</span>
              </button>
            </div>
          ))}
          <button
            onClick={() => setTempActivities([...tempActivities, ""])}
            className={buttonClasses.primary}
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* Accomplishments */}
      <div>
        <label className="font-bold block mb-2">Accomplishments:</label>
        <div className="space-y-2">
          {tempAccomplishments.map((accomplishment, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={accomplishment}
                onChange={(e) => {
                  const newAccomplishments = [...tempAccomplishments];
                  newAccomplishments[idx] = e.target.value;
                  setTempAccomplishments(newAccomplishments);
                }}
                className="flex-1 border rounded px-2 py-1"
              />
              <button
                onClick={() => setTempAccomplishments(tempAccomplishments.filter((_, i) => i !== idx))}
                className={buttonClasses.danger}
              >
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                <span>Remove</span>
              </button>
            </div>
          ))}
          <button
            onClick={() => setTempAccomplishments([...tempAccomplishments, ""])}
            className={buttonClasses.primary}
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            <span>Add Accomplishment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
