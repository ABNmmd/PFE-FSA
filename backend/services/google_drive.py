from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
import io
import os
from datetime import datetime

class GoogleDriveService:
    def __init__(self, user_credentials):
        self.credentials = Credentials.from_authorized_user_info(user_credentials)
        self.drive_service = build("drive", "v3", credentials=self.credentials)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Clean up resources if needed
        pass

    def upload_file(self, file):
        """Upload a file to Google Drive and return additional metadata."""
        file_metadata = {
            "name": file.filename,
            "description": f"Uploaded via Plagiarism Detection App on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        }
        
        media = MediaIoBaseUpload(file.stream, mimetype=file.content_type)
        uploaded_file = self.drive_service.files().create(
            body=file_metadata, 
            media_body=media,
            fields="id,name,mimeType,size,createdTime"
        ).execute()

        return uploaded_file["id"]

    def list_files(self, page_size=10):
        """List files in Google Drive."""
        results = self.drive_service.files().list(pageSize=page_size, fields="files(id, name)").execute()
        files = results.get("files", [])

        return files

    def get_download_link(self, file_id):
        """Get the download link for a file in Google Drive."""
        file = self.drive_service.files().get(fileId=file_id, fields='webContentLink').execute()
        return file.get('webContentLink')

    def download_file(self, file_id):
        """Downloads a file from Google Drive."""
        request = self.drive_service.files().get_media(fileId=file_id)
        file = io.BytesIO()
        downloader = MediaIoBaseDownload(file, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            print(F'Download {int(status.progress() * 100)}.')

        file.seek(0)
        return file
