import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const buildContextPrompt = (basePrompt: string, users: any[], projects: any[]) => {
  let context = `\n\n--- SYSTEM CONTEXT ---\n`;
  if (users && users.length > 0) {
    context += `Available Team Members (ID: Name):\n`;
    users.forEach(u => context += `- ${u.id}: ${u.full_name}\n`);
  }
  if (projects && projects.length > 0) {
    context += `\nAvailable Projects (ID: Name):\n`;
    projects.forEach(p => context += `- ${p.id}: ${p.name}\n`);
  }
  context += `\nINSTRUCTIONS FOR TAGGING:
1. If a task belongs to a specific project mentioned, return its ID in proposed_project_id. If general, untagged, or unknown, return null.
2. If a task is assigned to a specific team member, return their ID in proposed_owner_user_id. If general, untagged, or unknown, return null.`;
  return basePrompt + context;
};

const commonSchemaProperties = {
  title: { type: Type.STRING, description: "The consolidated title of the task" },
  proposed_owner_user_id: { type: Type.STRING, description: "The ID of the proposed owner from the Available Team Members list, or null if unknown", nullable: true },
  proposed_project_id: { type: Type.STRING, description: "The ID of the proposed project from the Available Projects list, or null if unknown", nullable: true },
  priority: { type: Type.STRING, description: "The priority of the task (Low, Medium, High, Critical)" },
  confidence_score: { type: Type.NUMBER, description: "Confidence score from 0 to 1. Lower to 0.4 if vague." },
  context_quote: { type: Type.STRING, description: "The exact quote or summary that justifies this task" }
};

const CHAT_SYSTEM_INSTRUCTION = `You are a meticulous operational bot monitoring a team chat. Your job is to catch every single granular task and action item that flies by in rapid conversation so absolutely nothing gets lost.

Strict Extraction Rules:
- Line-by-Line Granularity: Break down large requests into their smallest actionable components. If a single message contains multiple requests, extract each one as a separate task.
- Look for agreements & requests: Look for responses like "I'll do it," "On it," "Got it," or "Will fix." Map these back to the request made immediately prior. Also extract direct requests even if not yet acknowledged.
- Filter out chatter: Ignore memes, jokes, and general project updates that do not require next steps.
- Penalty for vagueness: If the chat says "Someone needs to fix the server," extract it, but set proposed_owner_user_id to null and lower the confidence_score to 40 (0.4).
- Detailed Titles: Ensure the title is highly descriptive and specific to the granular action required.`;

export const extractTasksFromChatWithRetry = async (chatText: string, users: any[] = [], projects: any[] = [], retries = 3, delay = 2000): Promise<any> => {
  try {
    const prompt = buildContextPrompt(`Extract action items from this chat log.\n\nChat Log: ${chatText}`, users, projects);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: CHAT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: commonSchemaProperties,
            required: ["title", "priority", "context_quote"]
          }
        }
      }
    });
    
    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from AI");
    }
    
    return JSON.parse(responseText);

  } catch (error: any) {
    if (error.status === 429 && retries > 0) {
      console.warn(`Rate limit hit. Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return extractTasksFromChatWithRetry(chatText, users, projects, retries - 1, delay * 2);
    }
    
    console.error("AI Extraction Failed:", error);
    throw new Error("Failed to extract tasks. Please try again later.");
  }
};

const EMAIL_SYSTEM_INSTRUCTION = `You are an extremely meticulous executive assistant parsing an email thread. Your goal is to identify every single granular action item required from our team based on this communication. Do not miss any details.

Strict Extraction Rules:
- Line-by-Line Granularity: Read the email line by line. Break down paragraphs into individual, actionable tasks. A single email might generate many granular tasks.
- Ignore pleasantries & signatures: Ignore "Hope you are well," legal disclaimers, and contact info.
- Identify Client Requests: If the client is asking for an update, a file, or a meeting, extract it as a task for the account manager/lead. If they ask for multiple things, create multiple tasks.
- Identify Internal Delegation: Look for phrases like "Can you handle this?" or "Please look into this."
- Determine Owner: Look at the "To:" or "cc:" lines combined with the text to figure out who is supposed to execute the task. If unclear, set proposed_owner_user_id to null.
- Tone: Keep the title highly professional, concise, and specific to the granular action.`;

export const extractTasksFromEmailWithRetry = async (emailText: string, users: any[] = [], projects: any[] = [], retries = 3, delay = 2000): Promise<any> => {
  try {
    const prompt = buildContextPrompt(`Extract action items from this email thread.\n\nEmail Thread: ${emailText}`, users, projects);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: EMAIL_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: commonSchemaProperties,
            required: ["title", "priority", "context_quote"]
          }
        }
      }
    });
    
    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from AI");
    }
    
    return JSON.parse(responseText);

  } catch (error: any) {
    if (error.status === 429 && retries > 0) {
      console.warn(`Rate limit hit. Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return extractTasksFromEmailWithRetry(emailText, users, projects, retries - 1, delay * 2);
    }
    
    console.error("AI Extraction Failed:", error);
    throw new Error("Failed to extract tasks. Please try again later.");
  }
};

const SYSTEM_INSTRUCTION = `You are a ruthless, highly-disciplined, and incredibly meticulous project manager. Your job is to read the following meeting transcript line by line and extract EVERY explicit action item in granular detail. Do not miss anything.

Strict Extraction Rules:
- Line-by-Line Granularity: Break down broad discussions into specific, individual action items. If someone lists three things they will do, extract three separate tasks.
- Ignore brainstorms: If someone says "We should maybe think about X," ignore it.
- Require Commitment or Direct Assignment: Extract a task if someone explicitly agrees to do it, or if a leader explicitly assigns it (e.g., "I will draft the proposal by tomorrow" or "Sarah, please send the deck").
- Format Title: The title MUST start with an action verb (e.g., "Draft kickoff deck", NOT "Kickoff deck") and be highly specific.
- Determine Priority: Default to "Medium". Only use "High" or "Critical" if the transcript mentions a strict, immediate deadline or client blocker.
- Traceability: You MUST provide the exact context_quote from the transcript so the user can verify why this granular task was created.`;

export const extractTasksWithRetry = async (transcriptText: string, users: any[] = [], projects: any[] = [], retries = 3, delay = 2000): Promise<any> => {
  try {
    const prompt = buildContextPrompt(`Extract action items from this transcript.\n\nTranscript: ${transcriptText}`, users, projects);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: commonSchemaProperties,
            required: ["title", "priority", "context_quote"]
          }
        }
      }
    });
    
    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from AI");
    }
    
    return JSON.parse(responseText);

  } catch (error: any) {
    if (error.status === 429 && retries > 0) {
      console.warn(`Rate limit hit. Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return extractTasksWithRetry(transcriptText, users, projects, retries - 1, delay * 2);
    }
    
    console.error("AI Extraction Failed:", error);
    throw new Error("Failed to extract tasks. Please try again later.");
  }
};

const PROJECT_SYSTEM_INSTRUCTION = `You are a highly-disciplined project manager. Your job is to read the following intake notes or transcript and extract the details for a NEW project or client.

Strict Extraction Rules:
- Extract the project name. If not explicitly stated, create a concise, professional name based on the context.
- Extract the client name if mentioned.
- Determine the proposed owner from the Available Team Members list if mentioned.
- Extract support team members, client point of contact (client_poc), preferred contact method, project links, tools/platform, and logins if mentioned.
- Determine status (Pending, Active, On Hold, Completed) and priority (Low, Medium, High, Critical). Default to Pending and Medium if unclear.
- Extract target start and end dates if mentioned (format as ISO 8601 strings, e.g., YYYY-MM-DD).`;

export const extractProjectFromIntakeWithRetry = async (intakeText: string, users: any[] = [], retries = 3, delay = 2000): Promise<any> => {
  try {
    let prompt = `Extract project details from these intake notes.\n\nIntake Notes: ${intakeText}\n\n--- SYSTEM CONTEXT ---\n`;
    if (users && users.length > 0) {
      prompt += `Available Team Members (ID: Name):\n`;
      users.forEach(u => prompt += `- ${u.id}: ${u.full_name}\n`);
    }
    prompt += `\nINSTRUCTIONS FOR TAGGING:
If the project is assigned to a specific team member, return their ID in owner_user_id. If general, untagged, or unknown, return null.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: PROJECT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The name of the project" },
            client_name: { type: Type.STRING, description: "The name of the client", nullable: true },
            owner_user_id: { type: Type.STRING, description: "The ID of the proposed owner from the Available Team Members list, or null if unknown", nullable: true },
            support_team: { type: Type.STRING, description: "Names or roles of the support team", nullable: true },
            client_poc: { type: Type.STRING, description: "Client point of contact", nullable: true },
            preferred_contact_method: { type: Type.STRING, description: "Preferred contact method", nullable: true },
            project_links: { type: Type.STRING, description: "Project links mentioned", nullable: true },
            tools_platform: { type: Type.STRING, description: "Tools and platforms mentioned", nullable: true },
            logins: { type: Type.STRING, description: "Login information mentioned", nullable: true },
            status: { type: Type.STRING, description: "Status: Pending, Active, On Hold, Completed" },
            priority: { type: Type.STRING, description: "Priority: Low, Medium, High, Critical" },
            target_start_date: { type: Type.STRING, description: "Target start date (YYYY-MM-DD)", nullable: true },
            target_end_date: { type: Type.STRING, description: "Target end date (YYYY-MM-DD)", nullable: true },
            description: { type: Type.STRING, description: "A brief description of the project based on the intake notes", nullable: true }
          },
          required: ["name", "status", "priority"]
        }
      }
    });
    
    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from AI");
    }
    
    return JSON.parse(responseText);

  } catch (error: any) {
    if (error.status === 429 && retries > 0) {
      console.warn(`Rate limit hit. Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return extractProjectFromIntakeWithRetry(intakeText, users, retries - 1, delay * 2);
    }
    
    console.error("AI Extraction Failed:", error);
    throw new Error("Failed to extract project details. Please try again later.");
  }
};
