from services.database import get_db
from flask import jsonify
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from bson import ObjectId

db = get_db()

class User:
    def __init__(self, username, email, password, google_credentials=None):
        self.username = username
        self.email = email
        self.password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        self.id = None
        self.google_credentials = google_credentials

    @classmethod
    def from_dict(cls, data):
        user = cls(data['username'], data['email'], data['password'], data.get('google_credentials'))
        user.id = str(data['_id'])
        user.password = data['password']
        return user

    def save(self):
        user_data = {
            "username": self.username,
            "email": self.email,
            "password": self.password,
            "google_credentials": self.google_credentials
        }
        result = db.users.insert_one(user_data)
        self.id = result.inserted_id

    def update_google_credentials(self, google_credentials):
        self.google_credentials = google_credentials
        db.users.update_one({"_id": ObjectId(self.id)}, {"$set": {"google_credentials": google_credentials}})

    def generate_token(self):
        payload = {
            'user_id': str(self.id),
            'exp': datetime.utcnow() + timedelta(days=1)  # Token expires in 1 day
        }
        token = jwt.encode(payload, os.getenv("SECRET_KEY"), algorithm="HS256")
        return token

    @staticmethod
    def get_user_by_email(email):
        user = db.users.find_one({"email": email})
        if user:
            user_obj = User.from_dict(user)
            return user_obj
        return None

    @staticmethod
    def get_user_by_username(username):
        user = db.users.find_one({"username": username})
        if user:
            user_obj = User.from_dict(user)
            return user_obj
        return None

    @staticmethod
    def get_user_by_id(user_id):
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user_obj = User.from_dict(user)
            return user_obj
        return None

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))

    def __repr__(self):
        return f"User(username='{self.username}', email='{self.email}', id='{self.id}')"
