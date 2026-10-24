"""Data transfer models and request validation for the AI backend."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    groq_configured: bool
    model: str
    version: str = "1.0.0"


class MentorRequest(BaseModel):
    protocol_name: str = Field(..., max_length=128, description="Identifier of the active protocol")
    display_title: Optional[str] = Field(None, max_length=256)
    step_name: Optional[str] = Field(None, max_length=128)
    step_prompt: Optional[str] = Field(None, max_length=512)
    learning_goals: Optional[str] = Field(None, max_length=1024)
    question: str = Field(..., min_length=1, max_length=500, description="Learner's bounded scientific question")
    completed_step_count: int = Field(0, ge=0)
    total_step_count: int = Field(0, ge=0)
    last_feedback: Optional[str] = Field(None, max_length=512)


class MentorResponse(BaseModel):
    status: str = "success"
    answer: str
    progressive_hint: Optional[str] = None
    mode: str = "live"


class SimulatorObservation(BaseModel):
    step_name: str = Field(..., max_length=128)
    target: str = Field(..., max_length=128)
    action: str = Field(..., max_length=64)
    recorded_value: Optional[str] = Field(None, max_length=128)
    unit: Optional[str] = Field(None, max_length=32)
    timestamp: Optional[str] = Field(None, max_length=64)


class ReportRequest(BaseModel):
    protocol_name: str = Field(..., max_length=128)
    display_title: str = Field(..., max_length=256)
    learning_objectives: Optional[str] = Field(None, max_length=1024)
    completed_steps: list[str] = Field(default_factory=list)
    incomplete_steps: list[str] = Field(default_factory=list)
    observations: list[SimulatorObservation] = Field(default_factory=list)
    errors_encountered: list[str] = Field(default_factory=list)
    student_notes: Optional[str] = Field(None, max_length=2000)


class ReportResponse(BaseModel):
    status: str = "success"
    experiment_title: str
    objectives: str
    completed_steps: list[str]
    incomplete_steps: list[str]
    recorded_observations: list[dict[str, Any]]
    errors_and_retries: list[str]
    ai_interpretation: str
    unrecorded_limitations: list[str]
    reflection_questions: list[str]
    disclaimer: str = (
        "AI-Assisted Draft. This report contains simulated virtual laboratory data only and "
        "must be reviewed by the student. Simulated results do not prove actual wet-lab outcomes."
    )
