from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import init_db

# Import blueprints
from routes.auth import auth_bp
from routes.study import study_bp
from routes.pomodoro import pomodoro_bp
from routes.ai_tutor import ai_tutor_bp
from routes.classroom import classroom_bp
from routes.meet import meet_bp
from routes.flashcards import flashcards_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend
    CORS(app, supports_credentials=True)

    # Initialize JWT
    jwt = JWTManager(app)

    # Initialize Database
    init_db(app)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(study_bp, url_prefix='/api/study')
    app.register_blueprint(pomodoro_bp, url_prefix='/api/pomodoro')
    app.register_blueprint(ai_tutor_bp, url_prefix='/api/ai')
    app.register_blueprint(classroom_bp, url_prefix='/api/classroom')
    app.register_blueprint(meet_bp, url_prefix='/api/meet')
    app.register_blueprint(flashcards_bp, url_prefix='/api/flashcards')

    @app.route('/health')
    def health_check():
        return jsonify({"status": "ok", "message": "StudyAI Planner backend is running."})

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
