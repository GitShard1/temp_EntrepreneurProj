# Full-Stack App: Next.js Frontend, FastAPI Backend, MongoDB Database

This project is a full-stack web application with:
- **Frontend**: Next.js with React, TypeScript, Tailwind CSS
- **Backend**: FastAPI with Python
- **Database**: MongoDB

## Project Structure

- `app/` - Next.js frontend code
- `backend/` - FastAPI backend code
- `.github/` - GitHub configuration

## Getting Started

### Prerequisites

- Node.js (for Next.js)
- Python 3.8+ (for FastAPI)
- MongoDB (local or cloud instance)

### Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Backend Setup

1. Navigate to backend:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

   The API will be available at [http://localhost:8000](http://localhost:8000).

### Database

Ensure MongoDB is running locally on `mongodb://localhost:27017/` or update the connection string in `backend/main.py`.

## API Endpoints

- `GET /` - Hello message
- `POST /items/` - Create an item
- `GET /items/` - List all items

## Building for Production

### Frontend
```bash
npm run build
npm start
```

### Backend
```bash
uvicorn main:app
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
