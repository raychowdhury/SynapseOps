import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base


class Endpoint(Base):
    __tablename__ = "ai_endpoints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    connector_id: Mapped[str] = mapped_column(ForeignKey("ai_connectors.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    direction: Mapped[str] = mapped_column(String(20), nullable=False)  # inbound|outbound
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    event_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    connector: Mapped["Connector"] = relationship(back_populates="endpoints")
    source_flows: Mapped[list["Flow"]] = relationship(
        back_populates="source_endpoint",
        foreign_keys="Flow.source_endpoint_id",
    )
    target_flows: Mapped[list["Flow"]] = relationship(
        back_populates="target_endpoint",
        foreign_keys="Flow.target_endpoint_id",
    )
