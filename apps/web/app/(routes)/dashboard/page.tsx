// File path: apps/web/app/(routes)/dashboard/page.tsx
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import React from "react";

// If you still want to fetch some user-specific data here (like # of documents, etc.),
// import and call your DB queries, e.g.:
// import { getDocsByUserId } from "@fedjobs/database";

export default async function DashboardPage() {
  const { isAuthenticated, getUser } = await getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/api/auth/signin");
  }

  const user = await getUser();
  if (!user?.id) {
    return <div>Error retrieving user information</div>;
  }

  // (Optional) Fetch any overview data you want to show on the dashboard
  // e.g., const documents = await getDocsByUserId(user.id);
  // const numberOfDocuments = documents.length;

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          Welcome to Your Dashboard, {user.given_name ?? user.email}!
        </h1>
        <p className="text-gray-700 mb-8">
          Easily navigate to manage your positions, upload documents, or generate materials.
        </p>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card #1: Review Employment History */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Review Positions</h2>
              <p className="text-gray-700 mb-4">
                Manage your employment history, review similar positions, 
                and keep your records up to date.
              </p>
            </div>
            <div>
              <Link
                href="/review-positions"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Go to Review Positions
              </Link>
            </div>
          </div>

          {/* Card #2: Manage Documents */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Manage Documents</h2>
              <p className="text-gray-700 mb-4">
                Upload resumes, cover letters, ECQs, and more. 
                Keep your documents organized for easy reuse.
              </p>
            </div>
            <div>
              {/* 
                If your existing DocumentManager is at `/dashboard/documents`, 
                link the user there. Or you can rename it to something more 
                descriptive—completely up to you. 
              */}
              <Link
                href="/documents"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Go to Documents
              </Link>
            </div>
          </div>

          {/* Card #3: Generate New Content */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Generate Documents</h2>
              <p className="text-gray-700 mb-4">
                Quickly create resumes, cover letters, or ECQ essays using your 
                curated data. Jump right into generation mode!
              </p>
            </div>
            <div>
              {/* 
                If you have a route to create a new generation, e.g. 
                `/generate/resume` or a wizard route, link it here.
                You might also consider a "wizard" approach to let users 
                pick what they want to generate. 
              */}
              <Link
                href="/generate"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Generate Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
