import type { ReactNode } from "react";

import { AppAccessGate } from "@/components/AppAccessGate";
import { AppChrome } from "@/components/AppChrome";
import { LearningModeProvider } from "@/hooks/useLearningMode";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <LearningModeProvider>
      <AppAccessGate>
        <AppChrome>{children}</AppChrome>
      </AppAccessGate>
    </LearningModeProvider>
  );
}
