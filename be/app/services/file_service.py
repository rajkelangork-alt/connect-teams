import os
import uuid

import aiofiles
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import File as DBFile

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class FileService:
    @staticmethod
    async def get_by_id(db: AsyncSession, file_id: int) -> DBFile | None:
        result = await db.execute(select(DBFile).where(DBFile.id == file_id))
        return result.scalar_one_or_none()

    @classmethod
    async def save_file(
        cls,
        db: AsyncSession,
        upload_file: UploadFile,
        uploaded_by: int,
        workspace_id: int | None = None,
        channel_id: int | None = None,
        message_id: int | None = None,
    ) -> DBFile:
        original_filename = upload_file.filename or "unnamed_file"
        extension = os.path.splitext(original_filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{extension}"
        stored_path = os.path.join(UPLOAD_DIR, unique_filename)

        async with aiofiles.open(stored_path, "wb") as out_file:
            while content := await upload_file.read(1024 * 1024):
                await out_file.write(content)

        file_size = os.path.getsize(stored_path)
        mime_type = upload_file.content_type or "application/octet-stream"

        file_record = DBFile(
            filename=unique_filename,
            original_filename=original_filename,
            file_path=stored_path,
            file_size=file_size,
            mime_type=mime_type,
            uploaded_by=uploaded_by,
            workspace_id=workspace_id,
            channel_id=channel_id,
            message_id=message_id,
        )
        db.add(file_record)
        await db.commit()
        await db.refresh(file_record)
        return file_record


file_service = FileService()