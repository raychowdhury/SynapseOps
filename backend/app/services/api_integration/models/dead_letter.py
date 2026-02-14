import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, JSON, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base


class DeadLetter(Base):
    __tablename__ = "ai_dead_letters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    flow_id: Mapped[str] = mapped_column(ForeignKey("ai_flows.id"), nullable=False)
    run_id: Mapped[str] = mapped_column(ForeignKey("ai_runs.id"), nullable=False)
    source_payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    mapped_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    replay_count: Mapped[int] = mapped_column(Integer, default=0)
    last_replayed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    flow: Mapped["Flow"] = relationship(back_populates="dead_letters")
    run: Mapped["Run"] = relationship(back_populates="dead_letters")
