<p align="center">
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js_5-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" />
</p>

<h1 align="center">✏️ DRAWN</h1>

<p align="center">
  <strong>Draw in the air. Voice their power. Watch them battle.</strong>
</p>

<p align="center">
  <em>Draw your hero mid-air with hand gestures, describe their powers with your voice, and watch them come to life in a cinematic anime battle.</em>
</p>

<p align="center">
  Built for <strong>SASEHacks 2026 @ University of Florida</strong>
</p>

---

## How It Works

1. **Create your hero** — name them, pick a color, write a battle cry
2. **Choose a boss** — face off against Power, Zoro, or Goku
3. **Draw in the air** — pinch your fingers in front of your webcam to sketch your character while describing their powers out loud
4. **Watch the magic** — your sketch becomes a polished anime portrait, gets a narrated origin story, and stars in an 8-second cinematic battle video
5. **See who wins** — a dramatic verdict reveals the champion with full commentary

Every battle is saved to a gallery you can revisit anytime.

---

## Tech Stack

### Frontend
| | Technology | Role |
|---|---|---|
| ⚛️ | **React 19** | UI framework |
| ⚡ | **Vite** | Build tool + dev server |
| 🎨 | **Tailwind CSS 4** | Styling |
| ✋ | **MediaPipe HandLandmarker** | Real-time hand tracking via webcam |
| 🎤 | **Web Speech API** | Continuous voice recognition for commands + character description |
| 🔊 | **Web Audio API** | Sound effect synthesis |

### Backend
| | Technology | Role |
|---|---|---|
| 🖥️ | **Express.js 5** | REST API server |
| 🍃 | **MongoDB + Mongoose** | Battle history + gallery persistence |
| ☁️ | **Cloudinary** | Image storage + CDN delivery |

### Generative Pipeline
| | Technology | Role |
|---|---|---|
| 🧠 | **Gemini 2.0 Flash** | Vision analysis of drawings, battle logic, narrative writing, prompt generation |
| 🖼️ | **Imagen 3.0** | Transforms rough sketches into polished anime character portraits |
| 🎬 | **Veo 3.0** | Generates cinematic 8-second battle videos from character art |
| 🗣️ | **ElevenLabs** | Three distinct voices: narrator, fight commentator, winner announcer |

---

## Project Structure

```
drawn/
├── server.js                        # Express API (Gemini, Imagen, Veo, ElevenLabs)
├── src/
│   ├── App.jsx                      # Screen routing + global state
│   ├── main.jsx                     # Entry point
│   ├── index.css                    # Global styles + animations
│   ├── components/
│   │   ├── HomeScreen.jsx           # Landing page with animated title
│   │   ├── HeroSetup.jsx           # Hero name, color, battle cry
│   │   ├── BossSelect.jsx          # Boss picker with countdown
│   │   ├── Canvas.jsx              # Hand tracking drawing + voice commands
│   │   ├── OriginStory.jsx         # AI pipeline orchestration + cinematic reveal
│   │   ├── BattleScreen.jsx        # Rumble intro → video → winner verdict
│   │   └── Gallery.jsx             # Battle history grid + detail modals
│   ├── context/
│   │   └── BattleContext.jsx        # Shared battle session state
│   ├── hooks/
│   │   ├── useVoice.js             # Web Speech API wrapper
│   │   └── useVolume.js            # Audio volume management
│   └── services/
│       ├── cloudinary.js            # Image uploads
│       ├── db.js                    # MongoDB CRUD helpers
│       └── elevenlabs.js            # Text-to-speech client
├── public/                          # Static assets
├── index.html
├── vite.config.js
└── package.json
```

---

## The Drawing Experience

The canvas uses **MediaPipe HandLandmarker** running on the GPU to track 21 hand landmarks in real time through your webcam. Pinching your thumb and index finger starts a stroke; releasing ends it.

Raw hand positions are noisy, so we built **adaptive smoothing** where the filter strength adjusts based on hand speed — fast strokes stay responsive, slow details stay clean. Strokes are rendered as **quadratic Bézier curves** with a minimum distance filter to eliminate jitter.

While drawing, your voice is always listening. Say a color name to switch colors, say "fire" or "ice" for particle effects, say "thicker" or "thinner" to adjust stroke width, or describe your character's powers and the app captures it all for the origin story.

---

## The Battle Pipeline

When the drawing is done, four services run in parallel:

```
                    ┌─────────────┐
                    │   Drawing    │
                    │  + Voice     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Gemini    │ ← analyzes sketch + parses voice
                    │  2.0 Flash  │ → battle outcome, narrative, prompts
                    └──┬───┬───┬──┘
                       │   │   │
              ┌────────┘   │   └────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Imagen   │ │  Eleven  │ │   Veo    │
        │   3.0    │ │  Labs    │ │   3.0    │
        │ portrait │ │ narrate  │ │  video   │
        └──────────┘ └──────────┘ └──────────┘
              │            │            │
              └────────────┼────────────┘
                           ▼
                    ┌──────────────┐
                    │ Battle Screen │
                    │  rumble →     │
                    │  video →      │
                    │  verdict      │
                    └──────────────┘
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Google Cloud project with Vertex AI enabled (Gemini, Imagen, Veo)
- ElevenLabs API key
- MongoDB Atlas cluster
- Cloudinary account

### Setup

```bash
git clone https://github.com/your-repo/drawn.git
cd drawn
npm install
```

Create a `.env` file:

```env
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
ELEVENLABS_API_KEY=your-elevenlabs-key
MONGO_URI=your-mongodb-connection-string
```

### Run

```bash
# Development (frontend + backend)
npm run dev       # Vite dev server on :5173
node server.js    # Express API on :5000

# Production
npm run build
node server.js    # Serves built frontend + API
```

---

## Team

Built with love at **SASEHacks 2026**, University of Florida.

---

<p align="center"><sub>© 2026 Drawn</sub></p>
