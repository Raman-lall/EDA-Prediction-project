# EDA Prediction Project

A full-stack application for exploratory data analysis (EDA) and predictive modeling with a Python backend and React frontend.

## Project Structure

```
project/
├── backend/
│   ├── main.py
│   └── requirements.txt
└── frontend/
    └── eda-app/
        ├── index.html
        ├── package.json
        ├── vite.config.js
        ├── eslint.config.js
        ├── README.md
        ├── public/
        └── src/
            ├── App.jsx
            ├── App.css
            ├── main.jsx
            ├── index.css
            └── assets/
```

## Overview

### Backend
Python-based API server that handles data processing, exploratory data analysis, and predictive modeling.

**Tech Stack:**
- Python 3.x
- Flask/FastAPI (or your chosen framework)

### Frontend
React-based web application for visualizing data and model predictions.

**Tech Stack:**
- React 18+
- Vite
- JavaScript/JSX

## Prerequisites

- Python 3.8+
- Node.js 16+ and npm
- Git

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend/eda-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Start the Backend Server

```bash
cd backend
python main.py
```

The backend server will typically run on `http://localhost:5000` (or check your main.py for the configured port).

### Start the Frontend Development Server

```bash
cd frontend/eda-app
npm run dev
```

The frontend will typically be available at `http://localhost:5173` (Vite default).

## Build for Production

### Frontend Build

```bash
cd frontend/eda-app
npm run build
```

This creates an optimized production build in the `dist/` directory.

## Features

- **Exploratory Data Analysis**: Visualize and analyze datasets
- **Predictive Modeling**: Build and evaluate predictive models
- **Interactive Dashboard**: User-friendly interface for data exploration

## Contributing

Feel free to fork this project, make changes, and submit pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, feature requests, or questions, please open an issue on the project repository.
