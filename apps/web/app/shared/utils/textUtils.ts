// File path: apps/web/app/shared/utils/textUtils.ts
export const truncateDescription = (description: string, maxLength = 100) => {
    if (!description || description.length <= maxLength) return description;
    return `${description.substring(0, maxLength)}...`;
  };