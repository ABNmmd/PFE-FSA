from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

from user.routes import user_bp
from documents.routes import document_bp
from report.routes import report_bp

app = Flask(__name__)
CORS(app)

load_dotenv()
app.secret_key = os.getenv("APP_SECRET_KEY")

app.register_blueprint(user_bp)
app.register_blueprint(document_bp)
app.register_blueprint(report_bp)

@app.route('/')
def api():
    return "Hello World"

if __name__ == '__main__':
    app.run(debug=True)
