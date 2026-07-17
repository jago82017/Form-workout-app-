# FORM

FORM is a mobile-first, installable workout tracker built with React and TypeScript. It includes six starter routines, weekly planning, a live set logger, persistent rest timer, personal-record detection, progress charts, workout history, body tracking, local progress photos, data import/export, themes, and accessibility options.

## Run locally

Install the current Node.js LTS release, then run:

```bash
npm install
npm run dev
```

Open the local address shown in the terminal. To open FORM on another device on the same Wi-Fi network, use the network address shown by Vite.

## Test and build

```bash
npm test
npm run build
npm run preview
```

The tests cover immutable set logging, workout completion, personal-record detection, deadline-based rest timing, and IndexedDB persistence.

## Deploy

Deploy this folder to Vercel or Netlify using the defaults:

- Build command: `npm run build`
- Publish directory: `dist`

For the simplest no-code route, sign in to Netlify, open Netlify Drop, and upload the provided `FORM-deploy.zip`. The included `netlify.toml` supplies the build and publish settings.

HTTPS is required for installation and full service-worker support.

## Install on a phone

1. Deploy FORM or open it from an HTTPS development URL.
2. On Android/Chrome, open the browser menu and choose **Install app** or use FORM's install banner.
3. On iPhone/Safari, tap **Share**, choose **Add to Home Screen**, then tap **Add**.

Once opened successfully online, FORM's application shell is cached for offline training. Workout data and photos stay in the phone's browser database unless manually exported.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the screen flow and data model.
