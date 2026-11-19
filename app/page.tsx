"use client";

import dynamic from "next/dynamic";

// Client-only: the game reads localStorage on first render, so skip prerendering.
const App = dynamic(() => import("@/components/App"), { ssr: false });

export default function Home() {
  return <App />;
}
