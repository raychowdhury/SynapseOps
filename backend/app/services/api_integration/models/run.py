import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, JSON, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base


class Run(Base):
    __tablename__ = "ai_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    flow_id: Mapped[str] = mapped_column(ForeignKey("ai_flows.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="RUNNING")
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    source_payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    mapped_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    target_response: Mapped[dict | str | None] = mapped_column(JSON, nullable=True)
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    flow: Mapped["Flow"] = relationship(back_populates="runs")
    dead_letters: Mapped[list["DeadLetter"]] = relationship(back_populates="run")
