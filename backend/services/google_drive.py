from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.http import MediaIoBaseUpload
import io

def upload_file(user_credentials, file):
    """Upload a file to Google Drive."""
    credentials = Credentials.from_authorized_user_info(user_credentials)
    drive_service = build("drive", "v3", credentials=credentials)

    file_metadata = {"name": file.filename}
    media = MediaIoBaseUpload(file.stream, mimetype=file.content_type)
    uploaded_file = drive_service.files().create(body=file_metadata, media_body=media, fields="id").execute()

    return uploaded_file["id"]


def list_files(user_credentials):
    """List files in Google Drive."""
    credentials = Credentials.from_authorized_user_info(user_credentials)
    drive_service = build("drive", "v3", credentials=credentials)

    results = drive_service.files().list(pageSize=10, fields="files(id, name)").execute()
    files = results.get("files", [])

    return files
