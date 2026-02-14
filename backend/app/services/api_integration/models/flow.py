import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base


class Flow(Base):
    __tablename__ = "ai_flows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    source_endpoint_id: Mapped[str] = mapped_column(ForeignKey("ai_endpoints.id"), nullable=False)
    target_endpoint_id: Mapped[str] = mapped_column(ForeignKey("ai_endpoints.id"), nullable=False)
    mapping_id: Mapped[str] = mapped_column(ForeignKey("ai_mappings.id"), nullable=False)
    credential_id: Mapped[str | None] = mapped_column(ForeignKey("ai_credentials.id"), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    retry_max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    retry_base_delay_sec: Mapped[float] = mapped_column(Float, default=0.25)
    retry_max_delay_sec: Mapped[float] = mapped_column(Float, default=2.0)
    circuit_failure_threshold: Mapped[int] = mapped_column(Integer, default=3)
    circuit_recovery_timeout_sec: Mapped[float] = mapped_column(Float, default=5.0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    source_endpoint: Mapped["Endpoint"] = relationship(
        back_populates="source_flows",
        foreign_keys=[source_endpoint_id],
    )
    target_endpoint: Mapped["Endpoint"] = relationship(
        back_populates="target_flows",
        foreign_keys=[target_endpoint_id],
    )
    mapping: Mapped["Mapping"] = relationship(back_populates="flows")
    credential: Mapped["Credential | None"] = relationship(back_populates="flows")
    runs: Mapped[list["Run"]] = relationship(back_populates="flow", cascade="all, delete-orphan")
    dead_letters: Mapped[list["DeadLetter"]] = relationship(back_populates="flow", cascade="all, delete-orphan")
