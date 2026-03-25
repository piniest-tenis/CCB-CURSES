# Campaign System Architecture

## 1. Overview

This document describes the full design for the campaign system: creation, membership (GM and player roles), invites, character assignment, GM tools, and the real-time "ping" feature. It is written against the existing stack — AWS Lambda (Node 20/ARM64), API Gateway HTTP v2, DynamoDB (single-table-adjacent multi-table pattern), Cognito JWT auth, and Next.js 14 (App Router) on the frontend.

---

## 2. Data Model

### 2.1 New DynamoDB Table: `daggerheart-campaigns-{stage}`

All campaign data lives in a single table using a composite key pattern. A single table is preferred here (over adding to an existing table) because access patterns are campaign-centric and benefit from locality.

```
PK                         SK                           Entity
──────────────────────────────────────────────────────────────────────────
CAMPAIGN#{campaignId}      METADATA                     CampaignRecord
CAMPAIGN#{campaignId}      MEMBER#GM#{userId}           CampaignMemberRecord (GM)
CAMPAIGN#{campaignId}      MEMBER#PLAYER#{userId}       CampaignMemberRecord (Player)
CAMPAIGN#{campaignId}      CHARACTER#{characterId}      CampaignCharacterRecord
CAMPAIGN#{campaignId}      INVITE#{inviteCode}          CampaignInviteRecord
USER#{userId}              CAMPAIGN#{campaignId}        UserCampaignIndexRecord  (GSI mirror)
```

**Why this layout:**
- `CAMPAIGN#{id}` as PK lets us fetch all members, characters, and invites for a campaign in a single `Query` (by PK, filtering SK prefix).
- The `USER#` → `CAMPAIGN#` SK items (plus a GSI on `userId`) let us query "which campaigns does this user belong to?" efficiently without a scan.

#### GSIs on the campaigns table

| GSI name            | PK              | SK                   | Purpose |
|---------------------|-----------------|----------------------|---------|
| `userId-index`      | `userId` (STR)  | `campaignId` (STR)   | List all campaigns a user is in |
| `inviteCode-index`  | `inviteCode` (STR) | —                 | Resolve an invite by its code |

---

### 2.2 Type Definitions (additions to `shared/src/types.ts`)

```typescript
// ─── Campaign ─────────────────────────────────────────────────────────────────

export type CampaignMemberRole = "gm" | "player";

/**
 * A campaign's top-level metadata record.
 */
export interface Campaign {
  campaignId: string;
  name: string;
  description: string | null;
  /** userId of the primary/owner GM. */
  primaryGmId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A membership record — one per (campaign, user) pair.
 */
export interface CampaignMember {
  campaignId: string;
  userId: string;
  role: CampaignMemberRole;
  /** ISO timestamp of when this member joined. */
  joinedAt: string;
}

/**
 * A summary of a campaign returned in list views,
 * enriched with the caller's role and character (if any).
 */
export interface CampaignSummary extends Campaign {
  memberCount: number;
  callerRole: CampaignMemberRole | null;
  callerCharacterId: string | null;
}

/**
 * Full campaign view — includes all members and assigned characters.
 */
export interface CampaignDetail extends Campaign {
  members: CampaignMemberDetail[];
  characters: CampaignCharacterDetail[];
}

export interface CampaignMemberDetail {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: CampaignMemberRole;
  joinedAt: string;
  /** characterId assigned to this campaign, or null. */
  characterId: string | null;
}

export interface CampaignCharacterDetail {
  characterId: string;
  userId: string;         // owner
  name: string;
  className: string;
  level: number;
  avatarUrl: string | null;
  portraitUrl: string | null;
}

/**
 * A single-use (or multi-use, GM's choice) invite token.
 */
export interface CampaignInvite {
  campaignId: string;
  inviteCode: string;     // short URL-safe random string, e.g. 8–12 chars
  createdByUserId: string;
  /** null = unlimited uses */
  maxUses: number | null;
  useCount: number;
  /** ISO expiry timestamp; null = never expires */
  expiresAt: string | null;
  /** The role that will be granted to the acceptor. Always "player" for now. */
  grantRole: CampaignMemberRole;
  createdAt: string;
}

// ─── Ping Event (real-time) ───────────────────────────────────────────────────

/**
 * Payload broadcast via WebSocket / SSE when a GM pings an element
 * on a player's character sheet.
 */
export interface PingEvent {
  type: "ping";
  campaignId: string;
  targetCharacterId: string;
  /** CSS selector / data-field attribute that identifies the element. */
  fieldKey: string;
  senderUserId: string;
  timestamp: string;
}
```

---

### 2.3 DynamoDB Record Shapes (internal)

```typescript
// Stored in the campaigns table

interface CampaignRecord extends Campaign {
  PK: `CAMPAIGN#${string}`;
  SK: "METADATA";
}

interface CampaignMemberRecord extends CampaignMember {
  PK: `CAMPAIGN#${string}`;
  SK: `MEMBER#GM#${string}` | `MEMBER#PLAYER#${string}`;
  /** Duplicated on the item so the userId-index GSI can project it. */
  userId: string;
  campaignId: string;
}

interface CampaignCharacterRecord {
  PK: `CAMPAIGN#${string}`;
  SK: `CHARACTER#${string}`;
  campaignId: string;
  characterId: string;
  /** Owner of the character (mirrors Character.userId). */
  userId: string;
  /** Denormalized for list views — kept in sync on character rename. */
  name: string;
  className: string;
  level: number;
  avatarUrl: string | null;
  portraitUrl: string | null;
  addedAt: string;
}

interface CampaignInviteRecord extends CampaignInvite {
  PK: `CAMPAIGN#${string}`;
  SK: `INVITE#${string}`;
  /** Duplicated so the inviteCode-index GSI can resolve it. */
  inviteCode: string;
  /** Unix epoch (seconds) for DynamoDB TTL — set from expiresAt. */
  ttl?: number;
}

/**
 * Written to USER#{userId} partition so the userId-index GSI
 * can answer "what campaigns is this user in?"
 */
interface UserCampaignIndexRecord {
  PK: `USER#${string}`;
  SK: `CAMPAIGN#${string}`;
  userId: string;
  campaignId: string;
  role: CampaignMemberRole;
}
```

> **Note on character constraint:** "A character can only belong to one campaign at a time" is enforced by writing `campaignId` directly onto the character record (`Character.campaignId: string | null`). Before adding a character to a campaign the handler checks that `character.campaignId` is null. When a character leaves (or is removed from) a campaign this field is cleared. This avoids a cross-table scan and makes the constraint cheap to enforce.

A new optional field is therefore added to `Character` and `CharacterSummary`:

```typescript
/** The campaign this character is currently assigned to, or null. */
campaignId: string | null;
```

---

## 3. API Routes

All new routes live behind the existing JWT authorizer. A new Lambda (`daggerheart-campaigns-{stage}`) handles them all.

### 3.1 Campaign CRUD

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/campaigns` | JWT | List campaigns the caller belongs to |
| `POST` | `/campaigns` | JWT | Create a campaign (caller becomes primary GM) |
| `GET`  | `/campaigns/{campaignId}` | JWT+member | Get full campaign detail |
| `PATCH`| `/campaigns/{campaignId}` | JWT+GM | Update name / description |
| `DELETE`| `/campaigns/{campaignId}` | JWT+primaryGM | Delete campaign |

### 3.2 Member Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/campaigns/{campaignId}/members` | JWT+member | List members |
| `DELETE`| `/campaigns/{campaignId}/members/{userId}` | JWT+GM | Remove a member (and their character) |
| `PATCH`| `/campaigns/{campaignId}/members/{userId}` | JWT+primaryGM | Promote/demote role (grant/revoke GM status) |

**Primary GM handoff rule:** If the primary GM leaves voluntarily (`DELETE /campaigns/{campaignId}/members/{self}`) or is deleted by another admin, the backend automatically promotes the longest-tenured co-GM (ordered by `joinedAt ASC`). If no co-GM exists, the campaign is dissolved.

### 3.3 Invites

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/campaigns/{campaignId}/invites` | JWT+GM | Create an invite link |
| `GET`  | `/campaigns/{campaignId}/invites` | JWT+GM | List active invites |
| `DELETE`| `/campaigns/{campaignId}/invites/{inviteCode}` | JWT+GM | Revoke an invite |
| `POST` | `/invites/{inviteCode}/accept` | JWT | Accept an invite (join campaign as player) |

The invite URL surfaced to the user looks like:

```
https://app.curses-ccb.example.com/join/{inviteCode}
```

The frontend `/join/[code]` page calls `POST /invites/{inviteCode}/accept` with the caller's JWT, which:
1. Validates the invite (not expired, not over `maxUses`, campaign still exists).
2. Creates a `CampaignMemberRecord` (role = `grantRole`).
3. Creates a `UserCampaignIndexRecord`.
4. Increments `useCount`; if `useCount >= maxUses` the invite is deleted.
5. Returns the `CampaignDetail` so the frontend can redirect to the campaign view.

### 3.4 Character Assignment

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/campaigns/{campaignId}/characters` | JWT+member | Add an existing character to the campaign |
| `POST` | `/campaigns/{campaignId}/characters/new` | JWT+member | Create a new character directly in the campaign |
| `DELETE`| `/campaigns/{campaignId}/characters/{characterId}` | JWT+GM or owner | Remove a character from the campaign |

**Add existing character (`POST /campaigns/{campaignId}/characters`):**
- Body: `{ characterId: string }`
- Validates: caller owns the character AND `character.campaignId === null`.
- Writes a `CampaignCharacterRecord` and patches `character.campaignId = campaignId` on the characters table.

**Create new character in campaign (`POST /campaigns/{campaignId}/characters/new`):**
- Body: same as `POST /characters` (proxies through the existing character creation logic).
- Immediately assigns the new character to the campaign after creation.

**Remove character:**
- If caller is the character owner: self-remove allowed.
- If caller is a GM: can remove any character.
- Deletes the `CampaignCharacterRecord`, patches `character.campaignId = null`.

---

## 4. Real-Time Ping Feature

### 4.1 Mechanism

The GM middle-clicks any field on a player's character sheet. The frontend fires a **WebSocket message** to the server identifying the campaign, target character, and field. The server broadcasts it to all connections watching that character's sheet. The target player's browser receives it and triggers a visual effect on that element.

### 4.2 Transport: API Gateway WebSocket API

A second API Gateway is added alongside the existing HTTP API — an **API Gateway WebSocket API** (`daggerheart-ws-{stage}`). This is AWS-native, serverless, and requires no persistent process.

Three Lambda handlers back it:
- `$connect` — validates the JWT (passed as `?token=...` query param at connect time, since WS doesn't support `Authorization` headers in browser `WebSocket()`), stores the connection in a `ConnectionsTable`.
- `$disconnect` — removes the connection from `ConnectionsTable`.
- `$default` (or named route `ping`) — processes incoming ping payloads and calls `ApiGatewayManagementApi.postToConnection` on all relevant connections.

### 4.3 ConnectionsTable

A new DynamoDB table `daggerheart-connections-{stage}`:

```
PK                            SK                            Entity
─────────────────────────────────────────────────────────────────────
CONNECTION#{connectionId}     METADATA                      ConnectionRecord
CHARACTER#{characterId}       CONNECTION#{connectionId}     CharacterConnectionRecord
```

```typescript
interface ConnectionRecord {
  PK: `CONNECTION#${string}`;
  SK: "METADATA";
  connectionId: string;
  userId: string;
  campaignId: string;
  /** The character sheet this connection is currently viewing. */
  characterId: string;
  connectedAt: string;
  /** Unix epoch TTL — set to connectedAt + 24 h so stale records self-clean. */
  ttl: number;
}

interface CharacterConnectionRecord {
  PK: `CHARACTER#${string}`;
  SK: `CONNECTION#${string}`;
  characterId: string;
  connectionId: string;
  /** Duplicated so we can query all connections for a given character. */
  userId: string;
  ttl: number;
}
```

### 4.4 WebSocket Message Protocol

**Client → Server (ping request):**
```json
{
  "action": "ping",
  "campaignId": "...",
  "targetCharacterId": "...",
  "fieldKey": "trackers.hp"
}
```

`fieldKey` is a dot-path string matching a `data-field-key` attribute placed on every interactive element in the character sheet. Examples: `"trackers.hp"`, `"stats.agility"`, `"domainLoadout.0"`.

**Server → Client (ping broadcast):**
```json
{
  "type": "ping",
  "campaignId": "...",
  "targetCharacterId": "...",
  "fieldKey": "trackers.hp",
  "senderUserId": "...",
  "timestamp": "2026-03-25T12:00:00.000Z"
}
```

**Authorization in the `ping` handler:**
1. Look up the caller's `ConnectionRecord` → derive their `userId`.
2. Verify the caller is a GM of `campaignId` by querying `CampaignMemberRecord`.
3. Verify `targetCharacterId` is in `campaignId`.
4. Query `CHARACTER#{targetCharacterId}` → all `CONNECTION#*` SKs → collect `connectionId`s.
5. `postToConnection` to each; silently drop any that return `GoneException` (stale).

### 4.5 Frontend: Ping Effect

Each character sheet element gets a `data-field-key` attribute and a unique `id` derived from it. When the client receives a `{ type: "ping" }` message:

```typescript
function handlePing(event: PingEvent) {
  const el = document.querySelector(
    `[data-field-key="${CSS.escape(event.fieldKey)}"]`
  );
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  el.classList.add("ping-active");
  setTimeout(() => el.classList.remove("ping-active"), 2000);
}
```

CSS for the visual pulse (Tailwind + custom keyframe, or global CSS):

```css
@keyframes ping-pulse {
  0%   { box-shadow: 0 0 0 0px rgba(251, 191, 36, 0.7); }   /* amber-400 */
  70%  { box-shadow: 0 0 0 12px rgba(251, 191, 36, 0); }
  100% { box-shadow: 0 0 0 0px rgba(251, 191, 36, 0); }
}

.ping-active {
  outline: 2px solid rgb(251, 191, 36);
  outline-offset: 2px;
  animation: ping-pulse 1s ease-out 3;   /* 3 pulses over 3 seconds */
}
```

**Middle-click (GM side):**

```typescript
function handleMiddleClick(e: MouseEvent, fieldKey: string) {
  if (e.button !== 1) return;         // only middle button
  e.preventDefault();
  ws.send(JSON.stringify({
    action: "ping",
    campaignId: activeCampaignId,
    targetCharacterId: viewedCharacterId,
    fieldKey,
  }));
}
```

The GM must be viewing a player's sheet within the campaign context for the middle-click handler to be active. The `data-field-key` is already mounted on every sheet element in the character sheet component tree.

### 4.6 WebSocket Connection Lifecycle

```
Browser                   API GW WS                  Lambda ($connect)
  |                           |                              |
  |-- WS connect ?token=JWT ->|                              |
  |                           |-- invoke $connect handler -->|
  |                           |       verify JWT             |
  |                           |       write ConnectionRecord |
  |<-- 101 Switching ---------|<-- 200 OK ------------------|

  [later: GM middle-clicks]

Browser (GM)              API GW WS             Lambda (ping handler)
  |-- {"action":"ping",...}-->|                              |
  |                           |-- invoke ping handler ------->|
  |                           |    verify GM role            |
  |                           |    query target connections  |
  |                           |<-- postToConnection each ----|

Browser (player)          API GW WS
  |<-- {"type":"ping",...}---|
  | scrollIntoView + pulse   |
```

---

## 5. Infrastructure Changes

### 5.1 New DynamoDB Tables

| Table | PK | SK | GSIs |
|-------|----|----|------|
| `daggerheart-campaigns-{stage}` | `PK` (STR) | `SK` (STR) | `userId-index` (PK=`userId`, SK=`campaignId`), `inviteCode-index` (PK=`inviteCode`) |
| `daggerheart-connections-{stage}` | `PK` (STR) | `SK` (STR) | — (TTL on `ttl` attribute) |

DynamoDB Streams should be **enabled** on the campaigns table (`NEW_AND_OLD_IMAGES`) to allow future event-driven features (e.g., push notifications when a character is pinged, campaign audit log).

### 5.2 New Lambda Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `daggerheart-campaigns-{stage}` | HTTP API routes | Campaign CRUD, member management, invites, character assignment |
| `daggerheart-ws-connect-{stage}` | WS `$connect` | Auth + register connection |
| `daggerheart-ws-disconnect-{stage}` | WS `$disconnect` | Remove connection record |
| `daggerheart-ws-ping-{stage}` | WS `ping` route | Authorize + broadcast ping |

### 5.3 IAM Grants

`daggerheart-campaigns-{stage}`:
- Read/Write: `campaigns` table
- Read: `characters` table (validate character ownership, campaignId)
- Read: `users` table (resolve display names in member lists)
- Write: `characters` table (patch `campaignId` on character records)

`daggerheart-ws-*`:
- Read/Write: `connections` table
- Read: `campaigns` table (verify GM role, character membership)
- `execute-api:ManageConnections` on the WS API ARN (for `postToConnection`)

### 5.4 New CDK Stacks (or additions to existing)

Add `CampaignStack` (extends `cdk.Stack`):
- `CampaignsTable` (DynamoDB)
- `ConnectionsTable` (DynamoDB, TTL enabled)
- `CampaignsHandler` (Lambda)
- `WsApi` (API Gateway WebSocket API)
- `WsConnectHandler`, `WsDisconnectHandler`, `WsPingHandler` (Lambda)
- Expose `wsApiUrl` as a CFn Output

The WebSocket URL follows the pattern: `wss://{ws-api-id}.execute-api.{region}.amazonaws.com/{stage}`.

---

## 6. Frontend Pages and Components

### 6.1 New Routes (Next.js App Router)

```
/campaigns                          → Campaign list (player/GM view)
/campaigns/new                      → Create campaign form
/campaigns/[id]                     → Campaign detail (roster + character sheets)
/campaigns/[id]/settings            → Campaign settings (GM only)
/campaigns/[id]/characters/[charId] → Player character sheet (GM ping-enabled view)
/join/[code]                        → Invite accept page
```

### 6.2 Campaign List Page (`/campaigns`)

- Shows all campaigns the user belongs to, with their role badge (GM / Player).
- "Create campaign" button → `/campaigns/new`.

### 6.3 Campaign Detail Page (`/campaigns/[id]`)

**GM view:**
- Roster sidebar: list of members with their character cards.
- Click a character card → opens that character's sheet in the main panel.
- Middle-click any element in the sheet → fires a ping.
- Buttons: Remove player, Manage invites, Campaign settings.

**Player view:**
- Shows own character sheet.
- Read-only view of other players' characters (no ping ability).
- Can add/import a character if they don't yet have one.

### 6.4 Invite Flow

1. GM opens "Manage Invites" modal → `POST /campaigns/{id}/invites` → receives `inviteCode`.
2. GM copies URL: `https://app.curses-ccb.example.com/join/{inviteCode}`.
3. Invited user navigates to `/join/{code}` → frontend calls `POST /invites/{code}/accept`.
4. On success: redirect to `/campaigns/{campaignId}` with "You've joined!" toast.
5. If user has no character: prompt to create or import one.

### 6.5 WebSocket Hook (`useGameWebSocket`)

```typescript
// frontend/src/hooks/useGameWebSocket.ts
export function useGameWebSocket(campaignId: string, characterId: string) {
  // Connects to the WS API, passing the Cognito JWT as ?token=...
  // Exposes: sendPing(fieldKey), onPing callback
}
```

Used by the campaign character sheet view. The GM's instance calls `sendPing`; the player's instance registers the `onPing` handler.

---

## 7. Authorization Summary

| Action | Required role |
|--------|--------------|
| View campaign | Member (GM or Player) |
| Edit campaign name/description | Any GM |
| Delete campaign | Primary GM only |
| Create invite | Any GM |
| Revoke invite | Any GM |
| Accept invite | Authenticated user (not already a member) |
| View member list | Member |
| Remove member | Any GM |
| Promote/demote role | Primary GM only |
| Add character to campaign | Member (must own the character) |
| Create character in campaign | Member |
| Remove own character | Character owner |
| Remove any character | Any GM |
| Send ping | Any GM |
| Receive ping | Any authenticated WS connection viewing that character |

---

## 8. Key Design Decisions and Rationale

### Character uniqueness constraint
Enforced by a `campaignId` field on the character record itself (checked-and-set in the campaigns Lambda with a DynamoDB condition expression). This is cheaper and more reliable than a secondary index scan.

### Invite codes
Short random strings (12 bytes → 16-char base64url) generated server-side. Stored with an optional TTL so DynamoDB auto-expires them. The `inviteCode-index` GSI enables O(1) lookup without knowing the campaignId, which is needed on the `/join/{code}` page where the user may not know the campaign.

### Primary GM handoff
Rather than a complex distributed lock, the handoff is a simple two-step atomic-enough pattern: (1) delete the departing GM's member record, (2) query remaining GM members ordered by `joinedAt`, promote the first. If step 2 finds no co-GM, the campaign METADATA record is deleted (cascade). The small window between steps is acceptable for this use case.

### WebSocket over SSE
SSE is simpler and sufficient for one-directional ping broadcasts. However, the same WebSocket connection can be reused for future bidirectional features (initiative order, shared dice rolls, party HP display). The additional complexity of WS is worth the forward compatibility.

### Ping transport: in-band WebSocket, not DynamoDB Streams
Routing through a DynamoDB Stream → Lambda → API GW Management API adds ~100–300 ms of latency from the ping source to the broadcast. Sending the ping message directly over the already-open WebSocket connection and having the ping Lambda call `postToConnection` synchronously keeps round-trip latency under 100 ms for most regions.

### `data-field-key` on every sheet element
The field key must be stable across re-renders and unambiguous. Using the logical field path (e.g. `"trackers.hp"`, `"stats.agility"`) rather than a DOM id means the GM's and player's browsers agree on identity even if they are on slightly different versions of the frontend.

---

## 9. Migration Path for Existing Characters

No migration is needed for existing character records. The new `campaignId` field defaults to `null` (absent from the record = null) and the DynamoDB document model handles missing fields gracefully. No schema change affects any existing Lambda read path.

---

## 10. Open Questions / Future Scope

| Item | Notes |
|------|-------|
| Campaign-scoped chat | Could reuse the WS infrastructure with a `chat` action route |
| Shared dice roll visibility | Another WS action; GM rolls visible to all players |
| Reputation/faction tracking at campaign level | `Campaign` record could hold `partyReputation: Record<factionId, number>` |
| Campaign session notes (GM only) | Simple `notes` field on `CampaignRecord`, or a separate Notes sub-collection |
| Character sheet field-level locking (GM-writes player stats) | Requires per-field edit permission model; out of scope for v1 |
| Invite links with expiry UI | Currently supported in the data model; just needs a datepicker in the UI |
