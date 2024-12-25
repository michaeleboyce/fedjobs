// packages/utils/src/Services/authService.ts

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export const authenticateUser = async () => {
  const { isAuthenticated, getUser } = await getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    throw new Error("User not authenticated");
  }

  const user = await getUser();
  if (!user || !user.id) {
    throw new Error("User data is missing");
  }

  return user;
};