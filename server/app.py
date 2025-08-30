# Add 'request' to your flask import
from flask import Flask, request 
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS 

app = Flask(__name__)

CORS(app)


# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# A simple model for demonstration
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'

# A simple route to test the API
@app.route('/api/hello')
def hello_world():
    # --- ADD THIS LOGGING ---
    print("--- INCOMING REQUEST ---")
    print(f"Request Origin: {request.headers.get('Origin')}")
    print(f"Request Headers: {request.headers}")
    print("------------------------")
    return {'message': 'Hello from the Flask backend!'}

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)