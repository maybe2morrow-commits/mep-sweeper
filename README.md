# MEP Sweeper

A puzzle game about routing building services (cables and pipes). Connect electrical equipment to the power source and plumbing to the water pump!

## 🎮 Game Features
- Minesweeper-style reveal mechanics
- Route cables (⚡) and pipes (💧) 
- Drag-to-draw path creation
- Online leaderboard via Supabase
- Progressive difficulty (grid grows each round)

---

## 🖥️ LOCAL DEVELOPMENT

### Prerequisites
- Node.js 16+ installed ([download here](https://nodejs.org/))
- A terminal/command prompt

### Setup Steps

1. **Extract the zip file** to a folder on your computer

2. **Open terminal** and navigate to the folder:
   ```bash
   cd path/to/mep-sweeper-app
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```

5. **Open your browser** to `http://localhost:3000`

### Debugging
- Click the **🔧 DEBUG** button in the game to see connection logs
- Click **🧪 TEST CONNECTION** to verify Supabase is working
- Check your browser's Developer Console (F12) for detailed logs

---

## 🚀 DEPLOYING TO VERCEL (Free Hosting)

### Option A: GitHub + Vercel (Recommended)

1. **Create a GitHub account** if you don't have one: https://github.com/signup

2. **Create a new repository**:
   - Go to https://github.com/new
   - Name it `mep-sweeper`
   - Make it Public
   - Don't initialize with README
   - Click "Create repository"

3. **Upload the code**:
   - On your new repo page, click "uploading an existing file"
   - Drag and drop ALL the files from this folder
   - Click "Commit changes"

4. **Deploy to Vercel**:
   - Go to https://vercel.com and sign up with GitHub
   - Click "Add New Project"
   - Import your `mep-sweeper` repository
   - Click "Deploy"
   - Wait ~1 minute for deployment
   - You'll get a URL like `mep-sweeper-xxx.vercel.app`

### Option B: Vercel CLI (Advanced)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. Follow the prompts to link your account and deploy.

---

## 🗄️ SUPABASE SETUP

The game is pre-configured with your Supabase project. Here's what's needed:

### Your Configuration (Already Set)
- **URL**: `https://stdvpwirbaoqfbuscjuo.supabase.co`
- **Anon Key**: Already configured in `src/App.js`

### Database Table Structure
Your `leaderboard` table should have:
| Column | Type | Notes |
|--------|------|-------|
| id | int8 | Primary key, auto-generated |
| name | text | Player name |
| score | int4 | Player score |
| created_at | timestamptz | Default: now() |

### Row Level Security (RLS) Policies
Make sure you have these policies on the `leaderboard` table:

1. **Allow public read**:
   - Operation: SELECT
   - Target roles: anon
   - USING expression: `true`

2. **Allow public insert**:
   - Operation: INSERT  
   - Target roles: anon
   - WITH CHECK expression: `true`

### Testing Database Connection
1. Open the game
2. Click **🔧 DEBUG** button
3. Click **🧪 TEST CONNECTION**
4. Check the log for success/error messages

---

## 📁 Project Structure

```
mep-sweeper-app/
├── public/
│   └── index.html      # HTML template
├── src/
│   ├── index.js        # React entry point
│   └── App.js          # Main game code + Supabase config
├── package.json        # Dependencies
└── README.md           # This file
```

---

## 🔧 Troubleshooting

### "npm: command not found"
- Install Node.js from https://nodejs.org/

### Supabase errors
- Check RLS policies are set correctly
- Verify table name is exactly `leaderboard`
- Use the DEBUG panel to see detailed errors

### Game not loading
- Clear browser cache
- Check browser console (F12) for errors
- Make sure `npm install` completed successfully

### Vercel deployment fails
- Check build logs in Vercel dashboard
- Ensure all files are uploaded correctly
- Try deleting `node_modules` folder and re-running `npm install`

---

## 🎯 Customization

### Change Supabase Project
Edit `src/App.js` and update these lines near the top:
```javascript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### Adjust Game Settings
In `src/App.js`:
```javascript
const BASE_GRID_WIDTH = 6;    // Starting grid width
const BASE_GRID_HEIGHT = 8;   // Starting grid height
const EQUIPMENT_COUNT = 8;    // Number of equipment pieces
```

---

## 📝 License

MIT - Feel free to modify and share!

---

Made with ❤️ for building services engineers
