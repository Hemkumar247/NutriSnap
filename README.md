<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=200&section=header&text=NutriSnap%20AI&fontSize=60&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=Photo-Based%20Nutrition%20Intelligence%20%7C%20React%20%2B%20Gemini%20Pro%20Vision&descAlignY=58&descSize=16"/>

<br/>

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_Pro_Vision-4285F4?style=for-the-badge&logo=google&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

<br/>

> **Snap a photo of your meal. Get a complete nutritional breakdown in seconds.**
> No manual entry. No guesswork. Just intelligence.

<br/>


</div>

---

## 💡 The Problem I Solved

> *"I couldn't track what I ate consistently. Portion guesswork and missed entries made my progress unreliable."*

Most nutrition apps demand manual logging — food names, portion weights, calorie lookups. It's tedious, inaccurate, and unsustainable.

**NutriSnap AI removes that friction entirely.** One photo. Full breakdown. Done.

---

## ✨ Features at a Glance

```
📸 Photo Analysis      →  Upload a meal photo → AI detects food, estimates portions, calculates macros
📝 Text Analysis       →  Describe your meal in words → Instant structured nutrition summary  
📊 Daily Tracker       →  Calories, protein, carbs, fats — tracked in real-time with goal progress
🗣️ Chat Assistant      →  Gemini Live-powered chatbot with full context of your food log
🍽️ Meal Plan Gen       →  AI generates personalized meal plans aligned to your daily goals
📚 Recipe Explorer     →  AI-curated recipes with nutrition context — save and revisit anytime
📅 Weekly Deep Report  →  Trends, macro consistency, habit insights, visual summaries
```

---

## 🎬 How It Works

### 📸 Photo Mode Pipeline

```
User uploads meal photo
        ↓
Gemini Pro Vision processes image
        ↓
AI returns:  food items + bounding boxes
             calorie estimates
             macro breakdown
             healthier alternatives
        ↓
Visual overlays rendered on image
        ↓
One-click log → added to daily tracker
```

### 📝 Text Mode Pipeline

```
User types: "2 rotis, paneer curry, 1 cup curd"
        ↓
Gemini parses description → structured nutrition
        ↓
Displayed + logged instantly
```

### 🗣️ Chat Mode

The built-in Gemini Live assistant has full context of:
- Your daily goals
- Every logged meal
- Your water intake
- Your saved recipes
- Your weekly history

Ask it anything: *"Was my lunch too high in carbs?"* or *"Suggest a high-protein dinner under 400 calories."*

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | TailwindCSS + Custom Animations |
| **AI — Vision** | Gemini Pro Vision (food detection + bounding boxes) |
| **AI — Text** | Gemini Pro (structured nutrition parsing) |
| **AI — Chat** | Gemini Live API (real-time contextual assistant) |
| **Persistence** | Browser localStorage |

---

## 🎨 UI Design Highlights

> Designed with a **neon cyber-aesthetic** — because tracking health shouldn't feel clinical.

- 🌌 **Glassmorphism cards** with depth and blur effects
- ⚡ **Dynamic bounding boxes** overlaid on meal photos
- 💫 **Smooth fade-in animations** throughout
- 🤖 **Floating chat assistant** — always accessible, never intrusive
- 📱 **Fully responsive** — desktop and mobile ready

---

## 🏗️ Project Structure

```
NutriSnap/
│
├── App.tsx                        # Main app container and routing
├── index.tsx                      # Entry point
├── index.html                     # Root HTML with import maps & theme
│
├── /components
│   ├── ImageUploader.tsx          # Photo input + bounding box overlay
│   ├── NutritionDisplay.tsx       # Macro breakdown UI
│   ├── DailyTracker.tsx           # Right-side daily summary panel
│   ├── ChatAssistant.tsx          # Chat UI + Gemini Live logic
│   └── DeepAnalysisPage.tsx       # Weekly insights dashboard
│
├── /services
│   └── geminiService.ts           # All Gemini API calls
│
├── /pages
│   ├── MealPlanGeneratorPage.tsx  # Goal-based meal planning
│   ├── ExplorePage.tsx            # AI recipe discovery
│   └── SavedRecipesPage.tsx       # Saved recipes viewer
│
└── /types                         # Shared TypeScript type definitions
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Hemkumar247/NutriSnap.git
cd NutriSnap

# 2. Install dependencies
npm install

# 3. Add your Gemini API key
echo "GEMINI_API_KEY=your_api_key_here" > .env.local

# 4. Start the dev server
npm run dev
```

Open `http://localhost:5173` and snap your first meal 📸

---

## 🔮 What's Next

- [ ] User accounts + cloud sync across devices
- [ ] Wearable integration (steps, calories burned)
- [ ] AI-generated grocery lists from meal plans
- [ ] Social challenges and streaks
- [ ] Meal reminders + push notifications
- [ ] Macro-specific adaptive goal suggestions

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome.
Open an [issue](https://github.com/Hemkumar247/NutriSnap/issues) or submit a pull request.

---

## 🧑‍💻 Built by

**Hem Kumar** — AI + Full-Stack Developer

Focused on building real-world AI products that reduce friction in everyday life.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-hemkumarvitta-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/hemkumarvitta)
[![GitHub](https://img.shields.io/badge/GitHub-Hemkumar247-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/Hemkumar247)
[![Gmail](https://img.shields.io/badge/Email-hemkumarvitta%40gmail.com-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:hemkumarvitta@gmail.com)

---

<div align="center">

⭐ **If NutriSnap AI helped or inspired you, drop a star — it means a lot!**

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=100&section=footer"/>

</div>
