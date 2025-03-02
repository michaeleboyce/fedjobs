// File path: apps/web/app/shared/components/TopBar.tsx
import React from 'react';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LoginLink, RegisterLink, LogoutLink } from '@kinde-oss/kinde-auth-nextjs/components';
import Image from 'next/image';
import logo from '@/app/fedjobssimpleimage.png';
import Link from 'next/link';

const TopBar = async () => {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const user = await getUser();
  const authenticated = await isAuthenticated();

  return (
    <div className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-2">
        <div className="flex justify-between items-center">
          {/* Logo and Site Name */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image src={logo} alt="Fedjobs Logo" width={50} height={50} className="mr-2" />
              <span className="text-xl font-bold text-blue-600">FED JOBS</span>
            </Link>
          </div>

          {/* Auth Links */}
          <div className="flex items-center space-x-4">
            {authenticated ? (
              <>
                <Link 
                  href="/dashboard" 
                  className="flex items-center text-gray-700 hover:text-blue-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                  <span>Welcome, {user?.given_name}</span>
                </Link>
                <LogoutLink className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
                  Logout
                </LogoutLink>
              </>
            ) : (
              <>
                <LoginLink className="text-gray-700 hover:text-blue-600">
                  Sign in
                </LoginLink>
                <RegisterLink className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
                  Sign up
                </RegisterLink>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
