import os
from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from serpapi import GoogleSearch
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# The secret key is needed for session management with Socket.IO
app.config['SECRET_KEY'] = 'your-secret-key!' 
socketio = SocketIO(app, cors_allowed_origins="*")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
serpapi_api_key = os.getenv("SERPAPI_API_KEY")

@app.route('/api/search', methods=['POST'])
def get_search_results():
    data = request.get_json()
    query = data.get('query')
    if not query: return jsonify({"error": "Query is required"}), 400

    try:
        print(f"Fetching search results for: {query}")
        search = GoogleSearch({"q": query, "api_key": serpapi_api_key})
        search_results = search.get_dict()
        
        response_data = {
            "searchResults": search_results.get("organic_results", []),
            "videoResults": search_results.get("inline_videos", [])
        }
        return jsonify(response_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@socketio.on('stream_request')
def handle_stream_request(data):
    query = data.get('query')
    # NEW: Get the conversation history from the request
    history = data.get('history', []) 
    if not query: return

    try:
        # Re-fetch context for the AI, relevant to the new query
        search = GoogleSearch({"q": query, "api_key": serpapi_api_key})
        results = search.get_dict()
        context = "".join([f"[{i+1}] {r.get('snippet', '')}\n" for i, r in enumerate(results.get("organic_results", [])[:5])])
        
        # NEW: Build a history string to prepend to the prompt
        history_string = ""
        for turn in history:
            history_string += f"User: {turn['query']}\nAI: {turn['response']}\n\n"

        prompt = f"""
        You are a helpful AI assistant. Use the provided search results and the conversation history to answer the new follow-up question.

        Search Results (for the new question):
        {context}

        Conversation History:
        {history_string}
        
        New Question: "{query}"

        Instructions:
        - Provide a comprehensive answer to the new question.
        - Your answer should build upon the conversation history if relevant.
        - You MUST include citations like [1], [2], etc., from the new search results.
        - Answer based only on the provided text and history.
        """

        stream = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )

        print(f"Streaming response for client: {request.sid}")
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                socketio.emit('token', {'data': content}, to=request.sid)
        
        socketio.emit('stream_end', to=request.sid)
        print(f"Stream ended for client: {request.sid}")

    except Exception as e:
        print(f"Stream error for {request.sid}: {e}")
        socketio.emit('stream_error', {'error': str(e)}, to=request.sid)


if __name__ == '__main__':
    print("Starting gevent server on http://localhost:5001")
    print("Starting Flask-SocketIO development server on http://localhost:5001")
    socketio.run(app, port=5001, debug=True)