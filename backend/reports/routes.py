from flask import Blueprint, request, jsonify
from reports.models import PlagiarismReport
from user.routes import token_required

reports_bp = Blueprint('reports', __name__, url_prefix='/reports')

@reports_bp.route('/', methods=['POST'])
@token_required
def create_plagiarism_report():
    data = request.get_json()

    document1 = data.get("document1")
    document2 = data.get("document2")
    global_similarity_rate = data.get("global_similarity_rate")
    algorithm_used = data.get("algorithm_used")
    similar_sections = data.get("similar_sections", [])

    if not document1 or not document2 or global_similarity_rate is None or not algorithm_used:
        return jsonify({"message": "Missing required fields"}), 400

    report = PlagiarismReport(
        document1=document1,
        document2=document2,
        global_similarity_rate=global_similarity_rate,
        algorithm_used=algorithm_used,
        similar_sections=similar_sections
    )
    report_id = report.save()

    return jsonify({"message": "Plagiarism report created successfully", "report_id": report_id}), 201

@reports_bp.route('/<report_id>', methods=['GET'])
@token_required
def get_plagiarism_report(report_id):
    report = PlagiarismReport.get_report_by_id(report_id)
    if not report:
        return jsonify({"message": "Report not found"}), 404

    formatted_report = {
        "_id": report.id,
        "date_generated": report.date_generated.isoformat() + "Z",
        "document1": report.document1,
        "document2": report.document2,
        "global_similarity_rate": report.global_similarity_rate,
        "algorithm_used": report.algorithm_used,
        "similar_sections": report.similar_sections,
    }

    return jsonify(formatted_report), 200
