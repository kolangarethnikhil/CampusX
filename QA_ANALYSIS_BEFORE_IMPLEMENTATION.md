# CampusX Arena Fullstack — QA Analysis Before Implementation

## Goal

Convert the approved Arena premium UI into the real CampusX frontend and integrate it with Firebase backend services while preserving the UI style.

## Non-negotiables

- Preserve approved Arena UI language.
- Do not introduce a new visual redesign.
- Use TypeScript.
- Real-time data where useful:
  - spaces list
  - space messages
  - space members
  - housing listings
  - marketplace listings
  - saved posts where possible
- Firebase dev project should be used for testing.
- Firestore rules must exist for new backend collections.
- Build must pass before delivery.

## Frontend QA checklist

### App shell
- Bottom navigation works.
- Home opens with approved UI.
- Boards opens board grid.
- Board listings opens real/mocked fallback listings.
- Listing detail opens with selected listing.
- Spaces opens spaces list.
- Room chat opens selected space.
- Profile opens saved/my posts and settings sheet.

### UI preservation
- Keep dark premium glassmorphism.
- Keep approved cards, spacing, colors and icon treatment.
- Do not re-add congested Fresh Around section.
- Keep install CTA in Profile, not Home.
- Keep moderator/member details hidden behind info/three-dot sheet.

### Mobile/PWA QA
- Touch targets should remain 40px+ where possible.
- Bottom nav should remain reachable.
- Chat input should remain compact.
- Main scroll regions should not horizontally overflow.

## Backend QA checklist

### Firebase Auth
- User can sign in with Google.
- If signed out, app can still browse public listings/spaces where allowed.
- User-specific actions should request sign in.

### Firestore spaces
- `spaces` collection readable for active spaces.
- Users can join spaces.
- Users can send messages only after joining.
- Space messages update in real time.
- Space members update in real time.
- Moderator/admin message delete foundation exists.

### Listings
- Housing listings read from `housing_listings`.
- Marketplace listings read from `marketplace_listings`.
- UI falls back to demo data if Firebase has no data, so preview is not blank.
- Saved posts use `saved_listings`.

### Requests
- Users can request a new space.
- Users can request moderator role.
- Admin can review later.

### Firestore rules
- No broad write permissions.
- Admin-only space creation.
- Members-only space messages.
- Request documents user-created only.

## Risk log

1. Full production runtime cannot be verified without user's Firebase dev env credentials.
2. Supabase image uploads are not fully exercised in this pass.
3. Existing Arena create-post UI is limited; first integration focuses on browse/chat/save/request foundations.
4. Some listing create/edit flows may remain as prototype until next iteration.

## Delivery criteria

- `npm run typecheck` passes.
- `npm run build` passes.
- Final zip includes code, rules, scripts, README.
