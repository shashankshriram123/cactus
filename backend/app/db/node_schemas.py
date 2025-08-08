from pydantic import BaseModel

class SubBranchRequest(BaseModel):
    label: str
    initial_prompt: str

class ExtendBranchRequest(BaseModel):
    count: int = 1