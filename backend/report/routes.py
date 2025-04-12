from flask import Blueprint, request, jsonify
from user.routes import token_required
from report.models import PlagiarismReport
from documents.models import Document
from user.models import User
from services.plagiarism_detection import PlagiarismDetectionService, start_plagiarism_check_task
from services.google_drive import GoogleDriveService
from bson import ObjectId
from datetime import datetime

report_bp = Blueprint('report', __name__, url_prefix='/report')

@report_bp.route('/compare', methods=['POST'])
@token_required
def compare_documents():
    """Initiate a plagiarism comparison between two documents."""
    user_id = request.user_id
    data = request.get_json()
    
    # Get document IDs
    doc1_id = data.get('doc1_id')
    doc2_id = data.get('doc2_id')
    
    # Get detection method (default to tfidf if not specified)
    detection_method = data.get('method', 'tfidf').lower()
    if detection_method not in ['tfidf', 'embeddings']:
        detection_method = 'tfidf'  # Fallback to default if invalid
    
    if not doc1_id or not doc2_id:
        return jsonify({"message": "Two document IDs are required"}), 400
    
    if doc1_id == doc2_id:
        return jsonify({"message": "Cannot compare a document with itself"}), 400
    
    # Get document info
    doc1 = Document.get_document_by_file_id(doc1_id)
    doc2 = Document.get_document_by_file_id(doc2_id)
    
    if not doc1 or not doc2:
        return jsonify({"message": "One or both documents not found"}), 404
    
    # Check if user owns the documents
    if doc1.get('user_id') != str(user_id) or doc2.get('user_id') != str(user_id):
        return jsonify({"message": "Access denied to one or both documents"}), 403
    
    try:
        # Get the user's Google credentials - use the correct method from User class
        user = User.get_user_by_id(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        if not hasattr(user, 'google_credentials') or not user.google_credentials:
            return jsonify({"message": "Google Drive not connected for this user"}), 400
            
        # Create a new report with nested document objects
        report = PlagiarismReport(
            user_id=str(user_id),
            document1={
                "id": doc1_id,
                "name": doc1.get('file_name'),
                "type": doc1.get('file_type', '')
            },
            document2={
                "id": doc2_id,
                "name": doc2.get('file_name'),
                "type": doc2.get('file_type', '')
            },
            status="pending",
            detection_method=detection_method  # Store the method used
        )
        
        # Save the report to get an ID
        report_id = report.save()
        
        # Start background processing with the specified method
        start_plagiarism_check_task(str(user_id), doc1_id, doc2_id, report_id, method=detection_method)
        
        # Return response with report ID
        return jsonify({
            "message": "Plagiarism check started",
            "report_id": report_id,
            "status": "pending",
            "method": detection_method
        }), 202  # 202 Accepted
        
    except Exception as e:
        return jsonify({"message": f"Error retrieving files: {str(e)}"}), 500

@report_bp.route('/list', methods=['GET'])
@token_required
def get_reports():
    """Get all plagiarism reports for the current user."""
    user_id = request.user_id
    
    # Get pagination parameters with proper fallbacks for 'undefined'
    try:
        page_param = request.args.get('page', '1')
        per_page_param = request.args.get('per_page', '10')
        
        # Check for undefined values and set defaults
        page = 1 if page_param == 'undefined' else int(page_param)
        per_page = 10 if per_page_param == 'undefined' else int(per_page_param)
    except (ValueError, TypeError):
        # If conversion to int fails, use defaults
        page = 1
        per_page = 10
    
    # Calculate offset
    offset = (page - 1) * per_page
    
    # Get reports with pagination
    reports = PlagiarismReport.get_by_user_id(str(user_id), limit=per_page, offset=offset)
    
    # Count total reports
    total_reports = len(PlagiarismReport.get_by_user_id(str(user_id)))
    
    reports_dict = [{
        "id": report.id,
        "document1": report.document1,
        "document2": report.document2,
        "similarity_score": report.similarity_score,
        "created_at": report.created_at.isoformat() if hasattr(report.created_at, 'isoformat') else report.created_at,
        "status": report.status
    } for report in reports]
    
    # Return paginated response
    return jsonify({
        "reports": reports_dict,
        "page": page,
        "per_page": per_page,
        "total": total_reports,
        "pages": (total_reports + per_page - 1) // per_page  # Calculate total pages
    }), 200

@report_bp.route('/<report_id>', methods=['GET'])
@token_required
def get_report(report_id):
    """Get a specific plagiarism report."""
    user_id = request.user_id
    
    # Validate report_id to avoid ObjectId errors
    if not report_id or report_id == 'undefined':
        return jsonify({"message": "Invalid report ID"}), 400
    
    try:
        # Get report
        report = PlagiarismReport.get_by_id(report_id)
        
        if not report:
            return jsonify({"message": "Report not found"}), 404
        
        # Check if user owns the report
        if report.user_id != str(user_id):
            return jsonify({"message": "Access denied"}), 403
        
        report_dict = {
            "id": report.id,
            "document1": report.document1,
            "document2": report.document2,
            "similarity_score": report.similarity_score,
            "created_at": report.created_at.isoformat() if hasattr(report.created_at, 'isoformat') else report.created_at,
            "status": report.status,
            "results": report.results
        }
        
        return jsonify(report_dict), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching report: {str(e)}"}), 500

@report_bp.route('/<report_id>', methods=['DELETE'])
@token_required
def delete_report(report_id):
    """Delete a plagiarism report."""
    user_id = request.user_id
    
    # Get report
    report = PlagiarismReport.get_by_id(report_id)
    
    if not report:
        return jsonify({"message": "Report not found"}), 404
    
    # Check if user owns the report
    if report.user_id != str(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    # Delete report
    success = PlagiarismReport.delete_by_id(report_id)
    
    if success:
        return jsonify({"message": "Report deleted successfully"}), 200
    else:
        return jsonify({"message": "Failed to delete report"}), 500

@report_bp.route('/document/<doc_id>', methods=['GET'])
@token_required
def get_document_reports(doc_id):
    """Get all plagiarism reports involving a specific document."""
    user_id = request.user_id
    
    # Get document
    doc = Document.get_document_by_file_id(doc_id)
    
    if not doc:
        return jsonify({"message": "Document not found"}), 404
    
    # Check if user owns the document
    if doc.get('user_id') != str(user_id):
        return jsonify({"message": "Access denied"}), 403
    
    # Get pagination parameters
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    
    # Calculate offset
    offset = (page - 1) * per_page
    
    # Get reports
    reports = PlagiarismReport.get_by_document_id(doc_id, limit=per_page, offset=offset)
    
    # Filter reports by user
    reports = [report for report in reports if report.user_id == str(user_id)]
    

    reports_dict = [{
        "id": report.id,
        "document1": report.document1,
        "document2": report.document2,
        "similarity_score": report.similarity_score,
        "created_at": report.created_at.isoformat() if hasattr(report.created_at, 'isoformat') else report.created_at,
        "status": report.status
    } for report in reports]
    
    return jsonify(reports_dict), 200
