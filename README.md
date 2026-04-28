# Intelligence Query Engine API

## Overview

This project is a backend system built for **Insighta Labs**, a demographic intelligence platform. It transforms stored profile data into a **Queryable Intelligence Engine**, enabling clients to:

- Filter datasets using multiple conditions
- Sort and paginate results efficiently
- Perform natural language queries

The system is designed to handle structured queries and convert plain English input into database filters.

---

## 🚀 Base URL

```
https://stage-zero-production.up.railway.app
```

---

## 🗄️ Database Schema

| Field               | Type      | Description                    |
| ------------------- | --------- | ------------------------------ |
| id                  | UUID v7   | Primary key                    |
| name                | String    | Unique full name               |
| gender              | String    | male / female                  |
| gender_probability  | Float     | Confidence score               |
| age                 | Number    | Exact age                      |
| age_group           | String    | child, teenager, adult, senior |
| country_id          | String(2) | ISO code (NG, KE, etc.)        |
| country_name        | String    | Full country name              |
| country_probability | Float     | Confidence score               |
| created_at          | Date      | Auto-generated (UTC ISO 8601)  |

---

## 🌱 Data Seeding

- Dataset: 2026 profiles
- Duplicate-safe seeding
- Command:

```
npm run seed
```

---

# 🔍 API FEATURES

---

## 1. Advanced Filtering

### Endpoint

```
GET /api/profiles
```

### Supported Parameters

- gender
- age_group
- country_id
- min_age
- max_age
- min_gender_probability
- min_country_probability

### Example

```
/api/profiles?gender=male&country_id=NG&min_age=25
```

✔ Filters are **combinable (AND logic)**

---

## 2. Sorting

### Parameters

- `sort_by` → age | created_at | gender_probability
- `order` → asc | desc

### Example

```
/api/profiles?sort_by=age&order=desc
```

---

## 3. Pagination

### Parameters

- page (default: 1)
- limit (default: 10, max: 50)

### Response Format

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "data": []
}
```

---

## 🧠 4. Natural Language Search

### Endpoint

```
GET /api/profiles/search?q=<query>
```

### Example

```
/api/profiles/search?q=young males from nigeria
```

---

# ⚙️ Parser Implementation

## 📌 Approach

The system uses a **rule-based natural language parser**, as required.

It converts plain English queries into structured MongoDB filters using:

- Keyword detection
- Regular expressions
- Dynamic country mapping from dataset

---

## 🔄 Parsing Workflow

### 1. Normalization

- Converts query to lowercase
- Removes casing inconsistencies

---

### 2. Gender Detection

Uses regex word boundaries to avoid substring bugs:

```js
const hasMale = /\bmale\b/.test(q);
const hasFemale = /\bfemale\b/.test(q);
```

| Input           | Output           |
| --------------- | ---------------- |
| male            | gender = male    |
| female          | gender = female  |
| male and female | no gender filter |

---

### 3. Age Group Detection

| Keyword | Mapping              |
| ------- | -------------------- |
| child   | age_group = child    |
| teen    | age_group = teenager |
| adult   | age_group = adult    |
| senior  | age_group = senior   |

---

### 4. Special Age Rules

| Keyword | Mapping   |
| ------- | --------- |
| young   | age 16–24 |
| old     | age ≥ 60  |

---

### 5. Numeric Conditions

Extracted using regex:

```
above (\d+) → min_age
below (\d+) → max_age
```

---

### 6. Country Detection

- Countries are dynamically extracted from the dataset
- Uses pattern:

```
from <country>
```

- Applies longest-match strategy to avoid conflicts (e.g. Niger vs Nigeria)

---

## 🧪 Example Query Mappings

| Query                              | Output                                      |
| ---------------------------------- | ------------------------------------------- |
| young males                        | gender=male, age 16–24                      |
| females above 30                   | gender=female, min_age=30                   |
| people from angola                 | country_id=AO                               |
| adult males from kenya             | gender=male, age_group=adult, country_id=KE |
| male and female teenagers above 17 | age_group=teenager, min_age=17              |

---

# ⚠️ Parser Limitations

### 1. Keyword Dependency

Only predefined keywords are supported.

❌ Not supported:

- "elderly women"
- "middle-aged men"

---

### 2. No Synonym Handling

| Input  | Result         |
| ------ | -------------- |
| women  | not recognized |
| guys   | not recognized |
| ladies | not recognized |

---

### 3. Limited Grammar Understanding

Supports simple patterns only:

- "from <country>"
- "above <number>"

❌ Complex queries fail:

```
people who live in nigeria
```

---

### 4. Country Matching Limitations

- Requires correct spelling
- No fuzzy matching
- Partial matches may fail

---

### 5. Interpreted Flag Constraint

Parser uses an `interpreted` flag:

```js
return interpreted ? filter : null;
```

This may cause valid queries like:

```
people from angola
```

to return `null` if no other condition sets the flag.

---

### 6. Performance Overhead

- JSON file is read on every request
- Causes unnecessary I/O operations

---

# 🚀 Performance Optimizations

- MongoDB indexing:
  - age
  - country_id
  - gender

- Pagination prevents large dataset loads
- Efficient query building

---

# 🔐 Rate Limiting

- Protects API from abuse
- Limits requests per IP

---

# 🌍 CORS

```
Access-Control-Allow-Origin: *
```

---

# 🚨 Error Handling

### Format

```json
{
  "status": "error",
  "message": "Error message"
}
```

### Status Codes

| Code | Meaning            |
| ---- | ------------------ |
| 400  | Bad Request        |
| 422  | Invalid parameters |
| 404  | Not found          |
| 500  | Server error       |

---

# 🛠️ Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- UUID v7

---

# 📦 Setup

```bash
git clone <repo>
cd project
npm install
```

### Run server

```bash
npm start
```

### Seed database

```bash
npm run seed
```

---

# ✅ Evaluation Coverage

- Advanced Filtering ✔
- Combined Filters ✔
- Sorting ✔
- Pagination ✔
- Natural Language Parsing ✔
- Query Validation ✔
- Performance ✔

---

# 🔗 Submission

- GitHub Repo: `https://github.com/Tobi-davies/stage-zero`
- API URL: `https://stage-zero-production.up.railway.app`

---
