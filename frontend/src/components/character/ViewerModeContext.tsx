"use client";

/**
 * src/components/character/ViewerModeContext.tsx
 *
 * React context that propagates "viewer mode" (read-only) state down through
 * the character sheet component tree. When viewerMode is true, interactive
 * controls (dice rolls, stat editing, slot toggling, etc.) are hidden or
 * disabled so that GMs viewing a player's sheet in campaign view don't
 * accidentally trigger actions on the player's character.
 *
 * Usage:
 *   <ViewerModeProvider viewerMode={true}>
 *     <CharacterSheetContent ... />
 *   </ViewerModeProvider>
 *
 * In child components:
 *   const viewerMode = useViewerMode();
 *   if (viewerMode) return null; // hide interactive element
 */

import { createContext, useContext } from "react";

const ViewerModeContext = createContext<boolean>(false);

export function ViewerModeProvider({
  viewerMode,
  children,
}: {
  viewerMode: boolean;
  children: React.ReactNode;
}) {
  return (
    <ViewerModeContext.Provider value={viewerMode}>
      {children}
    </ViewerModeContext.Provider>
  );
}

/** Returns true when the character sheet is in read-only viewer mode. */
export function useViewerMode(): boolean {
  return useContext(ViewerModeContext);
}
