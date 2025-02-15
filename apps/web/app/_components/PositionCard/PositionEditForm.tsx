// File path: apps/web/app/_components/PositionCard/PositionEditForm.tsx

import React, { useRef } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

// Base CSS classes for buttons
const buttonBase = "inline-flex items-center gap-1 text-sm px-2 py-1 rounded";

// Predefined button classes for primary and danger buttons
const buttonClasses = {
  primary: `${buttonBase} bg-blue-600 text-white hover:bg-blue-700`,
  danger: `${buttonBase} bg-red-600 text-white hover:bg-red-700`,
};

/**
 * Converts a date string from "mm/dd/yyyy" format to "yyyy-mm-dd" format.
 * The HTML <input type="date" /> requires the date to be in "yyyy-mm-dd" format.
 *
 * @param dateStr - Date string in "mm/dd/yyyy" format.
 * @returns The date string in "yyyy-mm-dd" format or an empty string if invalid.
 */
function toInputFormat(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";
  const [month, day, year] = parts;
  // Return the date in "yyyy-mm-dd" format, ensuring month and day are two digits
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Converts a date string from "yyyy-mm-dd" format to "mm/dd/yyyy" format.
 *
 * @param input - Date string in "yyyy-mm-dd" format.
 * @returns The date string in "mm/dd/yyyy" format or an empty string if invalid.
 */
function fromInputFormat(input: string): string {
  if (!input) return "";
  const parts = input.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  // Return the date in "mm/dd/yyyy" format
  return `${month}/${day}/${year}`;
}

/**
 * Props interface for the PositionEditForm component.
 * It includes values and setters for various fields, including date fields.
 */
interface PositionEditFormProps {
  tempTitle: string;
  setTempTitle: (value: string) => void;
  tempOrg: string;
  setTempOrg: (value: string) => void;
  tempStartDate: string; // expects "mm/dd/yyyy" or ""
  setTempStartDate: (value: string) => void;
  tempEndDate: string; // expects "mm/dd/yyyy" or ""
  setTempEndDate: (value: string) => void;
  tempPresent: boolean;
  setTempPresent: (value: boolean) => void;
  tempActivities: string[];
  setTempActivities: (activities: string[]) => void;
  tempAccomplishments: string[];
  setTempAccomplishments: (accomplishments: string[]) => void;
}

/**
 * The PositionEditForm component renders a form to edit a position.
 * It handles converting date formats for proper display in HTML date inputs.
 *
 * It also caches the previous End Date value when the "Present" checkbox is selected,
 * and restores it if the checkbox is later unselected.
 */
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
  // A ref to cache the previous End Date when the "Present" checkbox is toggled.
  const cachedEndDateRef = useRef(tempEndDate);

  return (
    <div className="space-y-4">
      {/* Title Field */}
      <div>
        <label className="block text-sm">Title:</label>
        <input
          className="border rounded px-2 py-1 w-full mb-2"
          value={tempTitle}
          onChange={(e) => setTempTitle(e.target.value)}
          placeholder="Title"
        />
      </div>

      {/* Organization Field */}
      <div>
        <label className="block text-sm">Organization:</label>
        <input
          className="border rounded px-2 py-1 w-full mb-2"
          value={tempOrg}
          onChange={(e) => setTempOrg(e.target.value)}
          placeholder="Organization"
        />
      </div>

      {/* Date Fields */}
      <div className="flex flex-wrap gap-4 mt-2">
        {/* Start Date Field */}
        <div>
          <label className="block text-sm">Start Date:</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            // Convert from mm/dd/yyyy to yyyy-mm-dd format for the date input value
            value={toInputFormat(tempStartDate)}
            onChange={(e) =>
              // Convert the date from input format back to mm/dd/yyyy format
              setTempStartDate(fromInputFormat(e.target.value))
            }
          />
        </div>

        {/* End Date Field */}
        <div>
          <label className="block text-sm">End Date:</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={toInputFormat(tempEndDate)}
            onChange={(e) =>
              // Convert the date from input format back to mm/dd/yyyy format
              setTempEndDate(fromInputFormat(e.target.value))
            }
            disabled={tempPresent} // Disable End Date input when "Present" is checked
          />
        </div>

        {/* Present Checkbox */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={tempPresent}
            onChange={(e) => {
              const isChecked = e.target.checked;
              // If "Present" is checked, cache the current End Date and clear it
              if (isChecked) {
                cachedEndDateRef.current = tempEndDate; // Cache the current End Date
                setTempPresent(true);
                setTempEndDate(""); // Clear the End Date value
              } else {
                // If "Present" is unchecked, restore the cached End Date
                setTempPresent(false);
                setTempEndDate(cachedEndDateRef.current);
              }
            }}
          />
          <span>Present</span>
        </label>
      </div>

      {/* Activities Section */}
      <div>
        <label className="font-bold block mb-2">Activities:</label>
        <div className="space-y-2">
          {tempActivities.map((activity, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={activity}
                onChange={(e) => {
                  // Update the specific activity based on its index
                  const newActivities = [...tempActivities];
                  newActivities[idx] = e.target.value;
                  setTempActivities(newActivities);
                }}
                className="flex-1 border rounded px-2 py-1"
              />
              <button
                onClick={() =>
                  // Remove the activity at the specified index
                  setTempActivities(tempActivities.filter((_, i) => i !== idx))
                }
                className={buttonClasses.danger}
              >
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                <span>Remove</span>
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              // Add a new empty activity to the list
              setTempActivities([...tempActivities, ""])
            }
            className={buttonClasses.primary}
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* Accomplishments Section */}
      <div>
        <label className="font-bold block mb-2">Accomplishments:</label>
        <div className="space-y-2">
          {tempAccomplishments.map((accomplishment, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={accomplishment}
                onChange={(e) => {
                  // Update the specific accomplishment based on its index
                  const newAccomplishments = [...tempAccomplishments];
                  newAccomplishments[idx] = e.target.value;
                  setTempAccomplishments(newAccomplishments);
                }}
                className="flex-1 border rounded px-2 py-1"
              />
              <button
                onClick={() =>
                  // Remove the accomplishment at the specified index
                  setTempAccomplishments(
                    tempAccomplishments.filter((_, i) => i !== idx)
                  )
                }
                className={buttonClasses.danger}
              >
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                <span>Remove</span>
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              // Add a new empty accomplishment to the list
              setTempAccomplishments([...tempAccomplishments, ""])
            }
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
