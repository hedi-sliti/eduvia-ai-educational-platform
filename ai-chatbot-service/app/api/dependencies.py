from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

# Simple token-based authentication (for demo purposes)
# In production, use proper JWT or OAuth2
security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Get current user from token (simplified for demo)."""
    # For now, just return a mock user ID
    # In production, validate JWT token here
    if credentials:
        # Mock user extraction from token
        return {"user_id": "demo-user", "email": "demo@esprit.tn"}
    return {"user_id": "anonymous", "email": "anonymous@esprit.tn"}
