"use server";
import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateEmbedding } from "~/lib/gemini";
import { db } from "~/server/db";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const askQuestion = async (question: string, projectId: string) => {
  const stream = createStreamableValue();
  const queryVector = await generateEmbedding(question);
  const vectorQuery = `[${queryVector.join(",")}]`;

  const result = (await db.$queryRaw`
    SELECT "fileName", "sourceCode",
    "summary", 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
    FROM "SourceCodeEmbedding"
    WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.5
    AND "projectId" = ${projectId}
    ORDER BY similarity DESC
    LIMIT 10`) as { fileName: string; sourceCode: string; summary: string }[];

  let context = "";

  for (const doc of result) {
    context += `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\n summary of file: ${doc.summary}\n\n`;
  }
  (async () => {
    const { textStream } = await streamText({
      model: google("gemini-1.5-flash"),
      prompt: `
        You are a ai code assistant who answers questions about the codebase. Your target audience is a technical intern who is new to the codebase.
        AI assistant is a brand new, powerful, human-like artificial intelligence.
        The traits of AI include export knowledge, helpfulness, cleverness and articulateness.
        AI is a well-behaved and well-mannered individual.
        AI is always fiendly, kind and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
        AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in the codebase.
        If the question is asking about code or a specific file, AI will provide the detailed answer, givign step-by-step instructions.
        START CONTEXT BLOCK
        ${context}
        END CONTEXT BLOCK
        
        START QUESTION BLOCK
        ${question}
        END QUESTION BLOCK
        AI assistant will take into account any CONTEXT BLOCK that is provided in a coversation.
        If the context does not provide the answer to question, the AI assistant will say, I'm sorry, I don't have the answer to that question.
        AI assistant will not apologize for previous responses, but instead will indicate that new information is gained.
        AI assistant will not invent anything that is not drawn directly from the context.
        Answer in markdown syntax, with code snippets if needed. Be as detailed as possible.`,
    });
    for await (const delta of textStream) {
      stream.update(delta);
    }
    stream.done();
  })();

  return {
    output: stream.value,
    filesReferenced: result,
  };
};
