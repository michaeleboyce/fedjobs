'use server'
import { db, eq } from '@/app/_db';
import { documents as documentsTable } from '@/app/_db/schema/documents';
import { Resume } from '@/app/_classes/Resume';
import { ResumePageManager } from './_Components/ResumePageManager';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { redirect } from 'next/navigation';
export default async function Page({params} : {params: {id: number}}){
    const {isAuthenticated, getUser} = await getKindeServerSession();
    const authenticated: boolean = await isAuthenticated();
    const user = await getUser();

    
    if (!authenticated){
        redirect('/api/auth/signin');
    }

    if (!user || !user.id) {
        return <div>Error retrieving user information</div>;
    }
    const docs = await db
        .select({
            id: documentsTable.id,
            data: documentsTable.data
        })
        .from(documentsTable)
        .where(eq(documentsTable.id, params.id))
        .execute();

    
    if (!docs || docs.length <= 0)
        return <div>Error processing this document, resume referenced is not found!</div>

    const resume = Resume.fromJSON(docs[0].data)
    resume.toJSON();
    return (
        <ResumePageManager resume={resume.toJSON()} />
    )
}