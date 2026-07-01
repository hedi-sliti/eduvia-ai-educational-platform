#!/usr/bin/env python3
"""Eduvia AI Chatbot Service Startup Script"""

import os
import sys
import platform
from pathlib import Path

import uvicorn


def main() -> None:
    """Start the FastAPI application."""

    project_root = Path(__file__).parent
    os.chdir(project_root)
    sys.path.insert(0, str(project_root))

    existing_pythonpath = os.environ.get("PYTHONPATH", "")
    if str(project_root) not in existing_pythonpath:
        os.environ["PYTHONPATH"] = str(project_root) + (
            os.pathsep + existing_pythonpath if existing_pythonpath else ""
        )

    # Warn if .env is missing
    env_file = project_root / ".env"
    if not env_file.exists():
        print("[warn] .env file not found. Using default configuration.")
        print("[hint] Copy .env.example to .env and configure your settings.")

    # Load environment variables
    from dotenv import load_dotenv

    load_dotenv()

    try:
        from app.main import app

        host = os.getenv("HOST", "0.0.0.0")
        port = int(os.getenv("PORT", "8000"))
        env = os.getenv("ENVIRONMENT", "development")
        reload = env == "development" and platform.system() != "Windows"

        print("[info] Starting Eduvia AI Chatbot Service...")
        print(f"[info] Server will run on http://{host}:{port}")
        print(f"[info] API Documentation: http://{host}:{port}/api/docs")
        print(f"[info] Reload: {'enabled' if reload else 'disabled'}")
        if env == "development" and platform.system() == "Windows":
            print(
                "[info] Reload disabled on Windows to avoid multiprocessing permission errors (WinError 5)."
            )

        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info",
        )
    except ImportError as exc:
        print(f"[error] Failed to import application: {exc}")
        print("[hint] Make sure all dependencies are installed: pip install -r requirements.txt")
        sys.exit(1)
    except Exception as exc:  # noqa: BLE001
        print(f"[error] Failed to start application: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
