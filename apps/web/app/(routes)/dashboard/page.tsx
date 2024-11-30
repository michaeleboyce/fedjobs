import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

import { DocumentManager } from "./DocumentManager";
import { getDocsByUserId } from "./actions";
import { processDocumentFromFormData } from "@/app/_utils/documentParsing";

export default async function Page(){
    const {isAuthenticated, getUser} = await getKindeServerSession();
    const authenticated: boolean = await isAuthenticated();
    const user = await getUser();

    const processDocumentFromFormDataServer = async (formData: FormData) => {
        'use server'
        return await processDocumentFromFormData(formData);
    }
    
    if (!authenticated){
        redirect('/api/auth/signin');
    }

    if (!user || !user.id) {
        return <div>Error retrieving user information</div>;
    }
    const documents = await getDocsByUserId(user.id);

    return (
        <div>
            <DocumentManager userId={user.id} initialDocuments={documents} processDocumentFromFormData={processDocumentFromFormDataServer} />
        </div>
    )
}