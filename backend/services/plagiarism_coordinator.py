"""
Coordinator service that handles thread management for plagiarism detection tasks.
"""

import threading
from report.models import PlagiarismReport
from services.plagiarism_detection import PlagiarismDetectionService

def start_plagiarism_check_task(user_id, doc1_id, doc2_id, report_id, method="embeddings"):
    """Start a plagiarism check between two documents in a background thread."""
    thread = threading.Thread(
        target=process_plagiarism_check,
        args=(str(user_id), doc1_id, doc2_id, report_id, method)
    )
    thread.daemon = True
    thread.start()
    return thread

def process_plagiarism_check(user_id, doc1_id, doc2_id, report_id, method="embeddings"):
    """Process a plagiarism check between two documents."""
    try:
        print(f"\n[DEBUG] STARTING PLAGIARISM CHECK")
        print(f"[DEBUG] User ID: {user_id}")
        print(f"[DEBUG] Doc1 ID: {doc1_id}")
        print(f"[DEBUG] Doc2 ID: {doc2_id}")
        print(f"[DEBUG] Report ID: {report_id}")
        print(f"[DEBUG] Method: {method}")
        
        # Get report
        report = PlagiarismReport.get_by_id(report_id)
        if not report:
            return
        
        # Update status to processing
        report.update_status("processing")
        
        # Initialize detector and run comparison
        detector = PlagiarismDetectionService(method=method, debug=True)
        detector.process_comparison(user_id, doc1_id, doc2_id, report)
        
        print(f"\n[DEBUG] PLAGIARISM CHECK COMPLETE")
    except Exception as e:
        print(f"[DEBUG] ERROR in plagiarism check: {str(e)}")

def start_general_plagiarism_check(user_id, doc_id, report_id, sources=None, threshold=0.70, method="embeddings"):
    """Start a general plagiarism check against multiple sources."""
    thread = threading.Thread(
        target=process_general_plagiarism_check,
        args=(str(user_id), doc_id, report_id, sources, threshold, method)
    )
    thread.daemon = True
    thread.start()
    return thread

def process_general_plagiarism_check(user_id, doc_id, report_id, sources=None, threshold=0.70, method="embeddings"):
    """Process a general plagiarism check against multiple sources."""
    try:
        print(f"\n[DEBUG] STARTING GENERAL PLAGIARISM CHECK")
        print(f"[DEBUG] User ID: {user_id}")
        print(f"[DEBUG] Document ID: {doc_id}")
        print(f"[DEBUG] Report ID: {report_id}")
        print(f"[DEBUG] Sources: {sources}")
        print(f"[DEBUG] Threshold: {threshold}")
        print(f"[DEBUG] Method: {method}")
        
        if not sources:
            sources = ["user_documents", "web"]
        
        # Get report
        report = PlagiarismReport.get_by_id(report_id)
        if not report:
            print("[DEBUG] Report not found")
            return
        
        # Update status to processing
        report.update_status("processing")
        
        # Initialize detector and run document check
        detector = PlagiarismDetectionService(method=method, debug=True)
        detector.process_document_check(user_id, doc_id, report, threshold, sources, method)
        
        # Final update
        if report.status != "completed":
            report.status = "completed"
            report.save()
            
        print(f"[DEBUG] GENERAL PLAGIARISM CHECK COMPLETED")
        
    except Exception as e:
        print(f"[DEBUG] ERROR in general plagiarism check: {str(e)}")
        if report:
            report.update_status("failed")
