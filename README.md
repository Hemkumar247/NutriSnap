# Personal Nutrition Coach

## Overview

Personal Nutrition Coach is an **AI-powered dietary analysis app** designed to help users monitor, understand, and improve their eating habits through visual intelligence and real-time insights. It leverages **Gemini Vision API** and **Hugging Face Nutrition Models** to analyze food images, estimate calorie and macronutrient content, and generate personalized nutrition recommendations.

The app aims to make healthy eating effortless by turning food tracking into a visual, data-driven experience. Like modern sleep-monitoring apps, it displays food intake patterns, calorie timelines, and weekly comparisons through engaging charts and AI-driven summaries.

---

## Key Features

* **AI-Based Food Recognition:** Detects multiple food items from an image using Gemini Vision.
* **Calorie and Nutrient Estimation:** Calculates calories and macronutrient composition using nutrition models.
* **Meal Timeline Visualization:** Interactive daily timeline displaying meals, times, and calorie loads.
* **Weekly Analytics Dashboard:** Bar and ring charts summarizing daily calorie intake, macronutrient ratios, and healthy vs. over-limit days.
* **Smart Food Log:** Automatically stores every meal with timestamp, nutrition info, and image preview for history review.
* **AI Recommendations:** Context-aware diet tips and healthier alternatives tailored to user goals.
* **Goal Tracking:** Personalized calorie targets and dynamic progress rings.
* **Report Generation:** Weekly summaries and downloadable nutrition reports.

---

## Problem Statement

Manual calorie tracking is tedious and inaccurate. Users often forget to log meals, misjudge portion sizes, or lose motivation due to complex UI in existing diet apps. The Personal Nutrition Coach solves this by enabling users to simply **take a photo of their meal** — and let AI handle the rest.

---

## Solution Architecture

1. **Image Upload:** User captures or uploads a photo of their meal.
2. **Food Detection (Gemini Vision):** Model identifies and labels all visible food items.
3. **Nutrient Mapping (Hugging Face Model):** Maps recognized foods to nutrition database entries for calorie and macronutrient estimation.
4. **Data Storage:** Saves meal data (timestamp, food, macros, image URL) in Firebase.
5. **Visualization Layer:** Generates real-time charts and a meal timeline UI.
6. **AI Recommendation Engine:** Uses Gemini Pro to analyze trends and provide feedback or alternative suggestions.
7. **User Dashboard:** Displays meal history, progress graphs, and insights.

---

## Technology Stack

**Frontend:** React / Flutter with Chart.js or Recharts
**Backend:** FastAPI + Firebase Functions
**AI Components:**

* Gemini Vision API (food recognition)
* Hugging Face Nutrition Model (calorie estimation)
* Gemini Pro / Gemini 1.5 (AI insights and recommendations)
  **Database:** Firebase Firestore
  **Storage:** Google Cloud Storage for meal images
  **Containerization:** Docker

---

## Installation (Local Setup)

### Prerequisites

* Python 3.10+
* Node.js 18+
* FFmpeg (for audio/visual preprocessing if extended)
* Google Cloud API key (for Gemini Vision)
* Hugging Face API key

### Steps

```bash
git clone <repo-url>
cd personal-nutrition-coach
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Environment Variables (`.env`)

```env
GEMINI_API_KEY=your_api_key
HF_API_KEY=your_huggingface_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_bucket
CALORIE_GOAL=2000
```

### Run the App

```bash
uvicorn app.main:app --reload
```

Access API at `http://localhost:8000`.

---

## API Endpoints

### `POST /analyze`

Upload an image and get food predictions with calorie data.

**Request:**

```bash
curl -X POST "http://localhost:8000/analyze" -F "file=@./meal.jpg"
```

**Response:**

```json
{
  "items": [
    {"food": "Pasta", "calories": 410, "carbs": 55, "protein": 15, "fat": 10},
    {"food": "Garlic Bread", "calories": 160, "carbs": 25, "protein": 4, "fat": 6}
  ],
  "total_calories": 570,
  "suggestion": "Try replacing garlic bread with a salad for a lighter meal."
}
```

### `GET /history/{user_id}`

Fetch full meal history for the user.

### `GET /stats/{user_id}`

Fetch weekly summary and analytics data.

---

## Data Schema

```json
{
  "user_id": "U123",
  "date": "2025-11-05",
  "meals": [
    {
      "type": "Lunch",
      "time": "13:10",
      "calories": 610,
      "macros": {"carbs": 45, "protein": 22, "fat": 15},
      "image_url": "https://storage/meal123.jpg"
    }
  ]
}
```

---

## Visualization Components

### **1. Daily Meal Timeline**

* Horizontal timeline showing meals as colored circles.
* Circle size = calories.
* Hover for nutrient breakdown.

### **2. Weekly Comparison Chart**

* Bar graph comparing daily calorie totals.
* Goal line overlay (2000 kcal).
* Color coding: Green = within goal, Red = exceeded.

### **3. Macronutrient Pie Chart**

* Displays carb/protein/fat ratio for a day or week.

### **4. Calorie Progress Ring**

* Circular gauge showing progress toward daily goal.

### **5. AI Insight Panel**

Displays adaptive feedback such as:

> “Your average intake after 8 PM is 25% higher than recommended.”

---

## Example Insight Generation

Gemini Pro analyzes weekly trends to produce personalized summaries:

* “You skipped breakfast 3 days this week — aim for consistency.”
* “Protein intake improved by 12% compared to last week.”
* “Try reducing sugary snacks to meet your macro balance.”

---

## Future Enhancements

* **Fitness Integration:** Sync with Fitbit/Google Fit for calorie balance tracking.
* **Meal Planning Assistant:** AI-generated meal plans within calorie goals.
* **Allergy Detection:** Alert for ingredients based on user profile.
* **Voice-based Food Logging:** Quick log via voice command.
* **Community Challenges:** Gamified healthy-eating goals and streaks.

---

## Privacy & Security

* User data stored securely in Firebase with authentication.
* Image files automatically deleted after analysis (optional retention period configurable).
* No third-party sharing of user food data.

---

## Contribution Guide

1. Fork this repo and create a new branch.
2. Add or improve features (UI, model tuning, analytics).
3. Write unit tests for new functions.
4. Submit a pull request with a clear description.

---

## License

This project is licensed under the **MIT License** — free for modification and distribution with attribution.

---
