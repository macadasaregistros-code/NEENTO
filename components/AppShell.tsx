import type { ReactNode } from "react";

import { AppChrome } from "@/components/AppChrome";
import { LearningModeProvider } from "@/hooks/useLearningMode";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <LearningModeProvider>
      <AppChrome>{children}</AppChrome>
    </LearningModeProvider>
  );
}
