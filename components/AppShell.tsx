import type { ReactNode } from "react";

import { AppChrome } from "@/components/AppChrome";
import { AuthGate } from "@/components/AuthGate";
import { LearningModeProvider } from "@/hooks/useLearningMode";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <LearningModeProvider>
      <AuthGate>
        <AppChrome>{children}</AppChrome>
      </AuthGate>
    </LearningModeProvider>
  );
}
