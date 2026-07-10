# Deploying the anniversary site (Supabase + Vercel)

Two things need to exist before the "one shareable link" works end to
end: a Supabase table to hold the letter, and Vercel environment
variables so the two passcodes and the Supabase key stay server-side.

## 1. Create the Supabase table

1. Go to [supabase.com](https://supabase.com) → create a free account
   → **New project**.
2. Once it's ready, open the **SQL Editor** and run:

   ```sql
   create table letter (
     id int primary key,
     content text not null,
     updated_at timestamptz not null default now()
   );

   insert into letter (id, content) values (
     1,
     '[Write your personal letter here. Talk about how you met, what she means to you, your favorite memory together, and what you''re looking forward to. This is the heart of the whole website — take your time with it.]'
   );
   ```

   You don't need to set up Row Level Security policies — the site's
   serverless functions talk to Supabase using the `service_role` key,
   which bypasses RLS entirely. The public browser never talks to
   Supabase directly.

3. Go to **Settings → API** and copy:
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
- You open the same link, enter your admin passcode (`ADMIN_PASSCODE`),
  land on a private editor screen (not the anniversary page), edit the
  letter, hit **Save**. The next person to enter the viewing passcode —
  anywhere, any device — sees the update immediately, no redeploy needed.
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
