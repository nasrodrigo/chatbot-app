import { createAgent, HumanMessage, initChatModel, type ContentBlock } from "langchain";
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

export const chat = async (input: { text: string; attachments?: { data: string; type: string; mimeType: string, source_type: string }[] }) => {
    const threadConfig = { configurable: { thread_id: "1" } };
    const messageContent: string | (ContentBlock | ContentBlock.Text)[] | undefined = [
        { type: "text", text: input.text },
    ];
    
    input.attachments?.map(attachment => {
        if (attachment) {
            messageContent.push({
                type: attachment.type,
                source_type: attachment.source_type,
                mime_type: attachment.mimeType,
                data: attachment.data,
            });
        }
    });

    const message = new HumanMessage({
        content: messageContent
    });

    const response = await agent.invoke(
        { messages: message }, 
        threadConfig
    );
    
    return response.messages[response.messages.length - 1]?.content;
}