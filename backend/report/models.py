from services.database import get_db
from bson import ObjectId
from datetime import datetime

db = get_db()

class PlagiarismReport:
    """Model for storing plagiarism detection reports."""
    
    def __init__(self, user_id, document1=None, document2=None, 
                 similarity_score=None, created_at=None, status="pending", report_id=None,
                 detection_method="tfidf"):
        """Initialize a new plagiarism report with nested document objects."""
        self.id = report_id
        self.user_id = user_id
        self.document1 = document1  # Nested document object {id, name, type}
        self.document2 = document2  # Nested document object {id, name, type}
        self.similarity_score = similarity_score
        self.created_at = created_at or datetime.now()
        self.status = status
        self.results = None
        self.matched_content = []  # Store all matches
        self.detection_method = detection_method
    
    def to_dict(self):
        """Convert report to dictionary."""
        return {
            "user_id": self.user_id,
            "document1": self.document1,
            "document2": self.document2,
            "similarity_score": self.similarity_score,
            "created_at": self.created_at,
            "status": self.status,
            "matched_content": self.matched_content,
            "detection_method": self.detection_method,
            "results": self.results
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create report from dictionary."""
        report = cls(
            user_id=data["user_id"],
            document1=data.get("document1"),
            document2=data.get("document2"),
            similarity_score=data.get("similarity_score"),
            created_at=data.get("created_at"),
            status=data.get("status", "pending"),
            report_id=str(data["_id"]) if "_id" in data else None,
            detection_method=data.get("detection_method", "tfidf")
        )
        report.results = data.get("results")
        report.matched_content = data.get("matched_content", [])
        return report
    
    def save(self):
        """Save the report to the database."""
        report_data = self.to_dict()
        
        if self.id:
            # Update existing report
            result = db.plagiarism_reports.update_one(
                {"_id": ObjectId(self.id)},
                {"$set": report_data}
            )
            return self.id
        else:
            # Insert new report
            result = db.plagiarism_reports.insert_one(report_data)
            self.id = str(result.inserted_id)
            return self.id
    
    def update_results(self, results):
        """Update the report with detection results."""
        self.results = results
        if "similarity_scores" in results:
            self.similarity_score = results["similarity_scores"]["percentage"]
        
        # Extract ALL matched content from results
        if "matches" in results:
            self.matched_content = [
                {
                    "text1": match.get("text1", ""),
                    "text2": match.get("text2", ""),
                    "similarity": match.get("similarity", 0),
                    "position1": match.get("position1", 0),
                    "position2": match.get("position2", 0)
                }
                for match in results["matches"]
            ]
        
        self.status = "completed"
        return self.save()
    
    def update_status(self, status):
        """Update the report status."""
        self.status = status
        return self.save()
    
    @staticmethod
    def get_by_id(report_id):
        """Get a report by its ID."""
        report_data = db.plagiarism_reports.find_one({"_id": ObjectId(report_id)})
        if not report_data:
            return None
        
        return PlagiarismReport.from_dict(report_data)
    
    @staticmethod
    def get_by_user_id(user_id, limit=None, offset=None):
        """Get all reports for a specific user."""
        query = db.plagiarism_reports.find({"user_id": user_id}).sort("created_at", -1)
        
        if offset:
            query = query.skip(offset)
        if limit:
            query = query.limit(limit)
            
        reports_data = list(query)
        return [PlagiarismReport.from_dict(report) for report in reports_data]
    
    @staticmethod
    def get_by_document_id(doc_id, limit=None, offset=None):
        """Get all reports involving a specific document."""
        query = db.plagiarism_reports.find(
            {"$or": [{"document1.id": doc_id}, {"document2.id": doc_id}]}
        ).sort("created_at", -1)
        
        if offset:
            query = query.skip(offset)
        if limit:
            query = query.limit(limit)
            
        reports_data = list(query)
        return [PlagiarismReport.from_dict(report) for report in reports_data]
    
    @staticmethod
    def delete_by_id(report_id):
        """Delete a report by its ID."""
        result = db.plagiarism_reports.delete_one({"_id": ObjectId(report_id)})
        return result.deleted_count > 0
