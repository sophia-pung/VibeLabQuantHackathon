# VibeLabQuantHackathon

This guide is for hackathon organizers who want to run the app on their own computer and share code changes with the team. You do not need to know Git commands; the steps below use GitHub Desktop.

## What you need

Install these free apps first:

- [GitHub Desktop](https://desktop.github.com/) — to download the project and commit/push changes.
- [Visual Studio Code](https://code.visualstudio.com/) — to open the project and its built-in terminal.
- [Bun](https://bun.sh/) — the tool this project uses to install and run the app. Follow the installation instructions for your computer on the Bun website.

You will also need access to the [VibeLabQuantHackathon GitHub repository](https://github.com/sophia-pung/VibeLabQuantHackathon). Ask the repository owner to invite your GitHub account if you cannot access it.

## One-time setup

1. Open GitHub Desktop and sign in to your GitHub account.
2. Select **File → Clone repository…**, choose the **URL** tab, and enter:

   ```text
   https://github.com/sophia-pung/VibeLabQuantHackathon.git
   ```

3. Choose a folder where you can easily find the project, then select **Clone**.
4. In GitHub Desktop, select **Repository → Open in Visual Studio Code**.
5. In Visual Studio Code, open **Terminal → New Terminal**. Make sure the terminal is in the `VibeLabQuantHackathon` folder, then run:

   ```sh
   bun install
   ```

   This downloads the project’s required packages. You only need to do this after first cloning, or when the project’s dependencies change.

### Connect to the hackathon data (if needed)

The app can open without a database connection, but sign-in, teams, submissions, and leaderboard data require the hackathon’s Supabase setup.

Ask the person managing the Supabase project for the **project URL** and **anon/publishable key**. In Visual Studio Code, create a file named `.env` in the project’s top-level folder and add:

```text
VITE_SUPABASE_URL=paste-the-project-url-here
VITE_SUPABASE_ANON_KEY=paste-the-anon-or-publishable-key-here
```

Save the file. The `.env` file is excluded from Git, so it will not be committed or pushed. Do not put a service-role or secret key in this file. The Supabase database and policies must already be set up by the project administrator.

## Run the app

1. In Visual Studio Code, open **Terminal → New Terminal**.
2. Run:

   ```sh
   bun run dev
   ```

3. Open the **Local** link printed in the terminal (usually `http://localhost:8080`) in your browser.
4. Leave the terminal running while you use the app. To stop it, click the terminal and press **Ctrl+C** (Windows/Linux) or **Control+C** (Mac).

The next time you want to run the app, open the project in Visual Studio Code and run `bun run dev` again.

## Save and share your changes

1. Make and save your changes in Visual Studio Code.
2. Open GitHub Desktop. Your edited files will appear under **Changes**.
3. Review the file list. Do not include `.env` or any private keys.
4. Enter a short description of your changes in **Summary**, such as `Update event schedule`.
5. Select **Commit to main**.
6. Select **Push origin** at the top of GitHub Desktop to send the commit to GitHub.

Pushing to `main` shares your changes with everyone who has access to the repository. Coordinate with the other organizers before pushing if someone else is changing the app at the same time.

## Troubleshooting

- **`bun` is not recognized:** Install Bun using the instructions on [bun.sh](https://bun.sh/), then close and reopen Visual Studio Code.
- **The browser says the site cannot be reached:** Check that `bun run dev` is still running in the terminal and open the Local URL printed there.
- **The app says Supabase is not configured:** Check that `.env` is in the project’s top-level folder, the values were copied correctly, and then stop and restart `bun run dev`.
- **GitHub Desktop will not let you push:** Confirm you are signed into the GitHub account that has access to the repository. Ask the repository owner for access if needed.
