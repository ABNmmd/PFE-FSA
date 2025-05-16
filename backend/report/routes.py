from flask import Blueprint, request, jsonify, make_response
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib.styles import getSampleStyleSheet
from user.routes import token_required
from report.models import PlagiarismReport
from documents.models import Document
from user.models import User
from services.plagiarism_detection import PlagiarismDetectionService
from services.plagiarism_coordinator import start_plagiarism_check_task, start_general_plagiarism_check
from services.google_drive import GoogleDriveService
from bson import ObjectId
from datetime import datetime
import json

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
        "name": getattr(report, "name", None),
        "document1": report.document1,
        "document2": getattr(report, "document2", None),
        "similarity_score": report.similarity_score,
        "created_at": report.created_at.isoformat() if hasattr(report.created_at, 'isoformat') else report.created_at,
        "status": report.status,
        "detection_method": getattr(report, "detection_method", None),
        "report_type": getattr(report, "report_type", None),
        "sources_checked": getattr(report, "sources_checked", []),
        "progress": getattr(report, "progress", None)
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
        # Check ownership
        if report.user_id != str(user_id):
            return jsonify({"message": "Access denied"}), 403
        # Convert report to dict for response
        data = report.to_dict()
        # Ensure created_at is serializable
        if hasattr(report.created_at, 'isoformat'):
            data['created_at'] = report.created_at.isoformat()
        # Return full report including general fields if present
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

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

@report_bp.route('/check', methods=['POST'])
@token_required
def check_document_plagiarism():
    """
    Check a single document for plagiarism against multiple sources.
    Sources can include: user's documents, web content, etc.
    """
    user_id = request.user_id
    
    # Get document ID and check options
    doc_id = request.json.get('document_id')
    sources = request.json.get('sources', ['user_documents', 'web'])
    sensitivity = request.json.get('sensitivity', 'medium')  # low, medium, high
    
    # Convert sensitivity to threshold
    sensitivity_thresholds = {
        'low': 0.55,      # Less sensitive - only catch very similar content
        'medium': 0.50,   # Default sensitivity
        'high': 0.40      # More sensitive - catch more potential matches
    }
    threshold = sensitivity_thresholds.get(sensitivity, 0.45)
    
    # Method selection based on sensitivity or explicitly provided
    method = request.json.get('method', 'embeddings')
    
    if not doc_id:
        return jsonify({"message": "Document ID is required"}), 400
    
    # Get document info
    document = Document.get_document_by_file_id(doc_id)
    if not document:
        return jsonify({"message": "Document not found"}), 404
    
    # Check if user owns the document
    if document.get('user_id') != str(user_id):
        return jsonify({"message": "Access denied to document"}), 403
    
    try:
        # Get user for Google credentials
        user = User.get_user_by_id(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        if not hasattr(user, 'google_credentials') or not user.google_credentials:
            return jsonify({"message": "Google Drive not connected for this user"}), 400
        
        # Create a new general plagiarism check report
        report = PlagiarismReport(
            user_id=str(user_id),
            document1={
                "id": doc_id,
                "name": document.get('file_name'),
                "type": document.get('file_type', '')
            },
            status="pending",
            detection_method=method,
            report_type="general",  # Mark as a general check
            check_options={
                "sources": sources,
                "sensitivity": sensitivity,
                "threshold": threshold
            }
        )
        
        # Save the report to get an ID
        report_id = report.save()
        
        # Start background processing
        start_general_plagiarism_check(
            str(user_id), 
            doc_id, 
            report_id, 
            sources=sources,
            threshold=threshold,
            method=method
        )
        
        # Return response with check ID
        return jsonify({
            "message": "Plagiarism check started",
            "report_id": report_id,
            "status": "pending",
            "sources": sources
        }), 202
        
    except Exception as e:
        return jsonify({"message": f"Error starting plagiarism check: {str(e)}"}), 500

@report_bp.route('/check/status/<report_id>', methods=['GET'])
@token_required
def check_plagiarism_status(report_id):
    """Get the status of an ongoing plagiarism check."""
    user_id = request.user_id
    
    try:
        report = PlagiarismReport.get_by_id(report_id)
        
        if not report:
            return jsonify({"message": "Report not found"}), 404
            
        if report.user_id != str(user_id):
            return jsonify({"message": "Access denied"}), 403
            
        # Return the current status and any partial results
        response = {
            "status": report.status,
            "progress": report.progress if hasattr(report, 'progress') else None,
            "created_at": report.created_at.isoformat() if hasattr(report.created_at, 'isoformat') else str(report.created_at)
        }
        
        # Include partial results if available
        if report.status in ["processing", "completed"]:
            response["partial_results"] = {
                "sources_checked": report.sources_checked if hasattr(report, 'sources_checked') else [],
                "similarity_score": report.similarity_score
            }
            
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({"message": f"Error checking status: {str(e)}"}), 500

@report_bp.route('/sources', methods=['GET'])
@token_required
def get_available_sources():
    """Get available plagiarism check sources for the current user."""
    user_id = request.user_id
    
    # Base sources available to all users
    sources = [
        {
            "id": "user_documents",
            "name": "Your Documents",
            "description": "Check against your own document library",
            "enabled": True
        },
        {
            "id": "web",
            "name": "Web Content",
            "description": "Check against web sources using Google Search API",
            "enabled": True
        },
        {
            "id": "academic",
            "name": "Academic Papers",
            "description": "Check against academic papers and journals",
            "enabled": True
        }
    ]
    
    return jsonify({"sources": sources}), 200

@report_bp.route('/<report_id>/download', methods=['GET'])
@token_required
def download_report(report_id):
    """Download a plagiarism report as PDF."""
    user_id = request.user_id
    try:
        report = PlagiarismReport.get_by_id(report_id)
        if not report:
            return jsonify({"message": "Report not found"}), 404
        if report.user_id != str(user_id):
            return jsonify({"message": "Access denied"}), 403
        # Prepare report data
        data = report.to_dict()
        if hasattr(report.created_at, 'isoformat'):
            data['created_at'] = report.created_at.isoformat()
        # Generate PDF with styled layout and header/footer
        from reportlab.lib import colors
        from reportlab.platypus import TableStyle, PageBreak, Paragraph as RLParagraph
        from reportlab.pdfgen import canvas as canvas_module
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                                rightMargin=40, leftMargin=40,
                                topMargin=60, bottomMargin=40)
        styles = getSampleStyleSheet()
        elements = []
        # Title
        elements.append(Paragraph(data.get('name','Plagiarism Report'), styles['Title']))
        elements.append(Spacer(1, 12))
        # Metadata
        meta_data = [
            ['Date', data.get('created_at')],
            ['Method', data.get('detection_method','').upper()],
            ['Overall Score', f"{(data.get('similarity_score') or 0):.2f}%"]
        ]
        meta_table = Table(meta_data, colWidths=[100, 360])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(1,0),colors.lightgrey),
            ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
            ('GRID',(0,0),(-1,-1),0.5,colors.grey)
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 20))
        # Matches section with paragraph layout and improved styling
        if data.get('report_type') == 'comparison':
            elements.append(Paragraph('Comparison Matches', styles['Heading2']))
            for idx, m in enumerate(data.get('results', {}).get('matches', []) or [], start=1):
                sim_pct = m.get('similarity', 0) * 100
                elements.append(Paragraph(f"Match {idx}: Similarity {(sim_pct):.2f}%", styles['Heading3']))
                elements.append(Paragraph('Document 1 Excerpt:', styles['Heading4']))
                elements.append(Paragraph(m.get('text1', m.get('text', '')), styles['Normal']))
                elements.append(Spacer(1, 6))
                elements.append(Paragraph('Document 2 Excerpt:', styles['Heading4']))
                elements.append(Paragraph(m.get('text2', m.get('text', '')), styles['Normal']))
                elements.append(Spacer(1, 12))
        else:
            elements.append(Paragraph('General Plagiarism Check Results', styles['Heading2']))
            for src in data.get('check_options', {}).get('sources', []):
                elements.append(Paragraph(f"Source: {src.title().replace('_',' ')}", styles['Heading3']))
                for idx, m in enumerate(data.get('source_results', {}).get(src, {}).get('matched_sources', []), start=1):
                    # similarity already in percentage (0-100)
                    sim_pct = m.get('similarity', 0)
                    elements.append(Paragraph(f"{idx}. {m.get('title', 'Untitled')} - {sim_pct:.2f}%", styles['Heading4']))
                    elements.append(Paragraph(m.get('url', ''), styles['Normal']))
                    elements.append(Spacer(1, 12))
        # Header/footer callback
        def _header_footer(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica-Bold',9)
            canvas.drawString(40, doc.pagesize[1]-45, data.get('name','Plagiarism Report'))
            page_num = canvas.getPageNumber()
            canvas.setFont('Helvetica',8)
            canvas.drawRightString(doc.pagesize[0]-40, 20, f"Page {page_num}")
            canvas.restoreState()
        # Build PDF
        doc.build(elements, onFirstPage=_header_footer, onLaterPages=_header_footer)
        pdf = buffer.getvalue()
        buffer.close()
        response = make_response(pdf)
        response.headers['Content-Disposition'] = f'attachment; filename={report.name}.pdf'
        response.mimetype = 'application/pdf'
        return response
    except Exception as e:
        return jsonify({"message": f"Error generating report: {str(e)}"}), 500
