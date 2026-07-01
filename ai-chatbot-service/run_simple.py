#!/usr/bin/env python3
"""
Simple startup script for Eduvia AI Chatbot Service
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add app directory to Python path
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

def main():
    """Main function to start the FastAPI application."""
    
    # Check if .env file exists
    env_file = Path(__file__).parent / ".env"
    if not env_file.exists():
        print("WARNING: .env file not found. Using default configuration.")
        print("Copy .env.example to .env and configure your settings.")
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Import app after loading environment
    try:
        from app.main import app
        print("Starting Eduvia AI Chatbot Service...")
        
        # Get configuration
        host = os.getenv("HOST", "0.0.0.0")
        port = int(os.getenv("PORT", "8000"))
        reload = os.getenv("ENVIRONMENT", "development") == "development"
        
        print(f"Server will run on http://{host}:{port}")
        print(f"API Documentation: http://{host}:{port}/api/docs")
        print(f"Reload: {'enabled' if reload else 'disabled'}")
        
        # Start the server
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info"
        )
        
    except ImportError as e:
        print(f"Failed to import application: {e}")
        print("Make sure all dependencies are installed: pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"Failed to start application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
