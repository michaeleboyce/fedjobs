import React, { useRef } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { toInputFormat, fromInputFormat } from '@/app/shared/utils/dateUtils';

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
  const cachedEndDateRef = useRef(tempEndDate);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm">Title:</label>
        <input
          className="border rounded px-2 py-1 w-full mb-2"
          value={tempTitle}
          onChange={(e) => setTempTitle(e.target.value)}
          placeholder="Title"
        />
      </div>
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
            value={toInputFormat(tempStartDate)}
            onChange={(e) => setTempStartDate(fromInputFormat(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm">End Date:</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={toInputFormat(tempEndDate)}
            onChange={(e) => setTempEndDate(fromInputFormat(e.target.value))}
            disabled={tempPresent}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={tempPresent}
            onChange={(e) => {
              const isChecked = e.target.checked;
              if (isChecked) {
                cachedEndDateRef.current = tempEndDate;
                setTempPresent(true);
                setTempEndDate("");
              } else {
                setTempPresent(false);
                setTempEndDate(cachedEndDateRef.current);
              }
            }}
          />
          <span>Present</span>
        </label>
      </div>
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
