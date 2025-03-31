// File path: apps/web/app/shared/utils/dateUtils.ts
export const formatDateMMDDYYYY = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-indexed
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day}/${year}`;
  };

  export const toInputFormat = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("/");
    if (parts.length !== 3) return "";
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  export const fromInputFormat = (input: string): string =>{
    if (!input) return "";
    const parts = input.split("-");
    if (parts.length !== 3) return "";
    const [year, month, day] = parts;
    return `${month}/${day}/${year}`;
  }
  