import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from serpapi import GoogleSearch
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize the Flask app
app = Flask(__name__)
CORS(app)

# Initialize API clients
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
serpapi_api_key = os.getenv("SERPAPI_API_KEY")

# --- API Endpoint to handle queries ---
@app.route('/api/query', methods=['POST'])
def handle_query():
    # Get the user's query from the request body
    data = request.get_json()
    query = data.get('query')

    if not query:
        return jsonify({"error": "Query is required"}), 400
    if not serpapi_api_key or not client.api_key:
        return jsonify({"error": "API keys are not configured correctly"}), 500

    try:
        # --- 1. Fetch search results using SerpAPI ---
        print(f"Fetching search results for: {query}")
        search = GoogleSearch({
            "q": query,
            "api_key": serpapi_api_key
        })
        search_results = search.get_dict()
        organic_results = search_results.get("organic_results", [])

        # Extract relevant context for the AI
        context = ""
        for i, result in enumerate(organic_results[:5]): # Use top 5 results
            context += f"[{i+1}] {result.get('snippet', 'No snippet available.')}\n"
        
        print(f"Context for AI:\n{context}")

        # --- 2. Generate AI response using OpenAI ---
        print("Generating AI response...")
        prompt = f"""
        Based on the following search results, provide a comprehensive answer to the user's query: "{query}"

        Search Results (with sources):
        {context}

        Instructions:
        - Synthesize the information from the search results into a clear, well-written answer.
        - Your answer MUST include citations in the format [1], [2], etc., corresponding to the search results provided.
        - If the search results do not provide enough information, state that you couldn't find a definitive answer.
        - Do not invent information. Base your answer strictly on the provided text.
        """

        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant that answers questions based on provided search results."},
                {"role": "user", "content": prompt}
            ]
        )
        ai_response = completion.choices[0].message.content
        print(f"AI Response: {ai_response}")

        # --- 3. Combine and return the results ---
        response_data = {
            "aiResponse": ai_response,
            "searchResults": organic_results
        }
        return jsonify(response_data)

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500

# Run the app on port 5001 as we established
if __name__ == '__main__':
    app.run(debug=True, port=5001)