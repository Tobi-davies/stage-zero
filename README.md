## Profile Intelligence Service

---

## Overview

This project is a **Profile Intelligence Service API** built with **Node.js, Express, and MongoDB**.

It accepts a name, enriches it using multiple external APIs, processes the data, stores it in a database, and exposes RESTful endpoints for retrieval and management.

---

## 🎯 Objectives

This project demonstrates the ability to:

- Integrate multiple third-party APIs
- Process and structure data
- Persist data in a database
- Design RESTful APIs
- Handle idempotent requests
- Implement robust error handling

---

## 🌐 Live API

👉 **Base URL**

```id="live-url"
stage-zero-production.up.railway.app
```

---

## 🔗 External APIs Used

- Genderize → https://api.genderize.io
- Agify → https://api.agify.io
- Nationalize → https://api.nationalize.io

---

## ⚙️ Data Processing Rules

- **Genderize**
  - Extract: `gender`, `probability`, `count`
  - Rename `count` → `sample_size`

- **Agify**
  - Extract: `age`
  - Derive `age_group`:
    - 0–12 → child
    - 13–19 → teenager
    - 20–59 → adult
    - 60+ → senior

- **Nationalize**
  - Extract country list
  - Select country with highest probability → `country_id`

- Add:
  - `id` → UUID v7
  - `created_at` → UTC ISO 8601 timestamp

---

## 📦 API Endpoints

---

### 🔹 1. Create Profile

```id="endpoint1"
POST /api/profiles
```

#### Request

```json id="req1"
{
  "name": "ella"
}
```

#### Success Response (201)

```json id="res1"
{
  "status": "success",
  "data": {
    "id": "uuid-v7",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "DRC",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

---

### 🔁 Idempotency

If the same name already exists:

```json id="idem"
{
  "status": "success",
  "message": "Profile already exists",
  "data": { "...existing profile..." }
}
```

---

### 🔹 2. Get Profile by ID

```id="endpoint2"
GET /api/profiles/:id
```

#### Response (200)

```json id="res2"
{
  "status": "success",
  "data": { "...profile data..." }
}
```

---

### 🔹 3. Get All Profiles

```id="endpoint3"
GET /api/profiles
```

#### Optional Query Params

- `gender`
- `country_id`
- `age_group`

Example:

```id="example1"
/api/profiles?gender=male&country_id=NG
```

#### Response (200)

```json id="res3"
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "id-1",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    }
  ]
}
```

---

### 🔹 4. Delete Profile

```id="endpoint4"
DELETE /api/profiles/:id
```

#### Response

```id="res4"
204 No Content
```

---

## 🚨 Error Handling

All errors follow this format:

```json id="err-format"
{
  "status": "error",
  "message": "Error message"
}
```

---

### Error Types

| Status | Description           |
| ------ | --------------------- |
| 400    | Missing or empty name |
| 422    | Invalid input type    |
| 404    | Profile not found     |
| 500    | Internal server error |
| 502    | External API failure  |

---

## 🌐 External API Errors

```json id="ext-err"
{
  "status": "502",
  "message": "Genderize returned an invalid response"
}
```

Applies to:

- Genderize
- Agify
- Nationalize

---

## ⚠️ Edge Case Handling

- Genderize → `gender = null` OR `count = 0` → 502
- Agify → `age = null` → 502
- Nationalize → no country data → 502

👉 Data is **not stored** in these cases

---

## 🧠 Idempotency

- Duplicate names are not stored twice
- Existing record is returned instead

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- Axios
- UUID (v7)

---

## ⚡ Performance Optimization

- In-memory caching reduces repeated API calls
- Improves response time for repeated requests
- Handles concurrent requests efficiently

---

## 🔐 Additional Requirements

- ✅ CORS enabled (`Access-Control-Allow-Origin: *`)
- ✅ All timestamps in UTC ISO format
- ✅ UUID v7 for all IDs
- ✅ Exact response structure compliance

---

## 🧪 Running Locally

```id="run1"
git clone https://github.com/Tobi-davies/stage-zero.git
cd your-repo
npm install
npm run dev
```

---

## 📌 Submission Details

- **GitHub Repo:**
  https://github.com/Tobi-davies/stage-zero

- **Live API:**
  stage-zero-production.up.railway.app

---
