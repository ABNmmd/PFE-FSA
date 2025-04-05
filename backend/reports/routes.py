from flask import Blueprint, request, jsonify
from reports.models import PlagiarismReport
from user.routes import token_required

reports_bp = Blueprint('reports', __name__, url_prefix='/reports')

@reports_bp.route('/create', methods=['POST'])
@token_required
def create_plagiarism_report():
    data = request.get_json()

    document1 = data.get("document1")
    document2 = data.get("document2")
    taux_similarite_global = data.get("taux_similarite_global")
    algorithme_utilise = data.get("algorithme_utilise")
    sections_similaires = data.get("sections_similaires", [])
    matched_content = data.get("matched_content", [])

    if not document1 or not document2 or taux_similarite_global is None or not algorithme_utilise:
        return jsonify({"message": "Missing required fields"}), 400

    report = PlagiarismReport(
        document1=document1,
        document2=document2,
        taux_similarite_global=taux_similarite_global,
        algorithme_utilise=algorithme_utilise,
        sections_similaires=sections_similaires,
        matched_content=matched_content
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
        "_id": report["_id"],
        "date_generation": report["date_generation"].isoformat() + "Z",
        "document1": report["document1"],
        "document2": report["document2"],
        "taux_similarite_global": report["taux_similarite_global"],
        "algorithme_utilise": report["algorithme_utilise"],
        "sections_similaires": report["sections_similaires"],
        "matched_content": report["matched_content"]
    }

    return jsonify(formatted_report), 200
