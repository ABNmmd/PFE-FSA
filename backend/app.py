from flask import Flask, request, jsonify
from user.routes import user_bp

app = Flask(__name__)

app.register_blueprint(user_bp)

@app.route('/')
def api():
    return "Hello World"

if __name__ == '__main__':
    app.run(debug=True)
