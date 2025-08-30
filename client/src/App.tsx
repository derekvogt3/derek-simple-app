import { useState, FormEvent, useEffect} from 'react';
import './App.css';
import { HomeIcon, DiscoverIcon, SpacesIcon, SignInIcon, SearchIcon, PlusIcon, PlayIcon } from './icons';
import { io, Socket } from 'socket.io-client';

interface SearchResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  source: string;
}

interface VideoResult {
  title: string;
  link: string;
  thumbnail: string;
  source: string;
}

interface SearchResponse {
  searchResults: SearchResult[];
  videoResults: VideoResult[];
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

function App() {
  const [query, setQuery] = useState<string>('');
  const [searchedQuery, setSearchedQuery] = useState<string>('');
  const [isLoadingSources, setIsLoadingSources] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<FocusMode>('general');
  const [sources, setSources] = useState<SearchResponse | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Establish WebSocket connection when the component mounts
    const newSocket = io('http://localhost:5001');
    setSocket(newSocket);

    newSocket.on('connect', () => console.log('WebSocket Connected!'));
    
    // Listener for incoming stream tokens
    newSocket.on('token', (data: { data: string }) => {
      setAiResponse((prev) => prev + data.data);
    });

    // Listener for the end of the stream
    newSocket.on('stream_end', () => {
      setIsStreaming(false);
      console.log('Stream ended.');
    });

    // Listener for any errors during the stream
    newSocket.on('stream_error', (data: { error: string }) => {
      setError(`Streaming Error: ${data.error}`);
      setIsStreaming(false);
    });
    
    // Cleanup on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const performSearch = async (currentQuery: string) => {
    if (!currentQuery.trim() || !socket) return;
    
    setIsLoadingSources(true);
    setError(null);
    setSources(null);
    setAiResponse('');
    setSearchedQuery(currentQuery);

    try {
      const searchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery }),
      });
      if (!searchResponse.ok) throw new Error(`Search API Error: ${searchResponse.statusText}`);
      
      const searchData: SearchResponse = await searchResponse.json();
      setSources(searchData);
      
      setIsLoadingSources(false); 
      setIsStreaming(true);
      socket.emit('stream_request', { query: currentQuery });

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsLoadingSources(false);
      setIsStreaming(false);
    }
  };

  const handleSubmit = (event: FormEvent) => { event.preventDefault(); performSearch(query); };
  const handleSuggestionClick = (suggestion: string) => { setQuery(suggestion); performSearch(suggestion); };
  const handleFocusToggle = (mode: FocusMode) => { setFocusMode(focusMode === mode ? 'general' : mode); };
  const handleNewSearch = () => {
    setSources(null);
    setAiResponse('');
    setQuery('');
    setSearchedQuery('');
    setFocusMode('general');
  };
  
  const renderSidebar = () => (
    <aside className="sidebar">
      <div className="sidebar-logo">Perplexity</div>
      <button className="new-search-btn" onClick={handleNewSearch}><PlusIcon/> New Search</button>
      <ul className="nav-list">
        <li className="nav-item active"><HomeIcon /> Home</li>
        <li className="nav-item"><DiscoverIcon /> Discover</li>
        <li className="nav-item"><SpacesIcon /> Spaces</li>
      </ul>
      <div className="nav-item"><SignInIcon /> Sign In</div>
    </aside>
  );

  const renderSearchPage = () => (
    <div className="search-page-container">
      {focusMode === 'general' ? (
        <h1 className="logo-heading">perplexity</h1>
      ) : (
        <h1 className="prompt-heading">{(focusData as any)[focusMode].title}</h1>
      )}
      
      <div className="search-form-container">
        <form onSubmit={handleSubmit} className="search-input-area">
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            className="search-input" 
            placeholder="Ask anything..." 
            disabled={isLoadingSources || isStreaming} 
          />
          <button 
            type="submit" 
            className="search-button" 
            disabled={isLoadingSources || isStreaming}
          >
            &rarr;
          </button>
        </form>

        {focusMode !== 'general' && (
          <ul className="prompt-suggestions-list">
            {(focusData as any)[focusMode].suggestions.map((prompt: string) => (
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
    </div>
  );

  const renderResultsPage = () => (
    <div className="results-page-container">
      <h1 className="results-query-heading">{searchedQuery}</h1>

      {isLoadingSources && <div className="loading"><span className="spinner">*</span></div>}
      {error && <div className="error">{error}</div>}

      {sources && (
        <>
          {sources.searchResults && sources.searchResults.length > 0 && (
            <div className="source-links-container">
              {sources.searchResults.slice(0, 5).map((item) => (
                <div key={item.position} className="source-link-card">
                  <a href={item.link} target="_blank" rel="noopener noreferrer">{item.source || new URL(item.link).hostname}</a>
                </div>
              ))}
            </div>
          )}

          {sources.videoResults && sources.videoResults.length > 0 && (
            <div className="video-carousel-container">
              {sources.videoResults.map((video, index) => (
                <a key={index} href={video.link} className="video-card" target="_blank" rel="noopener noreferrer">
                  <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
                  <div className="video-play-button"><PlayIcon /></div>
                </a>
              ))}
            </div>
          )}
          
          <div className="ai-response-card">
            <p>
              {aiResponse}
              {isStreaming && <span className="streaming-cursor" />}
            </p>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="app-layout">
      {renderSidebar()}
      <main className="main-content">
        {searchedQuery ? renderResultsPage() : renderSearchPage()}
      </main>
    </div>
  );
}

export default App;