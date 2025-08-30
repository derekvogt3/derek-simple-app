import React, { useState, useEffect } from 'react';
import './App.css';

// Define a type for our expected API response for better type safety
interface ApiResponse {
  message: string;
}

function App() {
  // State to store the message from the backend. We initialize it as null.
  const [message, setMessage] = useState<string | null>(null);
  
  // A state to know if we are currently fetching data
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // State to store any potential errors
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // The API endpoint we are trying to hit
    const apiEndpoint = '/api/hello';

    fetch(apiEndpoint)
      .then(response => {
        // If the response is not OK (e.g., status is not 200-299), throw an error
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        // Parse the JSON from the response. We tell TypeScript to expect our ApiResponse type
        return response.json() as Promise<ApiResponse>;
      })
      .then(data => {
        // Set the message from the response data
        setMessage(data.message);
      })
      .catch((error: Error) => {
        // If an error occurs during the fetch, update the error state
        console.error("There was a problem with the fetch operation:", error);
        setError(error);
      })
      .finally(() => {
        // This will run whether the fetch succeeded or failed
        setIsLoading(false);
      });
  }, []); // The empty dependency array [] means this effect runs only once

  // Helper function to determine what to render
  const renderContent = () => {
    if (isLoading) {
      return <p>Loading data from the backend...</p>;
    }
    if (error) {
      return <p style={{ color: 'red' }}>Error: {error.message}</p>;
    }
    if (message) {
      return <p>Message from Flask Backend: "{message}"</p>;
    }
    return <p>No message received.</p>;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Create React App (TypeScript)</h1>
        {renderContent()}
      </header>
    </div>
  );
}

export default App;