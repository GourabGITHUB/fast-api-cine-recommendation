from pydantic import BaseModel, Field
from typing import Literal
QueryType = Literal["title","context"]

class RecommendationRequest(BaseModel):
    query_type: QueryType
    query: str = Field(min_length=1, max_length=500, examples=["Interstellar"])

class Recommendation(BaseModel):
    title: str
    description: str
    
class RecommendationResponse(BaseModel):
    recommendations: list[Recommendation] = Field(min_length=5, max_length=8)
    
