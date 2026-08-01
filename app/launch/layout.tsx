import { LaunchProviders } from "@/components/launch/Providers";

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return <LaunchProviders>{children}</LaunchProviders>;
}
