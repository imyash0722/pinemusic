#!/usr/bin/env python3
import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn
from app.config import get_config

if __name__ == "__main__":
    cfg = get_config()
    uvicorn.run("app.main:app", host=cfg["host"], port=cfg["port"], reload=False)
