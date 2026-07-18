from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.firebase_service import verify_token, get_user_role
from pydantic import BaseModel

security = HTTPBearer()

class CurrentUser(BaseModel):
    uid: str
    email: str
    role: str

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    token = credentials.credentials
    decoded_token = verify_token(token)
    
    if not decoded_token:
        print("Auth Error: Invalid token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    uid = decoded_token.get("uid")
    email = decoded_token.get("email", "")
    role = get_user_role(uid)
    return CurrentUser(uid=uid, email=email, role=role)

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            print(f"Auth Error: Role {current_user.role} not in {allowed_roles}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return current_user
    return role_checker
