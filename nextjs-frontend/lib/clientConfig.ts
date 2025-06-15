import { client } from "@/app/openapi-client/sdk.gen";

const configureClient = () => {
    // Use NEXT_PUBLIC prefix for client-side access
    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

    client.setConfig({
        baseURL: baseURL,
    });
};

configureClient();
