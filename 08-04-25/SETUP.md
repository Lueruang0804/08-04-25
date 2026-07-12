# Deploying the anniversary site (Supabase + Vercel)

A few things need to exist in Supabase before the "one shareable link"
works end to end (tables for the letter/story/reasons, Storage buckets
for photos/music), plus Vercel environment variables so the two
passcodes and the Supabase key stay server-side.

## 1. Create the Supabase table

1. Go to [supabase.com](https://supabase.com) → create a free account
   → **New project**.
2. Once it's ready, open the **SQL Editor** and run:

   ```sql
   create table letter (
     id int primary key,
     content text not null,
     greeting text not null default 'Dear My Love,',
     signature text not null default '[Your Name]',
     updated_at timestamptz not null default now()
   );

   insert into letter (id, content, greeting, signature) values (
     1,
     '[Write your personal letter here. Talk about how you met, what she means to you, your favorite memory together, and what you''re looking forward to. This is the heart of the whole website — take your time with it.]',
     'Dear My Love,',
     '[Your Name]'
   );
   ```

   > Already have a `letter` table from before? Just run:
   > `alter table letter add column greeting text not null default 'Dear My Love,'; alter table letter add column signature text not null default '[Your Name]';`

   You don't need to set up Row Level Security policies — the site's
   serverless functions talk to Supabase using the `service_role` key,
   which bypasses RLS entirely. The public browser never talks to
   Supabase directly.

3. Still in the SQL Editor, run this too — it's the table for the
   "Our Story So Far" timeline (editable from the admin screen):

   ```sql
   create table timeline (
     id int primary key,
     entries jsonb not null,
     updated_at timestamptz not null default now()
   );

   insert into timeline (id, entries) values (
     1,
     '[
       {"icon": "❤️", "title": "The Day We Met", "text": "[Describe the day your story began.]"},
       {"icon": "🌷", "title": "Our First Date", "text": "[Describe your first date together.]"},
       {"icon": "📸", "title": "Our Favorite Memory", "text": "[Describe a memory that means the world to you.]"},
       {"icon": "🎂", "title": "Birthdays Together", "text": "[Describe celebrating birthdays as a couple.]"},
       {"icon": "💕", "title": "Today — Our Anniversary", "text": "And here we are, still writing our story together."}
     ]'::jsonb
   );
   ```

4. Run this too — the table for the "Reasons I Love You" list
   (editable from the admin screen, add/edit/delete/reorder):

   ```sql
   create table reasons (
     id int primary key,
     entries jsonb not null,
     updated_at timestamptz not null default now()
   );

   insert into reasons (id, entries) values (
     1,
     '[
       "I love the way you always make me smile.",
       "I love how you always support me.",
       "I love how you make every day feel special.",
       "I love your kindness.",
       "I love every little thing about you."
     ]'::jsonb
   );
   ```

5. Create a Storage bucket for gallery photos: in the left sidebar,
   click **Storage → New bucket**. Name it exactly `photos`, and turn
   **Public bucket** ON (so the gallery can load images directly
   without going through a server function). This same bucket also
   holds the single "featured" photo above the Reasons list — no
   separate bucket needed for that. No need to upload anything here —
   photos get added later through the admin editor.

6. Create a second Storage bucket for the background song: **New
   bucket**, name it exactly `music`, **Public bucket** ON. Again,
   nothing to upload here — the song gets added through the admin
   editor's Music section.

7. Go to **Settings → API** and copy:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role secret** (NOT the `anon` key) → this is
     `SUPABASE_SERVICE_ROLE_KEY`. Keep this one truly secret — it can
     read/write your whole database.

## 2. Deploy to Vercel

1. Push this folder to the GitHub repo (already done:
   `github.com/Lueruang0804/08-04-25`).
2. In [vercel.com](https://vercel.com), **Add New → Project**, import
   that repo. Framework preset: "Other" (it's static + serverless
   functions, no build step needed).
3. Before the first deploy (or right after, then redeploy), add these
   under **Settings → Environment Variables**. All four are required —
   the site returns an error on the passcode/letter APIs until they're
   set, on purpose, so the real codes never sit in source control:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | from step 1.3 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1.3 |
   | `VIEW_PASSCODE` | your viewing passcode (type it directly into the Vercel field — don't put it in any file) |
   | `ADMIN_PASSCODE` | your admin passcode (same — Vercel field only) |

4. Deploy. Vercel automatically turns `api/verify-passcode.js` and
   `api/letter.js` into serverless functions — no extra config needed.

**Note on the public GitHub repo:** since `github.com/Lueruang0804/08-04-25`
is public, anyone can read `index.html`/`script.js`/`api/*.js` — but as
long as the passcodes are only ever typed into Vercel's environment
variable fields (never into a committed file), the repo being public
doesn't expose them. If you'd rather the code itself not be publicly
visible at all, flip the repo to private in GitHub's settings — Vercel
deployment works the same either way.

## 3. Using it

- Send your girlfriend the deployed link. She enters your viewing
  passcode (`VIEW_PASSCODE`), sees the site with whatever letter is
  currently saved.
- The flow is: passcode → love letter → an "Are you ready?" confirm
  card → clicking **Yes, I'm Ready ❤️** reveals the photo gallery,
  timeline, Reasons I Love You, and footer (all hidden and
  unreachable by scroll until then).
- You open the same link, enter your admin passcode (`ADMIN_PASSCODE`),
  land on a private editor screen (not the anniversary page) with five
  sections: the love letter, the "Our Story So Far" timeline entries,
  the six gallery photos, "Reasons I Love You" (a featured photo plus
  an add/edit/delete/reorder list), and Music. Letter, Story, and
  Reasons each have their own **Save** button; photos and the song
  upload automatically the moment you pick a file. Every change shows
  up immediately for anyone entering the viewing passcode — no
  redeploy needed.
- If you ever want to change either passcode, edit the
  `VIEW_PASSCODE` / `ADMIN_PASSCODE` environment variables in Vercel
  and redeploy — nothing in the source code needs to change.

## Notes

- If you open `index.html` directly as a file (no server), the site
  still works using hardcoded local fallback passcodes/letter in
  `script.js`, but Save won't persist anywhere — that's expected, it's
  just for quick local previews.
- The letter text is stored as plain text; separate paragraphs with a
  blank line in the editor's textarea.
- Photo uploads accept JPEG, PNG, or WebP, up to 6MB per photo.
- Music uploads accept MP3, WAV, OGG, M4A, or AAC, up to 4MB — keep it
  short or lower-bitrate since it's a request body limit, not a
  storage limit.
- No music plays until you upload one through the admin editor — this
  intentionally does not include or rehost any specific song by
  default (copyright/YouTube ToS reasons); bring your own legally
  obtained audio file.
