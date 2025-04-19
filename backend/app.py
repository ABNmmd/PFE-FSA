from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

from user.routes import user_bp
from documents.routes import document_bp
from report.routes import report_bp

app = Flask(__name__)
CORS(app)

load_dotenv()
app.secret_key = os.getenv("APP_SECRET_KEY")

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

app.register_blueprint(user_bp)
app.register_blueprint(document_bp)
app.register_blueprint(report_bp)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/')
def api():
    return "Hello World"

if __name__ == '__main__':
    app.run(debug=True)
