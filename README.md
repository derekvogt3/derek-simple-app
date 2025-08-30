
# My Fullstack App

This is a full-stack web application with a React and TypeScript front end, and a Python and Flask back end connected to a SQLite database.

## Project Structure

- `client/`: Contains the React + TypeScript front-end application.
- `server/`: Contains the Python + Flask back-end application.

## Getting Started Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm)
- [Python 3](https://www.python.org/downloads/)
- [pip](https://pip.pypa.io/en/stable/installation/)

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd my-fullstack-app
```

### 2. Set up the Backend

Navigate to the `server` directory and set up a virtual environment.

```bash
cd server
python3 -m venv venv
source venv/bin/activate
```

Install the required Python packages.

```bash
pip install -r requirements.txt
```

*(Note: You will need to create a `requirements.txt` file in the `server` directory by running `pip freeze > requirements.txt` while your virtual environment is active.)*

Run the Flask development server. This will also create the `app.db` SQLite database file on the first run.

```bash
python app.py
```

The back-end server will be running on `http://localhost:5000`.

### 3. Set up the Frontend

In a new terminal, navigate to the `client` directory.

```bash
cd ../client
```

Install the required npm packages.

```bash
npm install
```

Run the React development server.

```bash
npm start
```

The front-end development server will be running on `http://localhost:5173`. You can now view the application in your browser at this address.