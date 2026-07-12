# Render module-resolution fix

This build removes the extensionless import of `../vite.config` from `server/vite.ts`.
The Vite development configuration is now defined directly inside `server/vite.ts`, which avoids Render/Linux resolving the path as `/opt/render/project/vite.config`.

## Redeploy
1. Replace the files in your GitHub repository with this corrected folder.
2. Commit and push.
3. In Render, choose **Manual Deploy → Clear build cache & deploy**.
4. Confirm the Render Root Directory points to the folder containing `package.json` and `render.yaml`.
