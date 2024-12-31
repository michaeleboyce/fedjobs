// File path: apps/web/app/_actions/utilActions.ts
'use server'
import { redirect } from "next/navigation";

export const doRedirect = async (redirectPath: string) => {
    'use server'
    if (redirectPath)
      redirect(redirectPath);
}