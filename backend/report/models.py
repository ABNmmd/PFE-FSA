from services.database import get_db
from bson import ObjectId
from datetime import datetime

db = get_db()

class PlagiarismReport:
    """Model for storing plagiarism detection reports."""
    
    def __init__(self, user_id, document1=None, document2=None, 
                 similarity_score=None, created_at=None, status="pending", report_id=None,
                 detection_method="tfidf", report_type="comparison", check_options=None, name=None):
        """
        Initialize a new plagiarism report.
        
        Args:
            document1: Main document being checked (always required)
            document2: Secondary document for comparison (only for "comparison" type)
            report_type: "comparison" (doc vs doc) or "general" (doc vs sources)
        """
        self.id = report_id
        self.user_id = user_id
        self.document1 = document1  # Main document (required for all report types)
        self.document2 = document2  # Only used for comparison reports
        self.similarity_score = similarity_score
        self.created_at = created_at or datetime.now()
        self.status = status
        self.results = None
        self.matched_content = []  # Store all matches
        self.detection_method = detection_method
        self.report_type = report_type  # "comparison" or "general"
        
        # Auto-generate a name if not provided
        if name:
            self.name = name
        else:
            # Generate name based on report type and documents
            date_str = self.created_at.strftime("%d/%m/%Y")
            doc1_name = document1.get('name', 'Unknown') if document1 else 'Unknown'
            
            if report_type == "comparison" and document2:
                doc2_name = document2.get('name', 'Unknown')
                self.name = f"Comparison: {doc1_name} vs {doc2_name} ({date_str})"
            else:
                self.name = f"Check: {doc1_name} ({date_str})"
        
        # For general reports only
        if report_type == "general":
            self.check_options = check_options or {}
            self.sources_checked = []
            self.progress = 0
            self.source_results = {}
        else:
            # For comparison reports, we still initialize these to empty values
            # but they won't be used (document2 is used instead)
            self.check_options = {}
            self.sources_checked = []
            self.progress = 0
            self.source_results = {}
    
    def to_dict(self):
        """Convert report to dictionary."""
        # Common fields for all report types
        data = {
            "user_id": self.user_id,
            "document1": self.document1,
            "similarity_score": self.similarity_score,
            "created_at": self.created_at,
            "status": self.status,
            "matched_content": self.matched_content,
            "detection_method": self.detection_method,
            "results": self.results,
            "report_type": self.report_type,
            "name": self.name
        }
        
        # Add document2 only for comparison reports
        if self.report_type == "comparison":
            data["document2"] = self.document2
        # Add general check specific fields for general reports
        elif self.report_type == "general":
            data.update({
                "check_options": self.check_options,
                "sources_checked": self.sources_checked,
                "progress": self.progress,
                "source_results": self.source_results
            })
        
        return data
    
    @classmethod
    def from_dict(cls, data):
        """Create report from dictionary."""
        report_type = data.get("report_type", "comparison")
        
        report = cls(
            user_id=data["user_id"],
            document1=data.get("document1"),
            document2=data.get("document2") if report_type == "comparison" else None,
            similarity_score=data.get("similarity_score"),
            created_at=data.get("created_at"),
            status=data.get("status", "pending"),
            report_id=str(data["_id"]) if "_id" in data else None,
            detection_method=data.get("detection_method", "tfidf"),
            report_type=report_type,
            check_options=data.get("check_options", {}) if report_type == "general" else {},
            name=data.get("name")
        )
        
        report.results = data.get("results")
        report.matched_content = data.get("matched_content", [])
        
        # Load general check specific fields only for general reports
        if report_type == "general":
            report.sources_checked = data.get("sources_checked", [])
            report.progress = data.get("progress", 0)
            report.source_results = data.get("source_results", {})
        
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
    
    def update_source_result(self, source, result):
        """Update results for a specific source in a general plagiarism check."""
        # Only applicable for general reports
        if self.report_type != "general":
            print(f"Warning: Trying to update source result for a {self.report_type} report")
            return self.id
            
        # Update source results
        self.source_results[source] = result
        
        # Mark source as checked if not already
        if source not in self.sources_checked:
            self.sources_checked.append(source)
        
        # Calculate overall progress
        if 'sources' in self.check_options:
            total_sources = len(self.check_options['sources'])
            self.progress = (len(self.sources_checked) / total_sources) * 100
        else:
            self.progress = (len(self.sources_checked) / len(['user_documents'])) * 100
        
        # Calculate overall similarity score as highest score found
        if self.source_results:
            scores = [src_result.get('similarity_score', 0) for src_result in self.source_results.values()]
            self.similarity_score = max(scores) if scores else 0
        
        # Update status if all sources checked
        if 'sources' in self.check_options:
            if set(self.sources_checked) == set(self.check_options['sources']):
                self.status = "completed"
        
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
    def get_general_by_user_id(user_id, limit=None, offset=None):
        """Get all general plagiarism check reports for a specific user."""
        query = db.plagiarism_reports.find({
            "user_id": user_id,
            "report_type": "general"
        }).sort("created_at", -1)
        
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
