# document/models.py
from services.database import get_db
from bson import ObjectId
from datetime import datetime

db = get_db()

class Document:
    def __init__(self, user_id, file_name, file_id, file_type, uploaded_at=None, file_size=None, mime_type=None, description=None):
        self.user_id = user_id
        self.file_name = file_name
        self.file_id = file_id
        self.file_type = file_type
        self.uploaded_at = uploaded_at or datetime.now()
        self.file_size = file_size
        self.mime_type = mime_type
        self.description = description

    def save(self):
        document_data = {
            "user_id": self.user_id,
            "file_name": self.file_name,
            "file_id": self.file_id,
            "file_type": self.file_type,
            "uploaded_at": self.uploaded_at,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "description": self.description
        }
        result = db.documents.insert_one(document_data)
        return str(result.inserted_id)

    @staticmethod
    def get_documents_by_user_id(user_id):
        documents = db.documents.find({"user_id": user_id})
        return list(documents)
        
    @staticmethod
    def get_document_by_id(document_id):
        document = db.documents.find_one({"_id": ObjectId(document_id)})
        return document

    @staticmethod
    def get_document_by_file_id(file_id):
        document = db.documents.find_one({"file_id": file_id})
        return document

    @staticmethod
    def delete_document_by_file_id(file_id):
        result = db.documents.delete_one({"file_id": file_id})
        return result.deleted_count > 0
