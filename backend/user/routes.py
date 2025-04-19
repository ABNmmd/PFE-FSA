from flask import Blueprint, request, jsonify, session, redirect, current_app as app, url_for
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
from werkzeug.utils import secure_filename

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
def get_profile():
    """Get user profile information."""
    user_id = request.user_id
    
    user = User.get_user_by_id(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    # Convert profile picture URL to full URL if it exists
    profile_picture_url = None
    if user.profile_picture_url:
        if user.profile_picture_url.startswith('http'):
            profile_picture_url = user.profile_picture_url
        else:
            profile_picture_url = request.url_root.rstrip('/') + user.profile_picture_url
            
    profile_data = {
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at.isoformat() if hasattr(user.created_at, 'isoformat') else str(user.created_at),
        "profile_picture_url": profile_picture_url
    }
    
    return jsonify(profile_data), 200

@user_bp.route('/settings', methods=['PUT'])
@token_required
def update_settings():
    """Update user settings."""
    user_id = request.user_id
    
    user = User.get_user_by_id(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    # Handle profile picture upload
    if 'profile_picture' in request.files:
        file = request.files['profile_picture']
        if file and allowed_file(file.filename):
            try:
                # Create uploads directory if it doesn't exist
                if not os.path.exists(app.config['UPLOAD_FOLDER']):
                    os.makedirs(app.config['UPLOAD_FOLDER'])
                    
                # Save file and update user's profile picture URL
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                user.profile_picture_url = f"/uploads/{filename}"
            except Exception as e:
                print(f"Error uploading profile picture: {str(e)}")  # Add logging
                return jsonify({"message": "Error uploading profile picture"}), 500

    # Update user information
    if 'username' in request.form:
        # Check if username is already taken
        if User.get_user_by_username(request.form['username']) and request.form['username'] != user.username:
            return jsonify({"message": "Username already taken"}), 400
        user.username = request.form['username']

    if 'email' in request.form:
        # Check if email is already registered
        if User.get_user_by_email(request.form['email']) and request.form['email'] != user.email:
            return jsonify({"message": "Email already registered"}), 400
        user.email = request.form['email']

    # Handle password change
    if 'new_password' in request.form:
        if not 'current_password' in request.form:
            return jsonify({"message": "Current password is required"}), 400
            
        if not user.check_password(request.form['current_password']):
            return jsonify({"message": "Current password is incorrect"}), 400
            
        user.set_password(request.form['new_password'])

    try:
        user.save()
        return jsonify({"message": "Settings updated successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Error updating settings"}), 500

def allowed_file(filename):
    """Check if the file extension is allowed."""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
