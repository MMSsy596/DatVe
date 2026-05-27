"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export function GoogleProviderWrapper({ children }: { children: any }) {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children as any}
    </GoogleOAuthProvider>
  );
}
