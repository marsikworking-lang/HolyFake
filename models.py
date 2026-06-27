from datetime import datetime, date, time
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(160), unique=True, nullable=False, default="", index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="staff")  # owner / admin / moderator / staff
    status = Column(String(30), nullable=False, default="active")  # active / blocked
    permissions = Column(Text, default="")  # JSON list of explicit permission keys. Empty = role defaults.
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    # Старое поле оставлено для совместимости с базой предыдущих версий.
    last_login = Column(DateTime, nullable=True)


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    nick = Column(String(80), unique=True, nullable=False, index=True)
    position = Column(String(80), nullable=False, default="Мл.сотрудник")
    discord = Column(String(120), default="")
    discord_id = Column(String(80), default="")
    telegram = Column(String(120), default="")
    telegram_id = Column(String(80), default="")
    email = Column(String(160), default="")
    accepted_by = Column(String(100), default="")
    accepted_date = Column(Date, nullable=True)
    status = Column(String(60), default="Активен")
    two_fa_enabled = Column(Boolean, default=False)
    manual_access = Column(Boolean, default=False)
    manual_access_granted_date = Column(Date, nullable=True)
    is_archived = Column(Boolean, default=False, index=True)

    removal_reason = Column(Text, default="")
    removed_by = Column(String(100), default="")
    removal_date = Column(Date, nullable=True)
    removal_comment = Column(Text, default="")

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    punishments = relationship("Punishment", back_populates="employee", cascade="all, delete-orphan")
    vacations = relationship("Vacation", back_populates="employee", cascade="all, delete-orphan")
    promotions = relationship("Promotion", back_populates="employee", cascade="all, delete-orphan")
    attestations = relationship("Attestation", back_populates="employee", cascade="all, delete-orphan")
    attestation_histories = relationship("AttestationHistory", back_populates="employee", cascade="all, delete-orphan")
    histories = relationship("ActionHistory", back_populates="employee", cascade="all, delete-orphan")


class Punishment(Base):
    __tablename__ = "punishments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    type = Column(String(40), nullable=False)  # Предупреждение / Выговор
    reason = Column(Text, nullable=False)
    issued_date = Column(Date, nullable=False, default=date.today)
    issued_time = Column(Time, nullable=True, default=lambda: datetime.now().time().replace(microsecond=0))
    issued_by = Column(String(100), nullable=False)
    remove_date = Column(Date, nullable=False)
    status = Column(String(60), default="Активно", index=True)
    removed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    employee = relationship("Employee", back_populates="punishments")


class Vacation(Base):
    __tablename__ = "vacations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    start_date = Column(Date, nullable=False)
    days = Column(Integer, nullable=False)
    end_date = Column(Date, nullable=False)
    issued_by = Column(String(100), nullable=False)
    comment = Column(Text, default="")
    status = Column(String(60), default="Активно", index=True)
    created_at = Column(DateTime, default=datetime.now)

    employee = relationship("Employee", back_populates="vacations")


class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    old_position = Column(String(80), nullable=False)
    new_position = Column(String(80), nullable=False)
    reason = Column(Text, nullable=False)
    promoted_by = Column(String(100), nullable=False)
    promotion_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    employee = relationship("Employee", back_populates="promotions")


class BlacklistEntry(Base):
    __tablename__ = "blacklist_entries"

    id = Column(Integer, primary_key=True, index=True)
    list_type = Column(String(20), nullable=False, default="ЧСКП", index=True)  # ЧСКП / ЧСП
    nick = Column(String(80), index=True, default="")
    position = Column(String(80), default="")
    discord = Column(String(120), default="")
    discord_id = Column(String(80), index=True, default="")
    telegram = Column(String(120), default="")
    telegram_id = Column(String(80), index=True, default="")
    email = Column(String(160), index=True, default="")
    reason = Column(Text, nullable=False)
    added_by = Column(String(100), nullable=False)
    added_date = Column(Date, nullable=False, default=date.today)
    term_type = Column(String(30), nullable=False, default="Бессрочно")  # Бессрочно / До даты
    expires_at = Column(Date, nullable=True)
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.now)


class Attestation(Base):
    __tablename__ = "attestations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    target_position = Column(String(80), nullable=False)
    manual_level = Column(String(80), nullable=False)
    remaining_attempts = Column(Integer, default=3)
    status = Column(String(60), default="Активно", index=True)  # Активно / КД / Задержка / Пройдено
    delay_until = Column(Date, nullable=True)
    cooldown_until = Column(Date, nullable=True)
    created_by = Column(String(100), default="")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    employee = relationship("Employee", back_populates="attestations")


class AttestationHistory(Base):
    __tablename__ = "attestation_history"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    promoted_to = Column(String(80), nullable=False)
    promoted_at = Column(DateTime, default=datetime.now, index=True)
    conducted_by = Column(String(100), nullable=False)
    comment = Column(Text, default="")

    employee = relationship("Employee", back_populates="attestation_histories")


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    candidate_name = Column(String(120), nullable=False)
    server_nick = Column(String(120), nullable=False, index=True)
    age = Column(Integer, nullable=True)
    intelligence_score = Column(Integer, default=0)
    punishment_history = Column(Text, default="Нет")
    communication_feelings = Column(Text, default="")
    accepted = Column(String(10), default="Нет")
    cool_score = Column(Integer, default=0)
    cheats_info = Column(Text, default="Нет")
    accepted_by = Column(String(100), default="")
    created_at = Column(DateTime, default=datetime.now, index=True)


class SettingOption(Base):
    __tablename__ = "setting_options"
    __table_args__ = (UniqueConstraint("category", "value", name="uq_category_value"),)

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(60), nullable=False, index=True)
    value = Column(String(120), nullable=False)
    sort_order = Column(Integer, default=0)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(80), primary_key=True)
    value = Column(String(200), nullable=False)


class ActionHistory(Base):
    __tablename__ = "action_history"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True, index=True)
    action_type = Column(String(80), nullable=False)
    details = Column(Text, default="")
    actor = Column(String(100), default="Система")
    created_at = Column(DateTime, default=datetime.now)

    employee = relationship("Employee", back_populates="histories")
