# Progress Report #2 — Frontend Implementation

**Branch**: `feature/campaign-frames`
**Date**: 2026-04-08

---

## Summary

Full frontend layer for Campaign Frames feature is implemented: hooks, pages, components, and campaign detail integration. All TypeScript checks pass with zero errors.

---

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `frontend/src/hooks/useFrames.ts` | ~400 | TanStack Query v5 hooks covering all 20 frame API endpoints |
| `frontend/src/app/frames/page.tsx` | ~165 | Frame list page (auth-guarded, skeleton loading, empty state) |
| `frontend/src/components/frames/FrameCard.tsx` | ~180 | Frame card component + skeleton variant |
| `frontend/src/app/frames/new/page.tsx` | ~350 | Create frame form (all 8 fields, tag inputs, validation) |
| `frontend/src/app/frames/[id]/page.tsx` | ~16 | Static route shell |
| `frontend/src/app/frames/[id]/FrameDetailClient.tsx` | ~596 | Frame detail with tabbed sections (contents, restrictions, extensions) |
| `frontend/src/app/frames/[id]/edit/page.tsx` | ~16 | Static route shell |
| `frontend/src/app/frames/[id]/edit/FrameEditClient.tsx` | ~748 | Edit form pre-populated from frame data, ownership check |
| `frontend/src/components/campaign/CampaignFramesTab.tsx` | ~853 | Frames tab for campaign detail (attach/detach/conflicts) |

## Files Modified

| File | Changes |
|------|---------|
| `frontend/src/hooks/useCampaignNav.ts` | Added `"frames"` to `CampaignTab` type union and `VALID_TABS` set |
| `frontend/src/app/campaigns/[id]/CampaignDetailClient.tsx` | Added lazy-loaded `CampaignFramesTab` import, "Frames" entry in `GM_TABS`, frames tab panel rendering |

---

## Hooks (useFrames.ts)

Query key factory: `frameKeys` with `all`, `lists`, `detail(id)`, `campaignFrames(campaignId)`, `campaignConflicts(campaignId)`.

### Frame CRUD
- `useFrames()` — list all user's frames
- `useFrameDetail(frameId)` — get frame with contents/restrictions/extensions
- `useCreateFrame()` — create new frame, returns created frame
- `useUpdateFrame(frameId)` — partial update frame metadata
- `useDeleteFrame()` — delete frame by ID

### Content References
- `useAddFrameContent(frameId)` — add homebrew content to frame
- `useRemoveFrameContent(frameId)` — remove content from frame

### SRD Restrictions
- `useAddFrameRestriction(frameId)` — add SRD restriction/alteration
- `useUpdateFrameRestriction(frameId)` — update restriction
- `useRemoveFrameRestriction(frameId)` — remove restriction

### Custom Type Extensions
- `useAddFrameExtension(frameId)` — add extension (damageType, adversaryType, etc.)
- `useUpdateFrameExtension(frameId)` — update extension
- `useRemoveFrameExtension(frameId)` — remove extension

### Campaign Integration
- `useCampaignFrames(campaignId)` — list attached frames
- `useAttachFrame(campaignId)` — attach frame to campaign
- `useDetachFrame(campaignId)` — detach frame
- `useCampaignConflicts(campaignId)` — list conflict resolutions
- `useResolveConflict(campaignId)` — resolve content conflict
- `useDeleteConflictResolution(campaignId)` — delete resolution

---

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/frames` | List all user's campaign frames |
| `/frames/new` | Create a new campaign frame |
| `/frames/{id}` | View frame detail with tabbed content/restrictions/extensions |
| `/frames/{id}/edit` | Edit frame metadata (owner only) |
| `/campaigns/{id}?tab=frames` | Frames tab on campaign detail page |

---

## Campaign Detail Integration

The Campaign Detail page (`CampaignDetailClient.tsx`) now includes:
1. A "Frames" tab in the GM tab bar (desktop + mobile bottom nav)
2. The `CampaignFramesTab` component rendered as a tab panel
3. Frames tab is visible to all campaign members (GM gets manage controls)

### CampaignFramesTab Features
- **Attached frames list**: Cards showing frame name, pitch, content/restriction/extension counts
- **Attach frame dropdown**: GM can attach their frames (filtered to exclude already-attached)
- **Detach with confirmation**: Inline confirm/cancel pattern
- **Conflict resolution section**: Shows when content conflicts exist between frames
- **Conflict resolver**: GM selects winning frame from dropdown, resolves per-item

---

## Accessibility

All components include:
- Proper ARIA roles (tablist, tabpanel, alert, list/listitem)
- `aria-label`, `aria-required`, `aria-describedby` attributes
- `useId()` for label-input associations
- Screen reader text for visual-only indicators
- Focus ring management (`focus:ring-2 focus:ring-[#577399]`)
- Keyboard support (Enter to add tags, proper tab order)

---

## Build Status

- `tsc --noEmit`: **0 errors** (frontend)
- `esbuild build:frames`: **Passes** (168.4kb bundle)
- `tsc --noEmit`: **0 new errors** (backend, pre-existing 10 in homebrew/handler.ts)

---

## Requirement Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| 1. Frame metadata (name, author, complexity, etc.) | DONE | Create/edit forms with all fields, detail page display |
| 2. SRD content restrictions/alterations | DONE | Restrictions tab on detail page, add/remove in hooks |
| 3. Custom type extensions | DONE | Extensions tab on detail page, add/remove in hooks |
| 4. Flexible content inclusion | DONE | Contents tab, add/remove homebrew references |
| 5. Attach to campaigns | DONE | CampaignFramesTab with attach dropdown |
| 6. Multiple frames per campaign | DONE | List view, conflict detection on attach |
| 7. Per-item conflict resolution | DONE | Conflict section with per-item resolver |

---

## Next Steps

- [ ] Add `/frames` link to main navigation / dashboard
- [ ] Add content picker modals for adding content/restrictions/extensions inline
- [ ] End-to-end testing with deployed API
- [ ] Consider Patreon gating for frames (like campaigns)
