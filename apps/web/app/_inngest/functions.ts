//import { updateDocWithResumeJSON } from "../_actions/dbActions";
//import { getJSONFromResumeText } from "../_utils/resumeProcessor";
import { inngest } from "./client";

export const createBuildResumeJSONJob= inngest.createFunction(
  { id: "buildResumeJSON" },
  { event: "fedjobs/buildResumeJSON" },
  async ({ event, step }) => {
    const {content, documentId } = event.data;
    // const json = await getJSONFromResumeText(content);
    // if (!json)
    //   return;

    // const docId = await updateDocWithResumeJSON(documentId, json);
    // return { event, body: {
    //     docId,
    //     documentId,
    //     content,
    //     json: JSON.stringify(json)
    // } };
  },
);