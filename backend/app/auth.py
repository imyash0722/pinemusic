import time
import hmac
import hashlib
import json
import base64
import requests
from typing import Optional, Dict, Any
from app.config import get_config

JWT_SECRET = "pinemusic_secret_salt_2507"

def create_jwt(payload: Dict[str, Any], exp_hours: int = 72) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = payload.copy()
    payload["exp"] = int(time.time()) + (exp_hours * 3600)
    
    b64_header = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    b64_payload = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    
    sig = hmac.new(JWT_SECRET.encode(), f"{b64_header}.{b64_payload}".encode(), hashlib.sha256).digest()
    b64_sig = base64.urlsafe_b64encode(sig).decode().rstrip("=")
    return f"{b64_header}.{b64_payload}.{b64_sig}"

def verify_jwt(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        
        # Verify sig
        expected_sig = hmac.new(JWT_SECRET.encode(), f"{header_b64}.{payload_b64}".encode(), hashlib.sha256).digest()
        calc_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")
        if not hmac.compare_digest(sig_b64, calc_sig_b64):
            return None
            
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def verify_navidrome_auth(username: str, password: str) -> Optional[Dict[str, Any]]:
    cfg = get_config()
    nav_url = cfg["navidrome_url"].rstrip("/")
    ping_url = f"{nav_url}/rest/ping.view"
    params = {
        "u": username,
        "p": password,
        "v": "1.16.1",
        "c": "pinemusic",
        "f": "json"
    }
    try:
        res = requests.get(ping_url, params=params, timeout=8)
        if res.status_code == 200:
            data = res.json().get("subsonic-response", {})
            if data.get("status") == "ok":
                # Check admin status
                is_admin = False
                try:
                    user_url = f"{nav_url}/rest/getUser.view"
                    user_params = params.copy()
                    user_params["username"] = username
                    u_res = requests.get(user_url, params=user_params, timeout=6)
                    if u_res.status_code == 200:
                        u_data = u_res.json().get("subsonic-response", {}).get("user", {})
                        is_admin = bool(u_data.get("adminRole", False))
                except Exception:
                    pass
                # Server admin credentials from config automatically get admin
                if username == cfg.get("navidrome_user"):
                    is_admin = True
                return {
                    "username": username,
                    "role": "admin" if is_admin else "user",
                    "navidrome_authenticated": True
                }
    except Exception as e:
        print(f"[Auth] Navidrome check failed: {e}")
    return None
