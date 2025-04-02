from google_auth_oauthlib.flow import Flow
import os
import json
import requests
from flask import session
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials

load_dotenv()

# Construct an absolute path to the client secrets file
CLIENT_SECRETS_FILE = os.path.join(os.getcwd(), os.getenv("GOOGLE_CLIENT_SECRETS_FILE", "client_secret.json"))
SCOPES = [
    "https://www.googleapis.com/auth/drive.file", 
    "https://www.googleapis.com/auth/drive.metadata.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid"  # Add openid scope to match what Google returns
]
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

def get_google_flow():
    # Ensure the client secrets file exists
    if not os.path.exists(CLIENT_SECRETS_FILE):
        raise FileNotFoundError(f"Client secrets file not found: {CLIENT_SECRETS_FILE}")
    
    # Allow HTTP for localhost
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI
    )
    return flow

def get_google_user_email(access_token):
    if not access_token:
        return None
    try:
        response = requests.get("https://www.googleapis.com/oauth2/v1/userinfo",
                                headers={"Authorization": f"Bearer {access_token}"})
        response.raise_for_status()
        return response.json().get("email")
    except requests.exceptions.RequestException:
        return None
    except Exception:
        return None

def credentials_to_dict(credentials):
    return {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes
    }
