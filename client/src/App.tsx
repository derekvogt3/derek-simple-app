import React, { useState, FormEvent } from 'react';
import './App.css';
import { HomeIcon, DiscoverIcon, SpacesIcon, SignInIcon, SearchIcon } from './icons';

// --- Type Definitions ---
interface SearchResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
}

interface ApiResponse {
  aiResponse: string;
  searchResults: SearchResult[];
}

type FocusMode = 'general' | 'health' | 'local' | 'sports' | 'finance';

const focusData = {
  health: {
    title: "What do you want to know?",
    suggestions: [
      "What lifestyle changes can improve metabolic health?",
      "What are physical therapy exercises to reduce hip pain?",
      "What are some strategies for managing stress?",
    ],
  },
  local: {
    title: "What's going on in your area?",
    suggestions: [
      "What is happening in my city this weekend?",
      "What are the top-rated restaurants in my city?",
      "What are concerts in my city next month?",
    ],
  },
  sports: {
    title: "What's the latest in sports?",
    suggestions: [
      "Recap of last night's championship game",
      "Who are the rising stars in international football?",
      "What are the major rule changes in baseball this year?",
    ],
  },
  finance: {
    title: "How's the market looking?",
    suggestions: [
      "What are the predictions for the stock market next quarter?",
      "Explain the concept of compound interest with examples",
      "What are the pros and cons of investing in index funds?",
    ],
  },
};

// --- Main App Component ---
function App() {
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [focusMode, setFocusMode] = useState<FocusMode>('general');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    performSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
  }

  const handleFocusToggle = (mode: FocusMode) => {
    // If clicking the currently active mode, toggle back to general
    if (focusMode === mode) {
      setFocusMode('general');
    } else {
      setFocusMode(mode);
    }
  };

  const performSearch = async (currentQuery: string) => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery }),
      });
      if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`);
      const data: ApiResponse = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- Render Functions ---
  const renderSidebar = () => (
    <aside className="sidebar">
      <div className="sidebar-logo">Perplexity</div>
      <ul className="nav-list">
        <li className="nav-item active"><HomeIcon /> Home</li>
        <li className="nav-item"><DiscoverIcon /> Discover</li>
        <li className="nav-item"><SpacesIcon /> Spaces</li>
      </ul>
      <div className="nav-item"><SignInIcon /> Sign In</div>
    </aside>
  );

  const renderMainContent = () => (
    <main className="main-content">
      <div className="container">
        {!results && !isLoading && !error && (
            <>
              {focusMode === 'general' ? (
                <h1 className="logo-heading">perplexity</h1>
              ) : (
                <h1 className="prompt-heading">{focusData[focusMode as Exclude<FocusMode, 'general'>].title}</h1>
              )}
              
              <div className="search-form-container">
                <form onSubmit={handleSubmit} className="search-input-area">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="search-input"
                    placeholder="Ask anything..."
                    disabled={isLoading}
                  />
                  <button type="submit" className="search-button" disabled={isLoading}>&rarr;</button>
                </form>

                {focusMode !== 'general' && (
                  <ul className="prompt-suggestions-list">
                    {focusData[focusMode as Exclude<FocusMode, 'general'>].suggestions.map(prompt => (
                      <li key={prompt} className="prompt-suggestion-item" onClick={() => handleSuggestionClick(prompt)}>
                        <SearchIcon />
                        <span>{prompt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="focus-buttons">
                <button className={`focus-btn ${focusMode === 'health' ? 'active' : ''}`} onClick={() => handleFocusToggle('health')}>Health</button>
                <button className={`focus-btn ${focusMode === 'local' ? 'active' : ''}`} onClick={() => handleFocusToggle('local')}>Local</button>
                <button className={`focus-btn ${focusMode === 'sports' ? 'active' : ''}`} onClick={() => handleFocusToggle('sports')}>Sports</button>
                <button className={`focus-btn ${focusMode === 'finance' ? 'active' : ''}`} onClick={() => handleFocusToggle('finance')}>Finance</button>
              </div>
            </>
        )}

        {isLoading && <div className="loading">Thinking...</div>}
        {error && <div className="error">{error}</div>}

        {results && (
          <div className="results-container">
            <div className="ai-response-card"><p>{results.aiResponse}</p></div>
            <div className="search-results-list">
              <h3>Sources</h3>
              {results.searchResults.map((item) => (
                <div key={item.position} className="search-result-item">
                  <a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a>
                  <p>{item.snippet}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );

  return (
    <div className="app-layout">
      {renderSidebar()}
      {renderMainContent()}
    </div>
  );
}

export default App;