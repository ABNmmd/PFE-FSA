from services.database import get_db
from datetime import datetime
from bson import ObjectId

db = get_db()

class PlagiarismReport:
    def __init__(self, document1, document2, global_similarity_rate, algorithm_used, similar_sections, date_generated=None):
        self.document1 = document1
        self.document2 = document2
        self.global_similarity_rate = global_similarity_rate
        self.algorithm_used = algorithm_used
        self.similar_sections = similar_sections
        self.date_generated = date_generated or datetime.utcnow()
        self.id = None

    @classmethod
    def from_dict(cls, data):
        report = cls(
            document1=data.get("document1"),
            document2=data.get("document2"),
            global_similarity_rate=data.get("global_similarity_rate"),
            algorithm_used=data.get("algorithm_used"),
            similar_sections=data.get("similar_sections", []),
            date_generated=data.get("date_generated")
        )
        report.id = str(data["_id"])
        return report

    def save(self):
        report_data = {
            "document1": self.document1,
            "document2": self.document2,
            "global_similarity_rate": self.global_similarity_rate,
            "algorithm_used": self.algorithm_used,
            "similar_sections": self.similar_sections,
            "date_generated": self.date_generated
        }
        result = db.plagiarism_reports.insert_one(report_data)
        self.id = str(result.inserted_id)
        return self.id

    @staticmethod
    def get_report_by_id(report_id):
        report = db.plagiarism_reports.find_one({"_id": ObjectId(report_id)})
        if report:
            return PlagiarismReport.from_dict(report)
        return None
