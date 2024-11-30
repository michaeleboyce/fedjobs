'use server'

import { preparedDocsByUserId } from "../../_db/queries/query"


export async function getDocsByUserId(userId: string){
    return await preparedDocsByUserId.execute({id: userId});
}