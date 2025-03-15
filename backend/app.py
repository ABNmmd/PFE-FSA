from flask import Flask, request, jsonify
from flask_cors import CORS

from user.routes import user_bp

app = Flask(__name__)
CORS(app)
app.register_blueprint(user_bp)

@app.route('/')
def api():
    return "Hello World"

if __name__ == '__main__':
    app.run(debug=True)
