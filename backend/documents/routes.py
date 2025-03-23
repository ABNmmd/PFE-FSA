from flask import Blueprint, request, jsonify
from services.google_drive import GoogleDriveService
from user.models import User
from documents.models import Document
from services.database import get_db
from bson import ObjectId
from user.routes import token_required
import os

document_bp = Blueprint('document', __name__, url_prefix='/document')
db = get_db()

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx', 'pptx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@document_bp.route('/upload', methods=['POST'])
@token_required
def upload_document():
    user_id = request.user_id 
    file = request.files["file"]

    if not file:
        return jsonify({"message": "No file provided"}), 400

    if not allowed_file(file.filename):
        return jsonify({"message": "Invalid file type"}), 400

    user = User.get_user_by_id(user_id)
    if not user or not user.google_credentials:
        return jsonify({"message": "User not connected to Google Drive"}), 401

    try:
        with GoogleDriveService(user.google_credentials) as drive_service:
            file_id = drive_service.upload_file(file)
            document = Document(str(user.id), file.filename, file_id, file.filename.rsplit('.', 1)[1].lower())
            document.save()
            return jsonify({"message": "File uploaded", "file_id": file_id}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@document_bp.route('/list', methods=['GET'])
@token_required
def list_documents():
    user_id = request.user_id

    user = User.get_user_by_id(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    documents = Document.get_documents_by_user_id(str(user.id))
    return jsonify(documents), 200

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
        return jsonify({"message": str(e)}), 500
