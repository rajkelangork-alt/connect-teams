import shutil
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status

router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
    ".pdf", ".txt", ".md", ".json", ".doc", ".docx",
    ".zip", ".tar.gz",
}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


@router.post("/upload")
async def upload_attachment(
    file: Annotated[UploadFile, File()],
) -> dict[str, str | int]:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty.",
        )

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension: {file_ext}",
        )

    unique_filename = f"{uuid.uuid4().hex[:12]}_{file.filename}"
    destination_path = UPLOAD_DIR / unique_filename

    try:
        with destination_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {exc}",
        ) from exc
    finally:
        file.file.close()

    file_size = destination_path.stat().st_size
    file_url = f"http://127.0.0.1:8000/uploads/{unique_filename}"

    return {
        "file_name": file.filename,
        "file_url": file_url,
        "file_size": file_size,
        "content_type": file.content_type or "application/octet-stream",
    }