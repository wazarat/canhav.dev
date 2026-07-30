# CanHav Landing Page

Standalone recreation of the canhav.co landing page — static, no backend, ready for Vercel.

## Develop

```bash
npm install
npm run dev
```

## Edit the content

- **Copy that appears in more than one place + summary stats**: `content/site.ts`
- **Product-line cards** (title, description, tags, badge, graphic): `content/product-lines.ts`
- **Hero headline & subline**: `app/page.tsx`
- **Section copy**: `components/home/ProductLines.tsx`, `components/home/BuiltForBuilders.tsx`
- **Modals** (waitlist / contact): `components/home/WaitlistModal.tsx`, `components/home/ContactModal.tsx` — submissions are stubbed (`// TODO: wire to backend`)

## Deploy

Push to a Git repo and import into Vercel, or run `vercel` from this directory. Zero
environment variables required.
