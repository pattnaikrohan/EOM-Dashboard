"""
AAW EOM Review Agent — Flask Backend

Run with:  python application.py
"""
import threading
from flask import Flask, jsonify
from flask_cors import CORS
from app.api.routes import blueprint
from app.services.data_store import data_store
from app.services.blob_service import download_parsed_data, download_neg_movement_comments
from app.services.neg_movement_store import neg_movement_store

app = Flask(__name__)
CORS(app)

app.register_blueprint(blueprint, url_prefix='/api')

def init_data():
    try:
        print("Attempting to fetch parsed dashboard data from Azure Blob Storage...")
        persisted_data = download_parsed_data()
        if persisted_data:
            data_store.load(persisted_data)
            neg_movement_store.populate_from_snowflake(data_store.jobs, data_store.branch, data_store.period)
            print(f"Successfully loaded {len(data_store.jobs)} live jobs from Snowflake into Negative Movement.")
        else:
            print("No existing data found in blob storage.")
    except Exception as e:
        print(f"Failed to load data from blob storage: {e}")

    try:
        neg_comments = download_neg_movement_comments()
        if neg_comments:
            neg_movement_store.load_comments(neg_comments)
            print("Successfully loaded negative movement comments.")
    except Exception as e:
        print(f"Failed to load negative movement comments: {e}")

# Launch data initialization in background thread so Flask binds instantly
threading.Thread(target=init_data, daemon=True).start()

@app.route("/")
def root():
    return jsonify({
        "app": "AAW EOM Review Agent",
        "version": "1.0.0",
        "docs": "/docs",
    })

if __name__ == "__main__":
    app.run(port=8000, debug=True, use_reloader=False)
