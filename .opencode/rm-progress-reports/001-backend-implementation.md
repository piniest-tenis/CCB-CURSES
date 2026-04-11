# Progress Report #1 — Backend Implementation

**Date**: 2026-04-08  
**Branch**: `feature/campaign-frames`  
**Status**: Backend Complete, Frontend Pending

---

## Summary

The full backend for Campaign Frames has been implemented across 4 files:

1. **Shared types** (`shared/src/types.ts`) — 80+ lines of new type definitions
2. **DynamoDB key builders** (`backend/src/common/dynamodb.ts`) — New table constant + 6 key builders
3. **CDK infrastructure** (`infrastructure/lib/frames-stack.ts`) — New stack with DynamoDB table, Lambda, 21 HTTP routes
4. **Lambda handler** (`backend/src/frames/handler.ts`) — 1,369 lines, 20 route handlers

---

## Requirements Coverage

### Requirement 1: Campaign Frame Metadata
**Status**: Complete

`CampaignFrame` type includes: name (required), author, pitch, overview, toneAndFeel, complexity (low/moderate/high/extreme), themes[], touchstones[], timestamps. All optional except name, matching the spec exactly.

API: `POST /frames`, `PATCH /frames/{frameId}`, `GET /frames/{frameId}`, `DELETE /frames/{frameId}`, `GET /frames`

### Requirement 2: SRD Content Restrictions/Alterations
**Status**: Complete

`FrameRestriction` supports two modes:
- **restricted**: Marks SRD content as unavailable within the frame
- **altered**: Provides alteration notes and optional structured alteration data

Restrictable content types: `class | community | ancestry | domainCard`

API: `POST /frames/{frameId}/restrictions`, `PUT /frames/{frameId}/restrictions/{contentType}/{contentId}`, `DELETE /frames/{frameId}/restrictions/{contentType}/{contentId}`

### Requirement 3: Custom Type Extensions
**Status**: Complete

`FrameExtension` supports four extension types:
- **damageType**: e.g., Electric, Psychic
- **adversaryType**: e.g., Colossus
- **condition**: Custom conditions
- **domain**: Custom domains

Each extension has a slug (auto-generated), name, description, and optional typed data. Only available within frames (not base homebrew).

API: `POST /frames/{frameId}/extensions`, `PUT /frames/{frameId}/extensions/{extensionType}/{slug}`, `DELETE /frames/{frameId}/extensions/{extensionType}/{slug}`

### Requirement 4: Flexible Content Inclusion
**Status**: Complete

`FrameContentRef` links homebrew content to a frame by reference (contentType + contentId + name). Any number of homebrew items can be included — from zero to everything.

API: `POST /frames/{frameId}/contents`, `DELETE /frames/{frameId}/contents/{contentType}/{contentId}`

### Requirement 5: Attach to Campaigns
**Status**: Complete

`CampaignFrameAttachment` records link frames to campaigns. Both new and existing campaigns can have frames attached.

API: `POST /campaigns/{campaignId}/frames`, `GET /campaigns/{campaignId}/frames`, `DELETE /campaigns/{campaignId}/frames/{frameId}`

### Requirement 6: Multiple Frames Per Campaign
**Status**: Complete

Multiple frames can be attached to a single campaign. On attachment, conflict detection runs automatically — it queries all content from the new frame plus all existing attached frames and detects collisions (same contentType + name across different frames).

### Requirement 7: Per-Item Conflict Resolution
**Status**: Complete

When conflicts are detected during frame attachment, `CampaignConflictResolution` records are created. GMs can resolve each conflict individually by choosing a winning frame. Resolutions persist and are cleaned up when frames are detached.

API: `GET /campaigns/{campaignId}/conflicts`, `POST /campaigns/{campaignId}/conflicts`, `DELETE /campaigns/{campaignId}/conflicts/{contentType}/{contentName}`

---

## DynamoDB Schema

### Frames Table (`daggerheart-frames-{stage}`)

| Record Type | PK | SK | Purpose |
|---|---|---|---|
| Frame Metadata | `FRAME#{frameId}` | `METADATA` | Core frame data |
| Content Ref | `FRAME#{frameId}` | `CONTENT#{contentType}#{contentId}` | Homebrew content link |
| Restriction | `FRAME#{frameId}` | `RESTRICTION#{contentType}#{contentId}` | SRD restriction/alteration |
| Extension | `FRAME#{frameId}` | `EXTENSION#{extensionType}#{slug}` | Custom type extension |

**GSI `creator-index`**: PK=`creatorUserId`, SK=`updatedAt` (for listing user's frames)

### Campaigns Table (existing, new record types)

| Record Type | PK | SK | Purpose |
|---|---|---|---|
| Frame Attachment | `CAMPAIGN#{campaignId}` | `FRAME#{frameId}` | Links frame to campaign |
| Conflict Resolution | `CAMPAIGN#{campaignId}` | `CONFLICT#{contentType}#{name}` | Per-item resolution |

---

## Build Status

- esbuild: Compiles successfully (168.4kb)
- TypeScript: 0 new errors (10 pre-existing errors in homebrew/handler.ts)
- All 20 routes registered in CDK infrastructure

---

## Next Steps

1. Frontend types mirroring shared types
2. Frontend API client for all 20 endpoints
3. Frontend stores/hooks (frames store, campaign frames integration)
4. Frontend UI components (frame builder, frame browser, campaign frame manager, conflict resolver)
5. Git commit and push
