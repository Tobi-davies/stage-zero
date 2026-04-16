# 🚀 HNG Stage 0 Backend Task

## API Integration & Data Processing (Gender Classification)

---

## 📌 Overview

This project is a backend API built with **Node.js and Express** that classifies a given name by gender using the **Genderize.io API**.

The API processes the raw response and returns a structured, enriched output including confidence level and timestamp.

---

## 🌐 Live API

👉 **Base URL:**

```
https://your-deployed-url.com
```

👉 **Endpoint:**

```
GET /api/classify?name=John
```

---

## ⚙️ Features

- ✅ Accepts a name as a query parameter
- ✅ Calls external API (Genderize.io)
- ✅ Processes and formats response
- ✅ Adds computed confidence logic
- ✅ Handles edge cases and errors
- ✅ Returns structured JSON response
- ✅ Includes timestamp for each request

---

## 📥 Request

### Endpoint

```
GET /api/classify
```

### Query Parameters

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| name      | string | Yes      | Name to classify |

### Example Request

```
GET /api/classify?name=John
```

---

## 📤 Response

### ✅ Success Response

```json
{
  "status": "success",
  "data": {
    "name": "john",
    "gender": "male",
    "probability": 0.99,
    "sample_size": 1234,
    "is_confident": true,
    "processed_at": "2026-04-15T12:00:00.000Z"
  }
}
```

---

## ❌ Error Responses

### Missing Name (400)

```json
{
  "status": "error",
  "message": "Name is required"
}
```

### Invalid Name (422)

```json
{
  "status": "error",
  "message": "Name must be a string"
}
```

### No Prediction Available (404)

```json
{
  "status": "error",
  "message": "No prediction available for the provided name"
}
```

### Server Error (500)

```json
{
  "status": "error",
  "message": "Something went wrong"
}
```

---

## 🧠 Processing Logic

- `count` → renamed to `sample_size`
- `is_confident` is **true** if:
  - probability ≥ 0.7 AND sample_size ≥ 100

- `processed_at` is generated dynamically using ISO 8601 format

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- Axios
- CORS

---

## 🧪 Running Locally

### 1. Clone repository

```
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 2. Install dependencies

```
npm install
```

### 3. Start server

```
npm run dev
```

### 4. Test API

```
http://localhost:8000/api/classify?name=John
```

---

## 🔐 Environment Variables

No environment variables are required for this project.

---

## 📊 Performance

- Response time: **< 500ms** (excluding external API latency)
- Supports multiple concurrent requests

---

## 📌 Submission Details

- GitHub Repository:
  👉 https://github.com/your-username/your-repo

- Live API:
  👉 https://your-deployed-url.com/api/classify?name=John

---

## 👨‍💻 Author

**Your Name**
Backend Developer

---

## 📄 License

This project is for educational purposes (HNG Internship).
