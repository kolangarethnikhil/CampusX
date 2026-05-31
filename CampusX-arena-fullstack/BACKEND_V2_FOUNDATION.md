# CampusX Backend v2 Foundation

This patch adds the first backend foundation for CampusX v2 without replacing the existing MVP flows.

## Added

- Campus constants with `CAMPUS_ID`
- Shared TypeScript models:
  - `src/types/campus.ts`
  - `src/types/user.ts`
  - `src/types/space.ts`
  - `src/types/moderation.ts`
- Space services:
  - `src/services/spaceService.ts`
  - `src/services/spaceMessageService.ts`
  - `src/services/spaceRequestService.ts`
  - `src/services/moderatorRequestService.ts`
- Firestore rules for:
  - `spaces/{spaceId}`
  - `spaces/{spaceId}/members/{userId}`
  - `spaces/{spaceId}/messages/{messageId}`
  - `space_requests/{requestId}`
  - `moderator_requests/{requestId}`
- Admin/seed scripts:
  - `scripts/seed-kju-spaces.mjs`
  - `scripts/set-admin-claim.mjs`

## Recommended setup

Create a separate Firebase dev project and Supabase dev bucket before deploying rules.

Use Firebase aliases:

```bash
firebase use --add
# alias production as prod
firebase use --add
# alias dev project as dev
```

Deploy rules to dev only:

```bash
firebase use dev
firebase deploy --only firestore:rules
```

## Seed default spaces

Set local admin credentials first via either:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
export FIREBASE_PROJECT_ID="your-dev-project-id"
```

or use `.env.local` with `FIREBASE_SERVICE_ACCOUNT_JSON`.

Then run:

```bash
npm run seed:spaces
```

Optional admin seed membership:

```bash
SEED_ADMIN_UID="firebase-user-uid" npm run seed:spaces
```

## Set admin custom claim

```bash
npm run admin:set -- <firebase_uid> true
```

The user must sign out/sign in again to refresh custom claims.

## Notes

- Users cannot create spaces directly.
- Users can request spaces.
- Users can request moderator access.
- Admin SDK scripts/server routes should approve spaces and moderator roles.
- Space messages require membership.
