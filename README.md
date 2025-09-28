# 🌍 CivicSeva

CivicSeva is a citizen-centric platform that empowers people to **report civic issues** (like potholes, garbage, streetlight faults) and track their resolution in collaboration with local authorities.  
The platform bridges the gap between citizens and municipalities by providing a **transparent and efficient communication channel**.

---

## 📝 About the Project

Citizens often face civic problems such as uncollected garbage, broken roads, water leakage, or faulty streetlights. Most of these issues remain unsolved due to the lack of a proper reporting and tracking system.  

**CivicSeva solves this problem by:**
- Providing a **single platform** for reporting civic issues.  
- Allowing users to upload issue details with **images, location, and descriptions**.  
- Enabling **authorities to track, respond, and resolve issues** transparently.  
- Keeping citizens updated with **real-time notifications** on their complaint status.  

👉 In short, CivicSeva creates a **bridge between citizens and local authorities**, promoting **accountability and faster resolutions**.

---

## 🚀 Tech Stack

- **Frontend**: React.js  
- **Backend**: Django (Python)  
- **Database**: PostgreSQL
- **Version Control**: Git & GitHub  

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Pravalika-Batchu/CivicSeva.git
cd CivicSeva
```

### 2️⃣ Backend Setup (Django)
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # (Linux/Mac)
venv\Scripts\activate         # (Windows)

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```
👉 Django backend will run at: `http://127.0.0.1:8000/`

### 3️⃣ Frontend Setup (React)
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```
👉 React frontend will run at: `http://localhost:3000/`

---

## 🔐 Environment Variables

Create a `.env` file in the **backend** folder with:
```
SECRET_KEY=your_django_secret_key
DEBUG=True
DATABASE_URL=your_database_url
```

---

## 📌 Features

- 📝 Citizens can **report issues** with details & images.  
- 📍 **Geolocation-based issue mapping**.  
- 🔔 **Notifications** for status updates.  
- 📊 Transparent tracking of reported problems.  
- 🏛️ Local authorities can **respond & resolve** effectively.  

---

## 📸 Screenshots

![Demo logo](/homepage.png)



## 👩‍💻 Authors

- **Pravalika Batchu**  
