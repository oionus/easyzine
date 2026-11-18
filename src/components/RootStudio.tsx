"use client";

import { DesignStepView } from "@/components/DesignStepView";
import { ExportStepView } from "@/components/ExportStepView";
import { FormatStepView } from "@/components/FormatStepView";
import { LibraryStepView } from "@/components/LibraryStepView";
import { ShelfView } from "@/components/ShelfView";
import { TopAtelierBar } from "@/components/TopAtelierBar";
import { StudioProvider, useStudio } from "@/store/studioStore";
import React from "react";

const StudioWorkspaceShell: React.FC = () => {
  const store = useStudio();
  const { palette, stage, hydrated } = store;

  return (
    <div
      className="flex h-dvh w-screen flex-col overflow-hidden transition-colors duration-200"
      style={{
        backgroundColor: palette.deskSurface,
        color: palette.inkPrimary,
      }}
    >
      <TopAtelierBar />

      <main className="relative flex-1 overflow-hidden">
        {!hydrated ? (
          <div className="flex h-full items-center justify-center text-xs opacity-60">
            正在打开纸间小志工坊…
          </div>
        ) : (
          <>
            {stage === "shelf" && <ShelfView />}
            {stage === "upload" && <LibraryStepView />}
            {stage === "format" && <FormatStepView />}
            {stage === "design" && <DesignStepView />}
            {stage === "export" && <ExportStepView />}
          </>
        )}
      </main>
    </div>
  );
};

export const RootStudio: React.FC = () => {
  return (
    <StudioProvider>
      <StudioWorkspaceShell />
    </StudioProvider>
  );
};
