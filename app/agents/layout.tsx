import { AgentsProviders } from "@/components/agents/Providers";

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return <AgentsProviders>{children}</AgentsProviders>;
}
