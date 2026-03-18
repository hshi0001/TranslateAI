# Translate

Translate and refine text with role-based style learning. Multi-user web app with presets, learning from accepted results, and optional Gemini-powered translation.

## Features

- **Multi-user**: email + password (register/login), session via JWT cookie
- **Global settings**: preferred words and emojis
- **Role presets**: e.g. Bob, Manager with traits (polite, bullet points)
- **Translate / Refine**: one button; source language auto-detected; same language → refine
- **Learning**: "Learn" on a result saves it for the selected role; future outputs follow these examples
- **Data**: without DB, file/tmp store (single device, lost on F5 if no localStorage). With **DATABASE_URL** (Neon/Vercel Postgres), **preset roles and account data sync across devices**; history still local.

## Tech Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Gemini API for translation/refine and language detection
- JWT (jose) + bcrypt for auth

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy the example env and set values:

```bash
cp .env.example .env.local
```

In `.env.local`:

- **GEMINI_API_KEY** – required for translation/refine ([Google AI](https://aistudio.google.com/apikey))
- **TRANSLATE_JWT_SECRET** – required for login; use a long random string in production
- **GEMINI_MODEL** – optional (default `gemini-2.5-pro`)
- **DATABASE_URL** – optional; Postgres connection string (e.g. [Neon](https://neon.tech)) so **preset roles and account data sync across devices and survive refresh**. Tables are created automatically on first use.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app root is the Translate UI.

## Deploy to GitHub and Vercel

### 1. Create a GitHub repo

1. On [GitHub](https://github.com/new), create a new repository (e.g. `translate-app`).
2. Do **not** initialize with README if this project already has one.

### 2. Push this project to GitHub

In the project folder (if not already a git repo):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name.

### 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
2. **Add New Project** → **Import** your GitHub repository.
3. Leave **Framework Preset** as Next.js and **Root Directory** as `.`.
4. Under **Environment Variables**, add:
   - **GEMINI_API_KEY** – your Gemini API key
   - **TRANSLATE_JWT_SECRET** – a long random secret (e.g. generate with `openssl rand -base64 32`)
   - **DATABASE_URL** (optional) – Postgres URL from [Neon](https://neon.tech) or Vercel Storage → Postgres, so preset roles sync across devices
5. Click **Deploy**. Vercel will build and give you a URL like `https://your-project.vercel.app`.

### 4. (Optional) Persist data on Vercel

The app uses a local file `data/translate-store.json`. On Vercel, the filesystem is **ephemeral**: data is lost on each new deployment or serverless cold start. For a real multi-user deployment you would:

- Use a database (e.g. Vercel Postgres, Supabase) or
- Use Vercel Blob / external storage for the store file.

For a quick public demo, the app will still run; users can register and use it until the instance is recycled.

## Scripts

- `npm run dev` – development server
- `npm run build` – production build
- `npm run start` – run production build locally
- `npm run lint` – ESLint
