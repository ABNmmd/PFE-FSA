# document/models.py
from services.database import get_db
from bson import ObjectId

db = get_db()

class Document:
    def __init__(self, user_id, file_name, file_id, file_type):
        self.user_id = user_id
        self.file_name = file_name
        self.file_id = file_id
        self.file_type = file_type

    def save(self):
        document_data = {
            "user_id": self.user_id,
            "file_name": self.file_name,
            "file_id": self.file_id,
            "file_type": self.file_type
        }
        db.documents.insert_one(document_data)

    @staticmethod
    def get_documents_by_user_id(user_id):
        documents = db.documents.find({"user_id": user_id})
        return list(documents)
