'use server'
import { redirect } from "next/navigation";

export const doRedirect = async (redirectPath: string) => {
    'use server'
    if (redirectPath)
      redirect(redirectPath);
}