# CivicSeva

**CivicSeva** is a comprehensive platform designed to facilitate civic participation and community hygiene management. The project consists of a full-stack web application with a Django backend and a React frontend (wrapped via Capacitor for mobile app support).

---

## 🏗️ Project Architecture & Folder Structure

```text
CivicSeva/
├── backend/                  # Django backend application
│   ├── authentication/       # User authentication and authorization
│   ├── hygiene/              # Core business logic for hygiene/reporting
│   ├── backend/              # Django core settings and configurations
│   ├── media/                # Uploaded media files
│   ├── manage.py             # Django CLI utility
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile            # Dockerfile for the backend service
├── frontend/                 # React frontend application
│   ├── src/                  # Application source code (React, Maps, Charts)
│   ├── public/               # Static assets
│   ├── android/              # Capacitor Android build folder
│   ├── package.json          # NPM dependencies & scripts
│   └── Dockerfile            # Dockerfile for the frontend service
├── docs/                     # Project documentation
├── docker-compose.yml        # Docker compose configuration for running the full stack
└── README.md                 # Project documentation (this file)
```

## 🚀 Technology Stack

- **Frontend:** React.js, Bootstrap, React Leaflet (Maps), Chart.js, Capacitor (Mobile support)
- **Backend:** Django (Python), PostgreSQL
- **Containerization:** Docker, Docker Compose
- **AI/External APIs:** OpenAI, Google Generative AI

## 🛠️ Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (for local frontend development)
- [Python 3.x](https://www.python.org/) (for local backend development)

### Running with Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd civicseva
   ```

2. **Start the containers:**
   Use Docker Compose to build and start the database, backend, and frontend services.
   ```bash
   docker-compose up --build
   ```

3. **Access the Application:**
   - **Frontend:** http://localhost:3001
   - **Backend API:** http://localhost:8001

### Local Setup (Without Docker)

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Activate the virtual environment
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🔒 Environment Variables

You may need to set up local environment variables for complete functionality (e.g., API keys, database credentials). 
- **Backend:** Reference the variables expected in `backend/.env`.
- **Frontend:** Review `frontend/.env` keys (like `REACT_APP_API_URL`).
