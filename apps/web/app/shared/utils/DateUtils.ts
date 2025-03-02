// File path: apps/web/app/shared/utils/DateUtils.ts
export const formatDateMMDDYYYY = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-indexed
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day}/${year}`;
  };