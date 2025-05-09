from flask import Blueprint, request, jsonify, send_file
from services.google_drive import GoogleDriveService
from user.models import User
from documents.models import Document
from services.database import get_db
from bson import ObjectId
from user.routes import token_required
import os
from datetime import datetime

document_bp = Blueprint('document', __name__, url_prefix='/document')
db = get_db()

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx', 'pptx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@document_bp.route('/upload', methods=['POST'])
@token_required
def upload_document():
    user_id = request.user_id 
    
    if 'file' not in request.files:
        return jsonify({"message": "No file part in the request"}), 400
    
    file = request.files["file"]

    if not file or file.filename == '':
        return jsonify({"message": "No file provided"}), 400

    if not allowed_file(file.filename):
        return jsonify({"message": "Invalid file type"}), 400

    user = User.get_user_by_id(user_id)
    if not user or not user.google_credentials:
        return jsonify({"message": "User not connected to Google Drive"}), 401

    try:
        # Get file size by reading the file content and getting its length
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset file pointer to the beginning
        
        with GoogleDriveService(user.google_credentials) as drive_service:
            file_id = drive_service.upload_file(file)
            
            # Get file type and mime type
            file_type = file.filename.rsplit('.', 1)[1].lower()
            mime_type = file.content_type if hasattr(file, 'content_type') else None
            
            # Create description (optional)
            description = f"Uploaded on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            
            document = Document(
                user_id=str(user.id),
                file_name=file.filename,
                file_id=file_id,
                file_type=file_type,
                uploaded_at=datetime.now(),
                file_size=file_size,
                mime_type=mime_type,
                description=description
            )
            document.save()
            
            return jsonify({
                "message": "File uploaded successfully",
                "file_id": file_id,
                "file_name": file.filename,
                "file_size": file_size,
                "file_type": file_type,
                "uploaded_at": str(document.uploaded_at)
            }), 200
    except Exception as e:
        return jsonify({"message": f"Error uploading file: {str(e)}"}), 500

@document_bp.route('/list', methods=['GET'])
@token_required
def list_documents():
    user_id = request.user_id

    user = User.get_user_by_id(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    try:
        documents = Document.get_documents_by_user_id(str(user.id))
        
        # Convert ObjectId to string for JSON serialization
        for doc in documents:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])
                
        return jsonify(documents), 200
    except Exception as e:
        return jsonify({"message": f"Error listing documents: {str(e)}"}), 500

@document_bp.route('/drive/list', methods=['GET'])
@token_required
def list_drive_documents():
    user_id = request.user_id

    user = User.get_user_by_id(user_id)
    if not user or not user.google_credentials:
        return jsonify({"message": "User not connected to Google Drive"}), 401

    try:
        with GoogleDriveService(user.google_credentials) as drive_service:
            files = drive_service.list_files()
            return jsonify(files), 200
    except Exception as e:
        return jsonify({"message": f"Error listing Google Drive files: {str(e)}"}), 500

@document_bp.route('/download/<file_id>', methods=['GET'])
@token_required
def download_document(file_id):
    user_id = request.user_id

    user = User.get_user_by_id(user_id)
    if not user or not user.google_credentials:
        return jsonify({"message": "User not connected to Google Drive"}), 401

    # Get document info from the database
    document = Document.get_document_by_file_id(file_id)
    if not document:
        return jsonify({"message": "Document not found"}), 404

    # Check if the document belongs to the user
    if document.get('user_id') != str(user.id):
        return jsonify({"message": "Access denied"}), 403

    try:
        with GoogleDriveService(user.google_credentials) as drive_service:
            # Download the file directly rather than returning a URL
            file_content = drive_service.download_file(file_id)
            file_name = document.get('file_name', 'downloaded_file')
            
            # Use Flask's send_file to return the file directly to the client
            return send_file(
                file_content,
                as_attachment=True,
                download_name=file_name,
                mimetype=document.get('mime_type', 'application/octet-stream')
            )
    except Exception as e:
        return jsonify({"message": f"Error downloading file: {str(e)}"}), 500

@document_bp.route('/content/<file_id>', methods=['GET'])
@token_required
def get_document_content(file_id):
    user_id = request.user_id

    user = User.get_user_by_id(user_id)
    if not user or not user.google_credentials:
        return jsonify({"message": "User not connected to Google Drive"}), 401

    # Get document info from the database
    document = Document.get_document_by_file_id(file_id)
    if not document:
        return jsonify({"message": "Document not found"}), 404

    # Check if the document belongs to the user
    if document.get('user_id') != str(user.id):
        return jsonify({"message": "Access denied"}), 403

    # For text, return content; otherwise return direct link for preview
    file_type = document.get('file_type')
    with GoogleDriveService(user.google_credentials) as drive_service:
        if file_type == 'txt':
            # Download and return raw text content
            file_stream = drive_service.download_file(file_id)
            content = file_stream.read().decode('utf-8')
            return jsonify({"content": content}), 200
        # For other supported types, make publicly viewable then return preview URL
        try:
            # Grant view permission to anyone with the link
            drive_service.drive_service.permissions().create(
                fileId=file_id,
                body={'type': 'anyone', 'role': 'reader'}
            ).execute()
            preview_url = drive_service.get_download_link(file_id)
            return jsonify({"url": preview_url}), 200
        except Exception:
            return jsonify({"message": "Preview not available for this file type"}), 400

@document_bp.route('/<file_id>', methods=['DELETE'])
@token_required
def delete_document(file_id):
    user_id = request.user_id

    user = User.get_user_by_id(user_id)
    if not user or not user.google_credentials:
        return jsonify({"message": "User not connected to Google Drive"}), 401

    # Get document info from the database
    document = Document.get_document_by_file_id(file_id)
    if not document:
        return jsonify({"message": "Document not found"}), 404

    # Check if the document belongs to the user
    if document.get('user_id') != str(user.id):
        return jsonify({"message": "Access denied"}), 403

    try:
        with GoogleDriveService(user.google_credentials) as drive_service:
            # Delete file from Google Drive
            drive_service.delete_file(file_id)
            
            # Delete document record from database
            Document.delete_document_by_file_id(file_id)
            
            return jsonify({"message": "Document deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": f"Error deleting file: {str(e)}"}), 500
