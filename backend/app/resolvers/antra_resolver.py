import os
import time
import zipfile
import shutil
import requests
import asyncio
from typing import Dict, Any, List, Optional
from app.config import get_config
from app.resolvers.base import TrackItem, PlaylistOrAlbum

class AntraResolver:
    def __init__(self):
        self.cfg = get_config()
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        })
        self.logged_in = False

    def login(self) -> bool:
        url = f"{self.cfg['antra_url']}/api/auth/login"
        payload = {"username": self.cfg["antra_user"], "password": self.cfg["antra_pass"]}
        try:
            res = self.session.post(url, json=payload, timeout=15)
            if res.status_code == 200:
                self.logged_in = True
                return True
        except Exception as e:
            print(f"[Antra] Login error: {e}")
        return False

    def ensure_login(self):
        if not self.logged_in:
            self.login()

    def resolve(self, url: str, fmt: str = "lossless-16") -> Dict[str, Any]:
        self.ensure_login()
        endpoint = f"{self.cfg['antra_url']}/api/resolve"
        res = self.session.post(endpoint, json={"url": url, "format": fmt}, timeout=45)
        if res.status_code == 401:
            self.login()
            res = self.session.post(endpoint, json={"url": url, "format": fmt}, timeout=45)
        if res.status_code != 200:
            raise RuntimeError(f"Antra resolve error: {res.status_code} - {res.text}")
        return res.json()

    def create_job(self, url: str, fmt: str, start_idx: int, end_idx: int) -> Dict[str, Any]:
        self.ensure_login()
        endpoint = f"{self.cfg['antra_url']}/api/jobs"
        payload = {
            "url": url,
            "format": fmt,
            "start_index": start_idx,
            "end_index": end_idx,
            "client_packaging": False
        }
        res = self.session.post(endpoint, json=payload, timeout=30)
        if res.status_code in (200, 201):
            return res.json()
        raise RuntimeError(f"Antra create_job error: {res.status_code} {res.text}")

    def download_and_extract(self, job_id: str, extract_dir: str, max_wait_sec: int = 300) -> List[str]:
        self.ensure_login()
        dl_url = f"{self.cfg['antra_url']}/api/jobs/{job_id}/download"
        start_time = time.time()
        
        # Poll until ready
        while time.time() - start_time < max_wait_sec:
            res = self.session.get(dl_url, stream=True, timeout=30)
            if res.status_code == 200:
                os.makedirs(extract_dir, exist_ok=True)
                tmp_zip = os.path.join(extract_dir, f"{job_id}.zip")
                with open(tmp_zip, "wb") as f:
                    for chunk in res.iter_content(chunk_size=1024*1024):
                        if chunk:
                            f.write(chunk)
                extracted_files = []
                with zipfile.ZipFile(tmp_zip, "r") as z:
                    for member in z.namelist():
                        z.extract(member, extract_dir)
                        extracted_files.append(os.path.join(extract_dir, member))
                try:
                    os.remove(tmp_zip)
                except Exception:
                    pass
                return extracted_files
            elif res.status_code in (202, 404):
                time.sleep(3)
                continue
            else:
                raise RuntimeError(f"Antra download failed: {res.status_code}")
        raise TimeoutError("Antra job download timed out")
