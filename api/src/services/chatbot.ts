import { createAgent, HumanMessage, initChatModel } from "langchain";
import { MemorySaver  } from "@langchain/langgraph";

export const key = process.env.GOOGLE_API_KEY;

const model = await initChatModel("gemini-3.6-flash", {
    modelProvider: "google",
    apiKey: key,
});

const checkpointer = new MemorySaver();

const agent = createAgent({
    model,
    checkpointer
});

export const chat = async (input: any) => {
    console.log(input.attachments[0]?.data);
    const threadConfig = { configurable: { thread_id: "1" } };
    const formData = new FormData();
    formData.append('file', input.attachments?.[0]?.data);
    const messageContent = [
        { type: "text", text: input.text },
        {
            type: input.attachments?.[0]?.type,
            source_type: "base64",
            mime_type: "image/jpeg",
            data: formData
        }
    ];

    const message = new HumanMessage({
        content: messageContent
    });

    const response = await agent.invoke(
        { messages: message }, 
        threadConfig
    );
    
    return response.messages[response.messages.length - 1]?.content;
}