from flask import Blueprint, request, jsonify
from reports.models import Report
from services.database import get_db
from user.routes import token_required

report_bp = Blueprint('report', __name__, url_prefix='/report')
db = get_db()

@report_bp.route('/generate', methods=['POST'])
@token_required
def generate_report():
    user_id = request.user_id
    data = request.get_json()

    report_content = process_report(data)

    report = Report(user_id=user_id, content=report_content)
    report.save()

    return jsonify({"message": "Report generated successfully", "report_id": str(report.id)}), 201

@report_bp.route('/<report_id>', methods=['GET'])
@token_required
def get_report(report_id):
    user_id = request.user_id

    report = Report.get_report_by_id(report_id)
    if not report or report.user_id != user_id:
        return jsonify({"message": "Report not found"}), 404

    return jsonify({"report": report.content}), 200

def process_report(data):
    # Implement your report processing logic here
    report_content = "Processed report content based on the provided data"
    return report_content