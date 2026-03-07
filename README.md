# ⚔️ Clash of Legends

> *Draw your hero. Speak their power. Watch them become immortal.*

An iPad-first web app where two players sit across from each other, each drawing a character with an Apple Pencil in 60 seconds, describing their powers with their voice — then watching an AI-generated cinematic battle clip bring both characters to life and decide a winner.

Built for **SASEHacks 2026 @ University of Florida**

---

## 🎯 The Concept

Two people. One iPad. Sixty seconds to draw your legend.

Clash of Legends is a face-to-face creative battle experience. Both players set up their profiles simultaneously on a split screen, then take turns drawing their character on the same iPad. Once both characters are forged, AI analyzes the drawings, generates origin stories, produces a cinematic battle video, and dramatically announces a winner. Every battle is saved to a living gallery that grows throughout the hackathon.

The magic is in the gap between input and output — a crude stick figure drawn in 60 seconds becomes a cinematic legend with a backstory, a personality, and a battle that looks like it came out of a Marvel movie.

---

## 🏆 Hackathon Tracks & Prizes

| Track | Why We Qualify |
|---|---|
| **[UF SASE] Best Art Project** | Interactive art that transforms human creativity into cinematic output — the drawing IS the art, the battle IS the gallery |
| **[UF SASE] Best Overall** | Most emotionally resonant, technically impressive, and immediately fun project at the hackathon |
| **[DSI] Best AI Project** | Gemini Vision + ElevenLabs + Kling AI working together in a novel pipeline with genuine technical depth |
| **[MLH] Best Use of Gemini API** | Character analysis, power profiling, battle logic, video prompt generation — Gemini is the brain of the entire experience |
| **[MLH] Best Use of ElevenLabs** | Origin story narration + battle verdict announcement — ElevenLabs is the voice and personality of the entire experience |

---

## 🛠️ Tech Stack

| Technology | Purpose | Why This One |
|---|---|---|
| **React + Vite** | Frontend framework | Fast setup, great DX, perfect for iPad Safari |
| **Firebase Firestore** | Storing characters, battles, gallery | Real time updates, free tier, zero backend needed |
| **Firebase Storage** | Storing character drawing images | Pairs perfectly with Firestore, handles image URLs |
| **Gemini Vision API** | Analyzing drawings + generating battle logic | Best multimodal vision model, understands drawings contextually |
| **ElevenLabs API** | Origin story narration + battle verdict voice | Most expressive and dramatic AI voices available |
| **Kling AI API** | Generating cinematic battle video clips | Best video generation quality for character animation |
| **Web Speech API** | Voice description while drawing | Browser native, zero setup, works on iPad Safari |
| **Pointer Events API** | Apple Pencil support | Browser native, full pressure + tilt sensitivity |
| **Tailwind CSS** | Styling | Rapid UI development during hackathon |

---

## 🗂️ Project Structure

```
clash-of-legends/
├── src/
│   ├── components/
│   │   ├── SplitProfile.jsx        # Split screen simultaneous profile setup
│   │   ├── Canvas.jsx              # Apple Pencil drawing canvas with timer
│   │   ├── Handoff.jsx             # Dramatic screen between Player 1 and Player 2 drawing
│   │   ├── ForgeLoading.jsx        # Loading screen while AI analyzes both characters
│   │   ├── OriginStory.jsx         # Reveals each character with ElevenLabs narration
│   │   ├── BattleLoading.jsx       # Cinematic loading while Kling generates video
│   │   ├── BattleScreen.jsx        # Full screen battle video playback
│   │   ├── Verdict.jsx             # Winner announcement with ElevenLabs + confetti
│   │   ├── Gallery.jsx             # All saved battles browsable
│   │   ├── BattleCard.jsx          # Single battle in gallery showing drawings + video
│   │   └── LoadingScreen.jsx       # Reusable dramatic loading component
│   ├── services/
│   │   ├── gemini.js               # All Gemini API calls
│   │   ├── elevenlabs.js           # All ElevenLabs API calls
│   │   ├── kling.js                # All Kling AI video generation calls
│   │   └── firebase.js             # Firebase config + all helper functions
│   ├── hooks/
│   │   ├── useCanvas.js            # Canvas drawing logic + Apple Pencil pressure
│   │   ├── useVoice.js             # Web Speech API continuous listening hook
│   │   └── useBattle.js            # Full battle flow state management
│   ├── context/
│   │   └── BattleContext.jsx       # Global state for current battle session
│   ├── App.jsx                     # Main app + screen routing
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Global styles + animations
├── .env                            # API keys (gitignored)
├── .env.example                    # Template for required env vars
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 🔑 Environment Variables

Create a `.env` file in the root:

```
VITE_GEMINI_API_KEY=
VITE_ELEVENLABS_API_KEY=
VITE_KLING_API_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## 🗄️ Firebase Data Model

```
firestore/
│
├── battles/
│   └── {battleId}/
│       ├── createdAt: timestamp
│       ├── player1/
│       │   ├── name: string                  # Player's chosen name
│       │   ├── color: string                 # Player's chosen theme color (hex)
│       │   ├── battleCry: string             # Player's battle cry
│       │   ├── drawingURL: string            # Firebase Storage URL of drawing PNG
│       │   ├── voiceDescription: string      # Transcribed voice input while drawing
│       │   └── powerProfile: object
│       │       ├── strength: number          # 1-10
│       │       ├── speed: number             # 1-10
│       │       ├── power: string             # e.g. "fire breath", "laser eyes"
│       │       ├── weakness: string          # e.g. "water", "slow movement"
│       │       └── personality: string       # e.g. "fierce warrior"
│       ├── player2/
│       │   └── (same structure as player1)
│       ├── winnerId: string                  # "player1" or "player2"
│       ├── battleNarrative: string           # Gemini-generated 3 sentence battle story
│       ├── winnerVerdict: string             # Triumphant winner announcement script
│       ├── loserVerdict: string              # Respectful loser acknowledgment script
│       └── videoURL: string                  # Kling-generated battle clip URL

storage/
└── drawings/
    └── {battleId}/
        ├── player1.png
        └── player2.png
```

---

## 📱 Full App Flow

### Screen 1 — SPLIT PROFILE SETUP
```
┌─────────────────────┬─────────────────────┐
│     PLAYER 1        │     PLAYER 2        │
│                     │                     │
│  [Name input]       │  [Name input]       │
│                     │                     │
│  [Color picker]     │  [Color picker]     │
│  ⬤ ⬤ ⬤ ⬤ ⬤        │  ⬤ ⬤ ⬤ ⬤ ⬤        │
│                     │                     │
│  [Battle cry input] │  [Battle cry input] │
│                     │                     │
│  [ READY ✓ ]        │  [ READY ✓ ]        │
└─────────────────────┴─────────────────────┘
```
- Both players fill in simultaneously
- iPad wide enough for comfortable split screen
- Name: who you are
- Color: themes your entire side of every screen throughout the experience
- Battle cry: one sentence read by ElevenLabs before the battle begins
- Both must tap READY before proceeding
- Transition: dramatic fullscreen animation → Player 1's color floods the screen

---

### Screen 2 — PLAYER 1 DRAWS
```
┌─────────────────────────────────────────────┐
│  ⚔️ PLAYER 1 NAME — FORGE YOUR LEGEND       │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │         DRAWING CANVAS              │   │
│  │      (Apple Pencil enabled)         │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🎤 "Describe your character..." (live)    │
│                                             │
│         ⏱️  0 : 4 7  remaining             │
│                                             │
│  [  🔥 FORGE MY LEGEND  ]                  │
└─────────────────────────────────────────────┘
```
- Full screen canvas in Player 1's theme color
- Apple Pencil drawing with pressure sensitivity
- Web Speech API listens continuously — transcribing voice description in real time shown as live caption at bottom
- 60 second countdown timer — large, dramatic, turns red at 10 seconds
- Timer hitting 0 auto-submits — canvas locks, cannot draw anymore
- Player can also tap FORGE MY LEGEND early when satisfied
- Canvas exports as PNG automatically on submission

---

### Screen 3 — HANDOFF
```
┌─────────────────────────────────────────────┐
│                                             │
│         ⚔️  LEGEND FORGED  ⚔️              │
│                                             │
│    [Silhouette of Player 1's character]     │
│            ??? AWAITS BATTLE                │
│                                             │
│    ────────────────────────────────         │
│                                             │
│       Hand the iPad to                      │
│       ** PLAYER 2 NAME **                   │
│                                             │
│    [ TAP WHEN READY, PLAYER 2 ]            │
│                                             │
└─────────────────────────────────────────────┘
```
- Player 1's drawing shown as a dark silhouette — Player 2 cannot see the actual character yet
- Creates mystery and anticipation
- Screen themed in Player 2's color
- Player 2 taps to begin their turn

---

### Screen 4 — PLAYER 2 DRAWS
- Identical to Screen 2 but themed in Player 2's color
- Same 60 second timer, voice description, Apple Pencil canvas

---

### Screen 5 — FORGE LOADING
```
┌─────────────────────────────────────────────┐
│                                             │
│    ⚡ THE LEGENDS ARE BEING FORGED ⚡       │
│                                             │
│  [Player 1 drawing]    [Player 2 drawing]   │
│  (revealed for         (revealed for        │
│   first time)           first time)         │
│                                             │
│  ████████████░░░░  Analyzing powers...     │
│                                             │
│    Both players see each other's           │
│    character for the FIRST TIME here       │
│                                             │
└─────────────────────────────────────────────┘
```
- Both drawings shown side by side — first time either player sees the other's character
- This is a huge reveal moment — players react to each other's drawings
- Progress bar showing what AI is doing: "Analyzing drawings... Generating power profiles... Crafting origin stories..."
- Gemini Vision analyzing both drawings simultaneously
- ElevenLabs generating both origin story audio files
- Dramatic background music building

---

### Screen 6 — ORIGIN STORIES
- Player 1's character revealed first — full screen, dramatic zoom in
- ElevenLabs plays Player 1's origin story narration
- Then Player 2's character — same treatment
- Both players hearing their character's legend for the first time
- Each origin story is unique, generated from the specific drawing + voice description

---

### Screen 7 — BATTLE LOADING
```
┌─────────────────────────────────────────────┐
│                                             │
│     ⚔️  PREPARING THE BATTLEFIELD  ⚔️      │
│                                             │
│  [P1 character]   VS   [P2 character]      │
│                                             │
│  ElevenLabs reads both battle cries:        │
│  "Player 1 battle cry..."                  │
│  "Player 2 battle cry..."                  │
│                                             │
│  ████████░░░░  Generating battle...        │
│                                             │
└─────────────────────────────────────────────┘
```
- ElevenLabs reads both players' battle cries dramatically back to back
- Kling AI generating the battle video in background
- Gemini has already determined the winner based on power profiles
- Tension builds — players don't know who wins yet

---

### Screen 8 — BATTLE VIDEO
- Full screen, no UI chrome
- Kling-generated cinematic battle video plays
- Both characters fighting in a stunning generated environment
- Audio from the video plays
- No skip button — let it play completely

---

### Screen 9 — VERDICT
```
┌─────────────────────────────────────────────┐
│                                             │
│         👑  AND THE WINNER IS...  👑        │
│                                             │
│    [Winner character — large, glowing]     │
│                                             │
│    ** WINNER NAME ** WINS!                 │
│                                             │
│    [ElevenLabs plays winner verdict]       │
│    [Confetti explosion in winner color]    │
│                                             │
│    [Loser character — smaller]             │
│    [ElevenLabs plays respectful loser msg] │
│                                             │
│  [ VIEW IN GALLERY ]  [ BATTLE AGAIN ]    │
│                                             │
└─────────────────────────────────────────────┘
```
- Winner announced by ElevenLabs dramatically
- Confetti in winner's theme color
- Loser acknowledged respectfully — never feels bad
- Battle automatically saved to gallery

---

### Screen 10 — GALLERY
- Scrollable feed of all battles ever fought
- Each battle card shows:
  - Both character drawings side by side
  - Both player names + colors
  - Winner badge
  - Play button to rewatch battle video
  - Origin story snippets
- Newest battles at top
- Judges can scroll through all battles from the hackathon
- Makes the app feel alive and populated

---

## 🧠 Gemini Prompts

### Character Analysis Prompt
```
You are a battle analyst for an epic fantasy combat game for kids.

Look at this character drawing carefully. Also consider this voice description 
from the player: "{voiceDescription}"

The player named their character: "{characterName}"

Analyze the drawing and description and return ONLY a valid JSON object 
with no markdown formatting, no code blocks, no explanation:

{
  "strength": <1-10, based on physical size and weapons visible in drawing>,
  "speed": <1-10, based on body type and design>,
  "power": "<their main special ability based on drawing and voice description>",
  "weakness": "<their one logical weakness>",
  "personality": "<2 dramatic words describing their personality>",
  "originStorySummary": "<one extremely dramatic sentence about who they are and where they came from>",
  "originStoryFull": "<4 dramatic sentences telling their full origin story, written like an epic fantasy narrator>"
}
```

### Battle Logic Prompt
```
You are the most dramatic battle judge in history. You decide fights fairly 
based on logic, powers, strengths and weaknesses.

FIGHTER 1: {player1Name}
- Strength: {strength}/10
- Speed: {speed}/10  
- Power: {power}
- Weakness: {weakness}
- Personality: {personality}

FIGHTER 2: {player2Name}
- Strength: {strength}/10
- Speed: {speed}/10
- Power: {power}
- Weakness: {weakness}
- Personality: {personality}

Analyze their matchup logically. Consider how their powers interact, 
whether one's power counters the other's weakness, and who has the 
overall edge. Make it feel earned, not random.

Return ONLY a valid JSON object with no markdown, no code blocks:

{
  "winnerId": "<"player1" or "player2">,
  "winnerReason": "<one sentence explaining why they won logically>",
  "battleNarrative": "<3 extremely cinematic sentences describing the battle moment by moment>",
  "winnerVerdict": "<one triumphant ElevenLabs-ready sentence announcing the winner, max 20 words>",
  "loserVerdict": "<one respectful ElevenLabs-ready sentence honoring the loser's fight, max 20 words>",
  "videoPrompt": "<detailed cinematic prompt for Kling AI showing both characters in epic combat, include their visual description from the drawings, dramatic environment, cinematic lighting, max 100 words>"
}
```

---

## 🎙️ ElevenLabs Usage

### Voice Settings

| Moment | Voice | Stability | Similarity | Style |
|---|---|---|---|---|
| Origin Story | `Adam` | 0.4 | 0.8 | 0.6 |
| Battle Cry readback | `Arnold` | 0.3 | 0.9 | 1.0 |
| Battle Verdict | `Arnold` | 0.2 | 0.9 | 1.0 |

### Audio Moments

1. **Origin Story (x2)** — plays during Screen 6, one per character
2. **Battle Cry Readback (x2)** — plays during Screen 7, one per player
3. **Winner Verdict** — plays during Screen 9, triumphant
4. **Loser Verdict** — plays during Screen 9, respectful

---

## 🎬 Kling AI Video Generation

### API Flow
```javascript
// 1. Submit generation request
POST https://api.klingai.com/v1/videos/text2video
{
  "prompt": "{videoPrompt from Gemini}",
  "duration": 5,
  "aspect_ratio": "16:9",
  "mode": "std"
}

// 2. Poll for completion
GET https://api.klingai.com/v1/videos/text2video/{taskId}

// 3. Get video URL from response
response.data.works[0].resource.resource
```

### Video Prompt Template
```
Two legendary characters in epic cinematic combat. 
{description of character 1 appearance from drawing analysis}. 
{description of character 2 appearance from drawing analysis}. 
{battleNarrative from Gemini}. 
Cinematic slow motion, dramatic lighting, 
Marvel movie quality visual effects, 
4K resolution, epic fantasy battle environment.
```

---

## 🎨 Design System

### Color Theming
Each player picks a color from a preset palette. That color themes EVERYTHING for that player throughout the entire experience — their side of the split screen, their character reveal, their confetti, their gallery cards.

### Preset Color Palette
```
Player colors:
#FF4444 — Crimson Fire
#4444FF — Royal Blue  
#44FF44 — Venom Green
#FF44FF — Arcane Purple
#FF8800 — Solar Orange
#00FFFF — Frost Cyan
#FFD700 — Ancient Gold
#FF1493 — Chaos Pink
```

### Typography
- Titles: Bold, dramatic, all caps where appropriate
- Body: Clean, readable, high contrast
- Timer: Monospace, large, turns red under 10 seconds

### Animations
- Screen transitions: Dramatic full-screen color floods
- Character reveals: Zoom in from silhouette
- Verdict: Confetti explosion + winner glow pulse
- Loading: Pulsing progress bars with status text

---

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/yourusername/sase-hacks
cd sase-hacks

# Install dependencies
npm install

# Add your environment variables
cp .env.example .env
# Fill in all API keys in .env

# Start development server
npm run dev

# Open on iPad
# Ensure iPad and laptop are on the same WiFi network
# Open Safari on iPad
# Navigate to http://{your-laptop-local-ip}:5173
# Find your local IP: ipconfig (Windows) or ifconfig (Mac)
```

---

## 📱 iPad + Apple Pencil Technical Notes

- **Browser:** Safari on iPad only — required for full Apple Pencil support
- **API Used:** Pointer Events API — `pointerdown`, `pointermove`, `pointerup`
- **Pressure:** `event.pressure` — 0.0 to 1.0, maps to brush width
- **Tilt:** `event.tiltX`, `event.tiltY` — maps to brush angle effect
- **Prevent scrolling:** `touch-action: none` on canvas element critical
- **Optimized for:** iPad Pro 12.9" landscape mode
- **During demo:** Enable guided access to prevent accidental home button

---

## ⚡ Build Order & Time Estimates

| Step | Component | Est. Time |
|---|---|---|
| 1 | Vite + React setup + Firebase init + Tailwind | 30 mins |
| 2 | Canvas.jsx — Apple Pencil drawing + timer | 1.5 hours |
| 3 | useVoice.js — Web Speech API continuous listening | 45 mins |
| 4 | SplitProfile.jsx — split screen profile setup | 1 hour |
| 5 | firebase.js — all Firestore + Storage helpers | 45 mins |
| 6 | gemini.js — character analysis + battle logic | 1.5 hours |
| 7 | elevenlabs.js — all audio generation | 45 mins |
| 8 | kling.js — video generation + polling | 1 hour |
| 9 | App.jsx — full screen flow + routing | 1 hour |
| 10 | ForgeLoading + OriginStory + BattleLoading screens | 1 hour |
| 11 | BattleScreen + Verdict + confetti | 1 hour |
| 12 | Gallery + BattleCard | 45 mins |
| 13 | Handoff screen + all transitions/animations | 45 mins |
| 14 | Full end-to-end testing on iPad | 1 hour |
| 15 | Polish + demo prep | 1 hour |
| **Total** | | **~14 hours** |

---

## 👥 Suggested Team Split

| Person | Responsibilities |
|---|---|
| **Person 1** | Canvas.jsx, useVoice.js, useCanvas.js, Apple Pencil integration |
| **Person 2** | Firebase setup, firebase.js service, all data storage/retrieval |
| **Person 3** | gemini.js, elevenlabs.js, kling.js — all AI service integrations |
| **Person 4 (you)** | App.jsx routing, all screen components, UI/UX, final integration |

---

## 🎯 Demo Script (3-4 minutes)

```
1. Open app on iPad — show split profile screen
   "Both players set up their profile simultaneously"

2. Fill in profiles — Player 1: "The Destroyer" / red / "Fear me"
                      Player 2: "Shadow Queen" / purple / "You cannot win"
   Both tap READY

3. Player 1 draws — keep it simple, 20 seconds
   Speak while drawing: "She has fire powers and flies"
   Tap FORGE MY LEGEND

4. Show handoff screen — silhouette mystery moment

5. Player 2 draws — different style character
   "He's a giant with ice armor"
   Tap FORGE MY LEGEND

6. Show forge loading — both drawings revealed side by side
   "This is the first time either player sees the other's character"
   Watch room react to the drawings

7. Origin stories play — room reacts to ElevenLabs voice

8. Battle loading — battle cries read dramatically

9. Battle video plays — full screen, no talking needed

10. Verdict — winner announced, confetti

11. Show gallery — "Every battle from today is saved here"
    Scroll through previous battles

12. Hand iPad to a judge — "Draw your character"
    Run the whole flow again live
```

---

## 🔧 Known Challenges & Solutions

| Challenge | Solution |
|---|---|
| Kling video takes 30-60 seconds | Dramatic loading screen with battle cry readback fills the time naturally |
| Web Speech API in noisy rooms | Show live transcript so user can see it's working, add manual text fallback |
| Firebase Storage image upload size | Export canvas at 512x512 PNG, keeps file small and fast |
| Two people drawing on same iPad | Handoff screen makes this a feature not a bug — adds drama |
| Empty gallery at start of demo | Pre-populate with 3-4 pre-made battles before presenting |

---

## 📊 Why This Wins

| Criteria | How We Nail It |
|---|---|
| **Creativity** | Crude drawings become cinematic legends — the gap between input and output IS the art |
| **Interactivity** | Face to face, two player, physical handoff — deeply human interaction |
| **Technical depth** | 3 AI APIs working in a novel pipeline: vision → voice → video |
| **Demo-ability** | 60 second setup, immediately understandable, judges want to try it |
| **Fun factor** | The worse you draw the funnier the battle — zero barrier to entry |
| **Purpose** | Every kid has wished their drawing could come to life. We do that. |

---

## 👥 Team

Built with ❤️ at SASEHacks 2026 — University of Florida

*"Draw your hero. Speak their power. Watch them become immortal."*