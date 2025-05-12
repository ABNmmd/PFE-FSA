from flask import Blueprint, request, jsonify, session, redirect
from user.models import User
from services.database import get_db
import os
import jwt
from functools import wraps
from bson import ObjectId
from services.google_oauth import get_google_flow, get_google_user_email, credentials_to_dict
from urllib.parse import urlencode
from google.oauth2.credentials import Credentials
import google.auth.transport.requests

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
            request.user_id = user_id  # Store user_id in the request object
        except Exception as e:
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

@user_bp.route('/google/login')
def google_login():
    flow = get_google_flow()
    authorization_url, state = flow.authorization_url(access_type='offline', prompt='consent')
    session['state'] = state
    return redirect(authorization_url)

@user_bp.route('/google/callback')
def google_callback():
    flow = get_google_flow()
    try:
        # Fetch the token
        try:
            flow.fetch_token(authorization_response=request.url)
            credentials = flow.credentials
        except Exception as e:
            params = urlencode({"success": "false", "message": "Failed to fetch token."})
            redirect_url = f"http://localhost:5173/google-callback?{params}"
            return redirect(redirect_url)

        if not credentials or not credentials.token:
            params = urlencode({"success": "false", "message": "Failed to retrieve Google credentials."})
            redirect_url = f"http://localhost:5173/google-callback?{params}"
            return redirect(redirect_url)

        # Check if the token is expired and refresh it if necessary
        if credentials.expired and credentials.refresh_token:
            try:
                request_obj = google.auth.transport.requests.Request()
                credentials.refresh(request_obj)
            except Exception as e:
                params = urlencode({"success": "false", "message": "Failed to refresh access token."})
                redirect_url = f"http://localhost:5173/google-callback?{params}"
                return redirect(redirect_url)

        try:
            user_email = get_google_user_email(credentials.token)
            if not user_email:
                params = urlencode({"success": "false", "message": "Failed to retrieve user email from Google."})
                redirect_url = f"http://localhost:5173/google-callback?{params}"
                return redirect(redirect_url)
        except Exception as e:
            params = urlencode({"success": "false", "message": "Failed to retrieve user email from Google."})
            redirect_url = f"http://localhost:5173/google-callback?{params}"
            return redirect(redirect_url)

        user = User.get_user_by_email(user_email)
        if user:
            user.update_google_credentials(credentials_to_dict(credentials))
            params = urlencode({"success": "true", "message": "Google Drive connected successfully!"})
        else:
            params = urlencode({"success": "false", "message": "User not found"})
    except Exception as e:
        params = urlencode({"success": "false", "message": str(e)})

    redirect_url = f"http://localhost:5173/google-callback?{params}"
    return redirect(redirect_url)

@user_bp.route('/check-google-connection', methods=['GET'])
@token_required
def check_google_connection():
    user_id = request.user_id
    user = User.get_user_by_id(user_id)
    
    if not user:
        return jsonify({'connected': False}), 404
    
    # Check if user has Google credentials
    connected = user.google_credentials is not None
    
    return jsonify({'connected': connected}), 200

@user_bp.route('/profile', methods=['GET'])
@token_required
def get_user_profile():
    user_id = request.user_id
    user = User.get_user_by_id(user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Return user information (excluding sensitive data like password)
    user_data = {
        'id': str(user.id),
        'username': user.username,
        'email': user.email,
        'has_google_drive': user.google_credentials is not None,
        'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None,
        'updated_at': user.updated_at.strftime('%Y-%m-%d %H:%M:%S') if user.updated_at else None
    }
    
    return jsonify(user_data), 200

@user_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    user_id = request.user_id
    user = User.get_user_by_id(user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'message': 'Missing required fields'}), 400
    
    if not user.check_password(current_password):
        return jsonify({'message': 'Current password is incorrect'}), 401
    
    # Update the password in the user model
    user.update_password(new_password)
    
    return jsonify({
        'message': 'Password updated successfully',
        'user': {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'has_google_drive': user.google_credentials is not None,
            'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None,
            'updated_at': user.updated_at.strftime('%Y-%m-%d %H:%M:%S') if user.updated_at else None
        }
    }), 200

@user_bp.route('/update-profile', methods=['POST'])
@token_required
def update_profile():
    user_id = request.user_id
    user = User.get_user_by_id(user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    
    if not username and not email:
        return jsonify({'message': 'No fields to update'}), 400
    
    # Check if username is already taken
    if username and username != user.username:
        existing_user = User.get_user_by_username(username)
        if existing_user:
            return jsonify({'message': 'Username already exists'}), 400
    
    # Check if email is already taken
    if email and email != user.email:
        existing_user = User.get_user_by_email(email)
        if existing_user:
            return jsonify({'message': 'Email already exists'}), 400
    
    # Update the profile
    user.update_profile(username=username, email=email)
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'has_google_drive': user.google_credentials is not None,
            'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None,
            'updated_at': user.updated_at.strftime('%Y-%m-%d %H:%M:%S') if user.updated_at else None
        }
    }), 200

@user_bp.route('/google/disconnect', methods=['POST'])
@token_required
def google_disconnect():
    """Disconnect Google Drive by clearing stored credentials."""
    user_id = request.user_id
    user = User.get_user_by_id(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    # Remove credentials
    user.update_google_credentials(None)
    return jsonify({"message": "Google Drive disconnected successfully", "connected": False}), 200
