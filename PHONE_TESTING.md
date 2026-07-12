# Captains Wild Game — Phone Testing

## Recommended: Deploy on Render

This project includes both the mobile web game and its Express API. Render can run both parts together, including room creation and multiplayer testing.

1. Create a free GitHub repository.
2. Upload every file from this folder to the repository.
3. Sign in to Render and choose **New + → Blueprint**.
4. Connect the GitHub repository.
5. Render will detect `render.yaml`. Select **Apply**.
6. When deployment finishes, open the Render URL on your iPhone.
7. In Safari, tap **Share → Add to Home Screen** for an app-like icon and full-screen launch.

## Test checklist

- Open Solo Game and select a difficulty.
- Tap the requested body-part controls to juggle.
- Confirm incorrect taps do not erase completed progress.
- Complete a round and check that the next challenge loads.
- For multiplayer, open the link on two phones or one phone plus a computer.
- Create a room on one device and join with the room code on the other.

## Important prototype limitation

Rooms, profiles, and leaderboard data currently use server memory/local SQLite-style prototype storage. A free hosting service may restart, which can clear temporary game data. This is acceptable for testing, but persistent production multiplayer should later use a hosted database such as Supabase/Postgres.

## Local computer testing

With Node.js 20 installed:

```bash
npm install
npm run dev
```

Open `http://localhost:5000` on the computer. To test on a phone connected to the same Wi-Fi, open the computer's local network IP followed by `:5000`.
