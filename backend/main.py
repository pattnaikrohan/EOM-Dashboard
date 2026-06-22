"""
AAW EOM Review Agent — Flask Backend

Run with:  python main.py
"""
from flask import Flask, jsonify
from flask_cors import CORS
from app.api.routes import blueprint

app = Flask(__name__)
CORS(app)

app.register_blueprint(blueprint, url_prefix='/api')

@app.route("/")
def root():
    return jsonify({
        "app": "AAW EOM Review Agent",
        "version": "1.0.0",
        "docs": "/docs",
    })

if __name__ == "__main__":
    app.run(port=8000, debug=True)
