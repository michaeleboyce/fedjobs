import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { Position } from "@fedjobs/types";

interface HeaderProps {
  position: Position;
  isInEmploymentHistory: boolean;
}

export const SimilarPositionHeader: React.FC<HeaderProps> = ({ position, isInEmploymentHistory }) => (
  <div className="flex-1 mr-2">
    <div className="flex items-center">
      <h5 className="font-semibold text-lg mr-2">{position.title.title}</h5>
      {isInEmploymentHistory && (
        <span className="text-green-600 flex items-center text-sm">
          <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 mr-1" />
          In Employment History
        </span>
      )}
    </div>
    <p className="text-gray-600">{position.organization.name}</p>
    <p className="text-sm text-gray-500">
      {position.date.startDate} - {position.date.present ? "Present" : position.date.endDate}
    </p>
  </div>
);

export default SimilarPositionHeader;
