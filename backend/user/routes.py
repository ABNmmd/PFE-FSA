from flask import Blueprint, request, jsonify
from user.models import User
from services.database import get_db
import os
import jwt
from functools import wraps
from bson import ObjectId

user_bp = Blueprint('user', __name__, url_prefix='/user')
db = get_db()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            token = token.split(" ")[1]
            data = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
            user_id = data['user_id']
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if user is None:
                return jsonify({'message': 'Invalid User'}), 403
        except Exception as e:
            print(e)
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(*args, **kwargs)
    return decorated

@user_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'message': 'Missing required fields'}), 400

    existing_user = User.get_user_by_username(username)
    if existing_user:
        return jsonify({'message': 'Username already exists'}), 400

    new_user = User(username, email, password)
    new_user.save()
    return jsonify({'message': 'User created successfully'}), 201

@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Missing required fields'}), 400

    user = User.get_user_by_username(username)
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid credentials'}), 401

    token = user.generate_token()
    return jsonify({'token': token}), 200

@user_bp.route('/protected', methods=['GET'])
@token_required
def protected():
    return jsonify({'message': 'This is a protected route'}), 200
