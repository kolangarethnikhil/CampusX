# QA Report After Implementation

## Commands run

```bash
npm run typecheck
npm run build
```

## Result

- TypeScript check: PASSED
- Production build: PASSED

## Frontend verified by static/build QA

- App compiles with Firebase SDK.
- AuthProvider wraps the app.
- App subscribes to Firestore spaces/listings.
- App falls back to demo data when Firestore is empty or permission-limited.
- Spaces screen accepts real spaces.
- Room chat screen accepts real space object.
- Room chat subscribes to members/messages.
- Room chat can join and send messages.
- Profile accepts real listing data and Firebase user display name.
- Board listings can display real housing/market listing items.

## Backend files included

- `firestore.rules`
- `src/services/spaceService.ts`
- `src/services/spaceMessageService.ts`
- `src/services/spaceRequestService.ts`
- `src/services/moderatorRequestService.ts`
- `src/services/listingService.ts`
- `src/services/savedListingService.ts`
- `scripts/seed-kju-spaces.mjs`
- `scripts/set-admin-claim.mjs`

## Runtime QA that user must perform in Firebase dev

Because the assistant does not have your CampusXDev credentials, these must be tested by you:

1. Firebase Google sign-in works.
2. Firestore rules deploy to CampusXDev.
3. Seed script creates spaces.
4. User can join a seeded space.
5. User can send message in seeded space.
6. Message appears in real time.
7. Moderator request document is created.
8. Space request document is created.
9. Housing and marketplace listings appear if Firestore has data.
10. Vercel Preview uses CampusXDev environment variables, not production.

## Risk notes

- Do not deploy rules to production Firebase yet.
- Do not point dev branch to production Firebase during testing.
- Supabase upload integration still needs a create-listing UI pass.
- Direct listing chat integration remains a next-step task.
