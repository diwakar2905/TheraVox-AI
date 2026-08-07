"""Pydantic models for request and response validation."""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field, model_validator


class EmotionResponse(BaseModel):
    """Response model for emotion analysis."""
    emotion: str = Field(..., description="Detected emotion")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    emoji: str = Field(..., description="Emoji representation")
    description: str = Field(..., description="Human-readable description")
    scores: Optional[Dict[str, float]] = Field(None, description="Per-emotion confidence scores for all 7 emotions")


class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str
    text_ready: bool
    audio_loaded: bool
    audio_libs: Any


class AudioStatusResponse(BaseModel):
    """Response model for audio analyzer status."""
    hf_libs_available: bool
    hf_model_id: str
    hf_loaded: bool
    device: Optional[str]
    soundfile_available: bool
    emotions_supported: list


class VisionAnalysisResponse(BaseModel):
    """Response model for vision analysis."""
    faces: list[EmotionResponse]


class ErrorResponse(BaseModel):
    """Response model for errors."""
    error: str = Field(..., description="Error message")


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------

class UserRegisterRequest(BaseModel):
    """Request body for POST /api/auth/register."""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=200)
    password: str = Field(..., min_length=8, max_length=128)


class UserLoginRequest(BaseModel):
    """Request body for POST /api/auth/login."""
    email: EmailStr
    password: str


class UserProfileResponse(BaseModel):
    """Response shape for an authenticated user's profile."""
    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Response body for register / login / refresh endpoints."""
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


class UpdateProfileRequest(BaseModel):
    """Request body for PATCH /api/auth/me — update name and/or email."""
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None

    @model_validator(mode='after')
    def at_least_one_field(self) -> 'UpdateProfileRequest':
        if self.full_name is None and self.email is None:
            raise ValueError("At least one of full_name or email must be provided")
        return self


class ChangePasswordRequest(BaseModel):
    """Request body for POST /api/auth/me/password."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


class AccountStatsResponse(BaseModel):
    """Response body for GET /api/auth/me/stats."""
    wellness_entries_count: int
    member_since: datetime


# ---------------------------------------------------------------------------
# Wellness schemas
# ---------------------------------------------------------------------------

class WellnessEntryCreate(BaseModel):
    """Request body for POST /api/wellness/entries."""
    entry_type: str = Field(..., max_length=50, description="'journal' | 'mood_log' | 'gratitude' | 'activity'")
    content: str = Field(..., min_length=1)
    mood_score: Optional[float] = Field(default=None, ge=0, le=10)
    tags: Optional[List[str]] = None


class WellnessEntryResponse(BaseModel):
    """Response shape for a wellness entry."""
    id: uuid.UUID
    user_id: uuid.UUID
    entry_type: str
    content: str
    mood_score: Optional[float]
    tags: Optional[List[str]]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Feedback schemas
# ---------------------------------------------------------------------------

class FeedbackCreate(BaseModel):
    """Request body for POST /api/feedback."""
    category: str = Field(..., max_length=30, description="'bug' | 'suggestion' | 'general' | 'compliment'")
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1)
    rating: Optional[int] = Field(default=None, ge=1, le=5)


class FeedbackResponse(BaseModel):
    """Response shape for a feedback submission."""
    id: uuid.UUID
    user_id: Optional[uuid.UUID]
    category: str
    subject: str
    message: str
    rating: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Chat schemas
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    """A single message in the conversation history."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., min_length=1, max_length=4000)


class ChatContext(BaseModel):
    """Optional wellness context to personalise the AI response."""
    recent_mood: Optional[str] = None
    streak: Optional[int] = None
    breathing_minutes: Optional[int] = None


class ChatRequest(BaseModel):
    """Request body for POST /api/chat."""
    messages: List[ChatMessage] = Field(..., min_length=1, max_length=50)
    context: Optional[ChatContext] = None
    session_id: Optional[uuid.UUID] = None  # omit to start a new session


class ChatResponse(BaseModel):
    """Response body for POST /api/chat."""
    reply: str
    model: str
    session_id: uuid.UUID  # always returned so frontend can continue the session


class ChatSessionResponse(BaseModel):
    """Summary of a single chat session (used in list view)."""
    id: uuid.UUID
    title: str
    message_count: int
    created_at: datetime
    updated_at: datetime
    preview: Optional[str] = None  # last assistant message, truncated

    model_config = {"from_attributes": True}


class ChatMessageResponse(BaseModel):
    """A single persisted chat message."""
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Session Summary & Action Plan schemas
# ---------------------------------------------------------------------------

class SessionSummaryResponse(BaseModel):
    """AI-generated session summary with action plan."""
    id: uuid.UUID
    session_id: uuid.UUID
    summary: str
    key_themes: List[str]
    action_items: List[str]
    mood_arc: Optional[str] = None
    model_used: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionDetail(BaseModel):
    """Full session with all messages — returned by GET /api/chat/sessions/{id}."""
    id: uuid.UUID
    title: str
    created_at: datetime
    messages: List[ChatMessageResponse]
    summary: Optional[SessionSummaryResponse] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Guided Journal schemas
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Postcard schemas
# ---------------------------------------------------------------------------

class PostcardRequest(BaseModel):
    """Request body for POST /api/postcard."""
    emotion: str = Field(..., description="Detected emotion label")
    emoji: str = Field(..., description="Emoji for the emotion")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")


class PostcardResponse(BaseModel):
    """Response body for POST /api/postcard — data to render a shareable card."""
    emotion: str
    emoji: str
    confidence: float
    quote_text: str
    quote_author: str
    gradient: List[str] = Field(..., description="CSS gradient color stops")
    accent: str = Field(..., description="Accent color hex")
    text_color: str = Field(..., description="Text color hex")
    glow: str = Field(..., description="Glow/shadow color rgba")
    pattern: str = Field(..., description="Background pattern type")


# ---------------------------------------------------------------------------
# Guided Journal schemas
# ---------------------------------------------------------------------------

class JournalPromptRequest(BaseModel):
    """Request body for POST /api/journal/prompt."""
    recent_mood: Optional[str] = None
    mood_history: Optional[List[str]] = Field(default=None, max_length=10)


class JournalPromptResponse(BaseModel):
    """Response body for POST /api/journal/prompt."""
    prompt: str


class JournalSubmitRequest(BaseModel):
    """Request body for POST /api/journal/submit."""
    text: str = Field(..., min_length=1, max_length=4000)
    prompt: Optional[str] = Field(default=None, max_length=500)


class JournalSubmitResponse(BaseModel):
    """Response body for POST /api/journal/submit."""
    emotion: str
    confidence: float
    emoji: str
    description: str
    reflection: str


# ---------------------------------------------------------------------------
# Crisis Detection schemas
# ---------------------------------------------------------------------------

class ScanTextRequest(BaseModel):
    """Request body for POST /api/crisis/scan."""
    text: str = Field(..., min_length=1, max_length=10_000)
    source: str = Field("manual", max_length=50)


class CrisisSignalSchema(BaseModel):
    """A single matched risk signal."""
    phrase: str
    category: str
    severity: str


class CrisisAssessmentResponse(BaseModel):
    """Response shape included whenever crisis scanning is performed."""
    flagged: bool
    severity: str  # none | low | moderate | high | critical
    signals: List[CrisisSignalSchema] = []
    recommended_action: str = ""
    crisis_resources: List[Dict[str, Any]] = []


class CrisisAlertResponse(BaseModel):
    """Response shape for a persisted crisis alert record."""
    id: uuid.UUID
    user_id: Optional[uuid.UUID]
    severity: str
    source: str
    input_snippet: str
    signals: List[CrisisSignalSchema]
    recommended_action: str
    escalation_sent: bool
    resolved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CrisisAlertListResponse(BaseModel):
    """Paginated list of crisis alerts."""
    alerts: List[CrisisAlertResponse]
    total: int


class EmergencyContactCreate(BaseModel):
    """Request body for setting up an emergency contact."""
    name: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=30)
    email: Optional[EmailStr] = None
    relationship: str = Field(..., min_length=1, max_length=100)

    @model_validator(mode='after')
    def at_least_one_contact_method(self) -> 'EmergencyContactCreate':
        if not self.phone and not self.email:
            raise ValueError("At least one of phone or email must be provided")
        return self


class EmergencyContactResponse(BaseModel):
    """Response shape for an emergency contact."""
    id: uuid.UUID
    name: str
    phone: Optional[str]
    email: Optional[str]
    relationship: str
    created_at: datetime

    model_config = {"from_attributes": True}
