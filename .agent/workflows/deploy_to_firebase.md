---
description: How to deploy the Next.js application to Firebase Hosting
---

This workflow guides you through deploying your Fleet Management application to Firebase.

## Prerequisites
- You must have the [Firebase CLI](https://firebase.google.com/docs/cli) installed: `npm install -g firebase-tools`
- You must be logged in: `firebase login`

## Steps

1. **Enable Web Frameworks**
   Firebase now has native support for Next.js. Enable it first:
   ```bash
   firebase experiments:enable webframeworks
   ```

2. **Initialize Firebase**
   Run the initialization command in your project root:
   ```bash
   firebase init hosting
   ```
   - Select **"Use an existing project"** and choose your project.
   - It should detect **Next.js**. Answer **Yes** to use the codebase.
   - Server side rendering / Cloud Functions? **Yes** (recommended for full features) or No (if you want static only).
   - Region: Choose one close to you (e.g., `europe-west1`).
   - GitHub Actions? **No** (unless you want to set it up now).

3. **Deploy**
   Build and deploy your application:
   ```bash
   firebase deploy
   ```

## Updates
For future updates, simply run:
```bash
firebase deploy
```
