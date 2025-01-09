// File path: apps/web/app/_components/PositionCard/index.tsx
import React, { useState } from "react";
import { Position } from "@fedjobs/types";
import { usePositions } from "./Context/PositionsContext";
import { SimilarPositionCard } from "../SimilarPositionCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faPencil, 
  faPlus, 
  faTrash, 
  faChevronDown, 
  faChevronUp, 
  faCheck 
} from "@fortawesome/free-solid-svg-icons";

const buttonBase = "inline-flex items-center gap-1 text-sm px-2 py-1 rounded";
const buttonClasses = {
  primary: `${buttonBase} bg-blue-600 text-white hover:bg-blue-700`,
  secondary: `${buttonBase} bg-gray-100 text-gray-700 hover:bg-gray-200`,
  danger: `${buttonBase} bg-red-600 text-white hover:bg-red-700`,
  success: `${buttonBase} bg-green-600 text-white hover:bg-green-700`,
  link: "text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
};

interface PositionCardProps {
  position: Position;
  isEmploymentHistory: boolean;
}

export const PositionCard: React.FC<PositionCardProps> = ({
  position,
  isEmploymentHistory,
}) => {
  const { 
    loadingPositions, 
    handleUpdatePosition, 
    handleAddToEmploymentHistory,
    handleRemoveFromEmploymentHistory,
  } = usePositions();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit state
  const [tempTitle, setTempTitle] = useState(position.title.title);
  const [tempOrg, setTempOrg] = useState(position.organization.name);
  const [tempStartDate, setTempStartDate] = useState(position.date.startDate);
  const [tempEndDate, setTempEndDate] = useState(position.date.endDate);
  const [tempPresent, setTempPresent] = useState(position.date.present);
  const [tempActivities, setTempActivities] = useState([...position.details.activities]);
  const [tempAccomplishments, setTempAccomplishments] = useState([...position.details.accomplishments]);

  const isLoading = loadingPositions.has(position.positionUuid);

  async function saveEdit() {
    await handleUpdatePosition(position.positionUuid, {
      title: { title: tempTitle },
      organization: { name: tempOrg },
      date: {
        startDate: tempStartDate,
        endDate: tempEndDate,
        present: tempPresent,
      },
      details: {
        activities: tempActivities,
        accomplishments: tempAccomplishments,
      },
    });
    setIsEditing(false);
  }

  const similarCount = position.similarPositionUuids?.length ?? 0;

  return (
    <div id={`position-${position.positionUuid}`} className="border p-4 rounded mb-4 shadow-sm bg-white">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">

            <h3 className="font-bold text-xl">
              {isEditing ? (
                <input
                  className="border rounded px-2 py-1 w-full"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  placeholder="Position Title"
                />
              ) : (
                position.title.title
              )}
            </h3>
            <div className="flex items-center gap-2 mb-1">

            <div className="flex gap-1">
              {!isEditing && !isEmploymentHistory && (
                <button
                  onClick={() => handleAddToEmploymentHistory(position.positionUuid)}
                  disabled={isLoading}
                  className={buttonClasses.primary}
                >
                  <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                  <span>Add</span>
                </button>
              )}

              {!isEditing && isEmploymentHistory && (
                <button
                  onClick={() => handleRemoveFromEmploymentHistory(position.positionUuid)}
                  disabled={isLoading}
                  className={buttonClasses.danger}
                >
                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                  <span>Remove</span>
                </button>
              )}

              {isEditing ? (
                <>
                  <button
                    onClick={saveEdit}
                    disabled={isLoading}
                    className={buttonClasses.success}
                  >
                    <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className={buttonClasses.secondary}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className={buttonClasses.secondary}
                >
                  <FontAwesomeIcon icon={faPencil} className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              )}

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={buttonClasses.link}
              >
                <FontAwesomeIcon 
                  icon={isExpanded ? faChevronUp : faChevronDown} 
                  className="h-3 w-3" 
                />
                <span>{isExpanded ? "Hide" : "Show"}</span>
              </button>
            </div>
          </div>
          {!isExpanded && similarCount > 0 && (
              <div className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-sm">
                {similarCount} similar {similarCount === 1 ? 'position' : 'positions'}
              </div>
            )}
          <div className="text-gray-600">
            {isEditing ? (
              <input
                className="border rounded px-2 py-1 w-full mb-2"
                value={tempOrg}
                onChange={(e) => setTempOrg(e.target.value)}
                placeholder="Organization"
              />
            ) : (
              <div>{position.organization.name}</div>
            )}

            {isEditing ? (
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
            ) : (
              <div>
                {position.date.startDate} - {position.date.present ? "Present" : position.date.endDate}
              </div>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4">
          {isEditing ? (
            <div className="space-y-4">
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
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setTempActivities([...tempActivities, ""])}
                    className={buttonClasses.primary}
                  >
                    Add Activity
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
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setTempAccomplishments([...tempAccomplishments, ""])}
                    className={buttonClasses.primary}
                  >
                    Add Accomplishment
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <strong>Activities:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {position.details.activities.map((act, idx) => (
                    <li key={idx}>{act}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-3">
                <strong>Accomplishments:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {position.details.accomplishments.map((acc, idx) => (
                    <li key={idx}>{acc}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {position.similarPositionUuids?.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Similar Positions:</h4>
              <div className="space-y-2">
                {position.similarPositionUuids.map((simId) => (
                  <SimilarPositionCard
                    key={simId}
                    similarId={simId}
                    currentPosition={position}
                    isEmploymentHistory={isEmploymentHistory}
                    onViewOriginal={() => {
                      const element = document.getElementById(`position-${simId}`);
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }}
                    isLoading={loadingPositions.has(simId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};