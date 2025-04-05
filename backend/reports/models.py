from services.database import get_db
from datetime import datetime
from bson import ObjectId

db = get_db()

class PlagiarismReport:
    def __init__(self, document1, document2, taux_similarite_global, algorithme_utilise, sections_similaires, matched_content):
        self.document1 = document1
        self.document2 = document2
        self.taux_similarite_global = taux_similarite_global
        self.algorithme_utilise = algorithme_utilise
        self.sections_similaires = sections_similaires
        self.matched_content = matched_content
        self.date_generation = datetime.utcnow()

    def save(self):
        report_data = {
            "document1": self.document1,
            "document2": self.document2,
            "taux_similarite_global": self.taux_similarite_global,
            "algorithme_utilise": self.algorithme_utilise,
            "sections_similaires": self.sections_similaires,
            "matched_content": self.matched_content,
            "date_generation": self.date_generation
        }
        result = db.plagiarism_reports.insert_one(report_data)
        return str(result.inserted_id)

    @staticmethod
    def get_report_by_id(report_id):
        report = db.plagiarism_reports.find_one({"_id": ObjectId(report_id)})
        if report:
            report["_id"] = str(report["_id"])
        return report
