from pydantic import BaseModel
from typing import Optional

class NodeCreate(BaseModel):
    content: str
    author: Optional[str] = "user"

class RootNodeCreate(BaseModel):
    content: str
    author: Optional[str] = "user"

class SubBranchRequest(BaseModel):
    label: str
    initial_prompt: str

class ExtendBranchRequest(BaseModel):
    count: int = 1
