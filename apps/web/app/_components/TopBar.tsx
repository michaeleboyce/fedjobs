import React from 'react';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LoginLink, RegisterLink, LogoutLink } from '@kinde-oss/kinde-auth-nextjs/components';
import Image from 'next/image';
import logo from '@/app/fedjobssimpleimage.png'; // Adjust the path to your logo
import Link from 'next/link';

const TopBar = async () => {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const user = await getUser();
  const authenticated = await isAuthenticated();

  return (
    <div className="top-bar">
      <div className="logo-container">
        <Link href="/" className="flex items-center">
            <Image src={logo} alt="Fedjobs Logo" width={110} height={110} />
            <span className="logo-text">FED JOBS</span>
        </Link>
      </div>

      <div className="auth-links">
        {authenticated ? (
          <>
            <Link href="/dashboard" className="link">
              Welcome {user?.given_name}
            </Link>
            <LogoutLink className="link">Logout</LogoutLink>
          </>
        ) : (
          <>
            <LoginLink className="link">Sign in</LoginLink>
            <RegisterLink className="link">Sign up</RegisterLink>
          </>
        )}
      </div>
    </div>
  );
};

export default TopBar;
