import OpenAI from "openai";

if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  throw new Error(
    "AI_INTEGRATIONS_OPENAI_API_KEY must be set.",
  );
}

const clientOptions: ConstructorParameters<typeof OpenAI>[0] = {
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
};

if (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
  clientOptions.baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
}

export const openai = new OpenAI(clientOptions);
