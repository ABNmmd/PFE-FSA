# reports/models.py
from services.database import get_db
from bson import ObjectId

db = get_db()

class Report:
    def __init__(self, user_id, content):
        self.user_id = user_id
        self.content = content
        self.id = None

    def save(self):
        report_data = {
            "user_id": self.user_id,
            "content": self.content
        }
        result = db.reports.insert_one(report_data)
        self.id = result.inserted_id

    @staticmethod
    def get_report_by_id(report_id):
        report = db.reports.find_one({"_id": ObjectId(report_id)})
        if report:
            return Report(report['user_id'], report['content'])
        return None
