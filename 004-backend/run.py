"""
APM Backend — Entry Point
Run with: python run.py
"""
from app import create_app

app = create_app()

if __name__ == '__main__':
    print("=" * 50)
    print("  APM Backend Server")
    print("  http://localhost:5000")
    print("  Health: http://localhost:5000/health")
    print("=" * 50)
    app.run(debug=True, port=5000, threaded=True)
