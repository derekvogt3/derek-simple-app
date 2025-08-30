import { useState, useEffect, ReactNode, useRef } from 'react'; 
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
interface ConversationTurn {
  query: string;
  response: string;
  sources: SearchResponse;
}

const focusData = {
  health: { title: "What do you want to know?", suggestions: ["What lifestyle changes can improve metabolic health?", "What are physical therapy exercises to reduce hip pain?", "What are some strategies for managing stress?"] },
  local: { title: "What's going on in your area?", suggestions: ["What is happening in my city this weekend?", "What are the top-rated restaurants in my city?", "What are concerts in my city next month?"] },
  sports: { title: "What's the latest in sports?", suggestions: ["Recap of last night's championship game", "Who are the rising stars in international football?", "What are the major rule changes in baseball this year?"] },
  finance: { title: "How's the market looking?", suggestions: ["What are the predictions for the stock market next quarter?", "Explain the concept of compound interest with examples", "What are the pros and cons of investing in index funds?"] },
};

function App() {
  const [query, setQuery] = useState<string>('');
  const [isLoadingSources, setIsLoadingSources] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<FocusMode>('general');
  
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [currentSources, setCurrentSources] = useState<SearchResponse | null>(null);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5001');
    setSocket(newSocket);
    newSocket.on('connect', () => console.log('WebSocket Connected!'));
    newSocket.on('token', (data: { data: string }) => {
      setIsStreaming(true);
      setCurrentResponse((prev) => prev + data.data);
    });
    newSocket.on('stream_end', () => {
      setIsStreaming(false);
      console.log('Stream ended.');
    });
    newSocket.on('stream_error', (data: { error: string }) => {
      setError(`Streaming Error: ${data.error}`);
      setIsStreaming(false);
    });
    return () => { newSocket.disconnect(); };
  }, []);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({
        top: mainContentRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  
  }, [currentResponse, conversation, isLoadingSources]);


  const performSearch = async (searchQuery: string, isFollowUp: boolean = false) => {
    if (!searchQuery.trim() || !socket) return;
    if (!isFollowUp) setConversation([]);
    else if (currentSources && currentResponse) {
      setConversation(prev => [...prev, { query: currentQuery, response: currentResponse, sources: currentSources }]);
    }
    setIsLoadingSources(true);
    setError(null);
    setCurrentResponse('');
    setCurrentSources(null);
    setCurrentQuery(searchQuery);
    try {
      const searchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (!searchResponse.ok) throw new Error(`Search API Error: ${searchResponse.statusText}`);
      const searchData: SearchResponse = await searchResponse.json();
      setCurrentSources(searchData);
      setIsLoadingSources(false);
      setIsStreaming(true);
      const historyForPrompt = conversation.map(turn => ({ query: turn.query, response: turn.response }));
      if (isFollowUp && currentResponse) historyForPrompt.push({ query: currentQuery, response: currentResponse });
      socket.emit('stream_request', { query: searchQuery, history: historyForPrompt });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsLoadingSources(false);
    }
  };
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); performSearch(query); };
  const handleSuggestionClick = (suggestion: string) => { setQuery(suggestion); performSearch(suggestion); };
  const handleFollowUpSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const followUpInput = event.currentTarget.elements.namedItem('followUp') as HTMLInputElement;
    const followUpQuery = followUpInput.value;
    if (!followUpQuery) return;
    performSearch(followUpQuery, true);
    followUpInput.value = '';
  };
  const handleNewSearch = () => {
    setConversation([]);
    setCurrentResponse('');
    setCurrentSources(null);
    setCurrentQuery('');
    setQuery('');
    setError(null);
    setFocusMode('general');
  };
  const parseResponseWithCitations = (response: string, sources: SearchResponse | null): ReactNode[] => {
    if (!sources || !sources.searchResults) return [response];
    const parts = response.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationNumber = parseInt(match[1], 10);
        const source = sources.searchResults[citationNumber - 1];
        if (source) {
          return (
            <a key={`${index}-${citationNumber}`} href={source.link} target="_blank" rel="noopener noreferrer" className="citation-link">[{citationNumber}]</a>
          );
        }
      }
      return part;
    });
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
      {focusMode === 'general' ? <h1 className="logo-heading">perplexity</h1> : <h1 className="prompt-heading">{focusData[focusMode].title}</h1>}
      <div className="search-form-container">
        <form onSubmit={handleSubmit} className="search-input-area">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} className="search-input" placeholder="Ask anything..." disabled={isLoadingSources || isStreaming} />
          <button type="submit" className="search-button" disabled={isLoadingSources || isStreaming}>&rarr;</button>
        </form>
        {focusMode !== 'general' && (
          <ul className="prompt-suggestions-list">
            {focusData[focusMode].suggestions.map((prompt: string) => (<li key={prompt} className="prompt-suggestion-item" onClick={() => handleSuggestionClick(prompt)}><SearchIcon /><span>{prompt}</span></li>))}
          </ul>
        )}
      </div>
      <div className="focus-buttons">
        <button className={`focus-btn ${focusMode === 'health' ? 'active' : ''}`} onClick={() => setFocusMode(focusMode === 'health' ? 'general' : 'health')}>Health</button>
        <button className={`focus-btn ${focusMode === 'local' ? 'active' : ''}`} onClick={() => setFocusMode(focusMode === 'local' ? 'general' : 'local')}>Local</button>
        <button className={`focus-btn ${focusMode === 'sports' ? 'active' : ''}`} onClick={() => setFocusMode(focusMode === 'sports' ? 'general' : 'sports')}>Sports</button>
        <button className={`focus-btn ${focusMode === 'finance' ? 'active' : ''}`} onClick={() => setFocusMode(focusMode === 'finance' ? 'general' : 'finance')}>Finance</button>
      </div>
    </div>
  );
  
  const renderResultsPage = () => ( 
    <div className="results-page-container">
      {conversation.map((turn, index) => (
        <div key={index} className="conversation-turn">
          <h1 className="conversation-query">{turn.query}</h1>
          {turn.sources.searchResults && turn.sources.searchResults.length > 0 && (
            <div className="source-links-container">
              {turn.sources.searchResults.slice(0, 5).map((item, i) => (
                <div key={item.position} className="source-link-card"><a href={item.link} target="_blank" rel="noopener noreferrer"><sup>{i + 1}</sup> {item.source || new URL(item.link).hostname}</a></div>
              ))}
            </div>
          )}
          {turn.sources.videoResults && turn.sources.videoResults.length > 0 && (
            <div className="video-carousel-container">
              {turn.sources.videoResults.map((video, i) => (
                <a key={i} href={video.link} className="video-card" target="_blank" rel="noopener noreferrer"><img src={video.thumbnail} alt={video.title} className="video-thumbnail" /><div className="video-play-button"><PlayIcon /></div></a>
              ))}
            </div>
          )}
          <div className="ai-response-card"><p>{parseResponseWithCitations(turn.response, turn.sources)}</p></div>
        </div>
      ))}
      {currentQuery && <h1 className="results-query-heading">{currentQuery}</h1>}
      {isLoadingSources && <div className="loading"><span className="spinner">*</span></div>}
      {error && <div className="error">{error}</div>}
      {currentSources && (
        <>
          <div className="source-links-container">
            {currentSources.searchResults.slice(0, 5).map((item, index) => (
              <div key={item.position} className="source-link-card"><a href={item.link} target="_blank" rel="noopener noreferrer"><sup>{index + 1}</sup> {item.source || new URL(item.link).hostname}</a></div>
            ))}
          </div>
          {currentSources.videoResults && currentSources.videoResults.length > 0 && (
            <div className="video-carousel-container">
              {currentSources.videoResults.map((video, index) => (
                <a key={index} href={video.link} className="video-card" target="_blank" rel="noopener noreferrer"><img src={video.thumbnail} alt={video.title} className="video-thumbnail" /><div className="video-play-button"><PlayIcon /></div></a>
              ))}
            </div>
          )}
          <div className="ai-response-card">
            <p>{parseResponseWithCitations(currentResponse, currentSources)}{isStreaming && <span className="streaming-cursor" />}</p>
          </div>
        </>
      )}
      {!isStreaming && currentResponse && (
        <div className="follow-up-form-container">
          <form onSubmit={handleFollowUpSubmit} className="follow-up-input-area">
            <input type="text" name="followUp" className="follow-up-input" placeholder="Ask a follow up..." autoComplete="off" />
            <button type="submit" className="search-button">&rarr;</button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <div className="app-layout">
      {renderSidebar()}
      <main className="main-content" ref={mainContentRef}>
        {conversation.length > 0 || currentQuery ? renderResultsPage() : renderSearchPage()}
      </main>
    </div>
  );
}

export default App;