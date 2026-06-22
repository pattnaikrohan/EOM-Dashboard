"""
AAW EOM Review Agent — Flask Backend

Run with:  python main.py
"""
from flask import Flask, jsonify
from flask_cors import CORS
from app.api.routes import blueprint
from app.services.data_store import data_store
from app.services.blob_service import download_parsed_data

app = Flask(__name__)
CORS(app)

app.register_blueprint(blueprint, url_prefix='/api')

# Attempt to load persistent data from Azure Blob Storage on startup
try:
    print("Attempting to fetch parsed dashboard data from Azure Blob Storage...")
    persisted_data = download_parsed_data()
    if persisted_data:
        data_store.load(persisted_data)
        print(f"Successfully loaded {len(data_store.jobs)} jobs from blob storage.")
    else:
        print("No existing data found in blob storage.")
except Exception as e:
    print(f"Failed to load data from blob storage: {e}")

@app.route("/")
def root():
    return jsonify({
        "app": "AAW EOM Review Agent",
        "version": "1.0.0",
        "docs": "/docs",
    })

if __name__ == "__main__":
    app.run(port=8000, debug=True)
