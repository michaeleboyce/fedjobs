// page.tsx
import { getKindeServerSession, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/server";
import Link from "next/link";
import Image from "next/image";
import UploadAndManagImagee from "@/app/images/upload-and-manage.png";
import AnalyzeDocumentsImage from "@/app/images/analyze-documents.png";
import GenerateDocumentImage from "@/app/images/generate-document.png";

export default async function HomePage() {
  const { isAuthenticated } = await getKindeServerSession();
  const authenticated = await isAuthenticated();

  return (
    <div className="bg-gray-100 min-h-screen py-10">
      <div className="container mx-auto px-4">
        <div className="my-12">
          {authenticated ? (
            <div className="text-center">
              <h1 className="text-4xl font-bold text-blue-700 mb-4">Welcome Back to FedJobs!</h1>
              <p className="text-xl mb-6">Advance your federal career by managing your professional documents.</p>
              <Link href="/dashboard" className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition duration-300">
                  Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-4xl font-bold text-blue-700 mb-4">Welcome to FedJobs</h1>
              <p className="text-xl mb-6">Empower your federal job application with our document management system.</p>
              <RegisterLink className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition duration-300">
                Get Started
              </RegisterLink>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-around items-stretch gap-8 my-12">
          {/* Feature Card: Upload and Manage */}
          <div className="w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 text-center p-4 bg-white rounded shadow-lg">
            <Image src={UploadAndManagImagee} alt="Upload and Manage" width={300} height={200} />
            <h3 className="text-lg text-blue-600 font-semibold mt-5">Upload & Manage</h3>
            <p className="text-base mt-2">Easily upload and manage your resumes and supporting documents in a secure environment.</p>
          </div>

          {/* Feature Card: Analyze Documents */}
          <div className="w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 text-center p-4 bg-white rounded shadow-lg">
            <Image src={AnalyzeDocumentsImage} alt="Analyze Documents" width={300} height={200} />
            <h3 className="text-lg text-blue-600 font-semibold mt-5">Analyze Accomplishments</h3>
            <p className="text-base mt-2">Our AI-driven tools analyze your documents to highlight key accomplishments and suggest improvements.</p>
          </div>

          {/* Feature Card: Generate Documents */}
          <div className="w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 text-center p-4 bg-white rounded shadow-lg">
            <Image src={GenerateDocumentImage} alt="Generate Documents" width={300} height={200} />
            <h3 className="text-lg text-blue-600 font-semibold mt-5">Generate Documents</h3>
            <p className="text-base mt-2">Create compelling ECQs, cover letters, and other application documents tailored to federal job postings.</p>
          </div>
        </div>

        {!isAuthenticated && (<div className="text-center my-12">
          <p className="text-xl mb-4">Ready to take the next step in your federal career? Join FedJobs today.</p>
          <RegisterLink className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition duration-300">
            Join Now
          </RegisterLink>
        </div>)}
      </div>
    </div>
  );
}
