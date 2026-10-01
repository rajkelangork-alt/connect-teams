from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FileResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_by: int
    workspace_id: int | None = None
    channel_id: int | None = None
    message_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)