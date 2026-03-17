from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()

class SavedDocument(Base):
    __tablename__ = "saved_documents"
    id = Column(Integer, primary_key=True, autoincrement=True)
    firm_name = Column(String(255))
    fei_number = Column(String(20))
    establishment_type = Column(String(100))
    inspection_start = Column(String(20))
    inspection_end = Column(String(20))
    district_office = Column(String(255))
    observation_count = Column(Integer, default=0)
    observations_json = Column(Text)
    metadata_json = Column(Text)
    document_type = Column(String(20), default="483")
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(100))
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

def get_engine(database_url: str):
    if database_url.startswith("sqlite"):
        return create_engine(database_url, connect_args={"check_same_thread": False})
    return create_engine(database_url)

def get_session_factory(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db(engine):
    Base.metadata.create_all(bind=engine)
