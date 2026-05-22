import time
import os
import random
import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(override=True)
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import database
import models
from database import engine, get_db
from rag_service import RAGService
from agent_service import AgentService

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="NeuroRAG Enterprise API", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global API settings cache (loaded from environment variables initially)
api_settings_cache = {
    "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY", ""),
    "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY", "")
}

# --- Core Setup Middleware/Helpers ---

def seed_db_if_empty(db: Session):
    # Check if a default organization and user exists
    org = db.query(models.Organization).first()
    if not org:
        org = models.Organization(company_name="NeuroCorp Industries", subscription_plan="Enterprise")
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Add default users with different roles
        users = [
            models.User(organization_id=org.id, name="Sarah Jenkins", email="admin@neurocorp.com", role="Admin"),
            models.User(organization_id=org.id, name="John Miller", email="hr@neurocorp.com", role="HR"),
            models.User(organization_id=org.id, name="David Vance", email="finance@neurocorp.com", role="Finance"),
            models.User(organization_id=org.id, name="Alice Cooper", email="staff@neurocorp.com", role="General")
        ]
        db.add_all(users)
        db.commit()

# Run seed on startup
@app.on_event("startup")
def startup_event():
    db = database.SessionLocal()
    try:
        seed_db_if_empty(db)
    finally:
        db.close()

# --- API Endpoints ---

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy", 
        "timestamp": time.time(),
        "database": "SQLite connected",
        "api_keys_configured": {
            "gemini": bool(api_settings_cache["GEMINI_API_KEY"]),
            "openai": bool(api_settings_cache["OPENAI_API_KEY"])
        }
    }

@app.get("/api/settings")
def get_settings():
    # Mask keys for security
    return {
        "GEMINI_API_KEY": api_settings_cache["GEMINI_API_KEY"][:6] + "..." if api_settings_cache["GEMINI_API_KEY"] else "",
        "OPENAI_API_KEY": api_settings_cache["OPENAI_API_KEY"][:6] + "..." if api_settings_cache["OPENAI_API_KEY"] else ""
    }

@app.post("/api/settings")
def update_settings(payload: Dict[str, str]):
    if "GEMINI_API_KEY" in payload:
        api_settings_cache["GEMINI_API_KEY"] = payload["GEMINI_API_KEY"]
    if "OPENAI_API_KEY" in payload:
        api_settings_cache["OPENAI_API_KEY"] = payload["OPENAI_API_KEY"]
    return {"message": "API keys updated successfully"}

# --- Authentication Endpoints ---

def send_email_otp(email: str, otp_code: str):
    # Safely get and clean environmental variables
    raw_host = os.getenv("SMTP_HOST", "")
    raw_port = os.getenv("SMTP_PORT", "")
    raw_user = os.getenv("SMTP_USER", "")
    raw_password = os.getenv("SMTP_PASSWORD", "")
    raw_from = os.getenv("SMTP_FROM_EMAIL", "")

    smtp_host = raw_host.strip().strip('"').strip("'") if raw_host else ""
    smtp_port_str = raw_port.strip().strip('"').strip("'") if raw_port else ""
    smtp_user = raw_user.strip().strip('"').strip("'") if raw_user else ""
    smtp_password = raw_password.strip().strip('"').strip("'").replace(" ", "") if raw_password else ""
    smtp_from_email = raw_from.strip().strip('"').strip("'") if raw_from else smtp_user

    # Always log to console as fallback/reference
    print("\n" + "=" * 60, flush=True)
    print(f"[OTP SERVICE] Verification Code generated for {email}", flush=True)
    print(f"   CODE: {otp_code}  (Expires in 5 minutes)", flush=True)
    
    if not smtp_host or not smtp_user or not smtp_password:
        print("[OTP SERVICE] SMTP not fully configured in env (SMTP_HOST, SMTP_USER, SMTP_PASSWORD).", flush=True)
        print("[OTP SERVICE] Verification code was not sent via email.", flush=True)
        print("=" * 60 + "\n", flush=True)
        return False
        
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        # Build email message
        msg = MIMEMultipart()
        msg['From'] = smtp_from_email
        msg['To'] = email
        msg['Subject'] = f"Your NeuroRAG Verification Code: {otp_code}"
        
        body = f"""Hello,

Your verification code to access NeuroRAG is:

{otp_code}

This code will expire in 5 minutes. If you did not request this code, please ignore this email.

Best regards,
NeuroRAG Team"""
        msg.attach(MIMEText(body, 'plain'))
        
        port = int(smtp_port_str) if smtp_port_str else 587
        
        # Setup SMTP client
        if port == 465:
            server = smtplib.SMTP_SSL(smtp_host, port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_host, port, timeout=10)
            server.ehlo()
            if port == 587:
                server.starttls()
                server.ehlo()
        
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from_email, email, msg.as_string())
        server.quit()
        
        print(f"[OTP SERVICE] Successfully sent email to {email}", flush=True)
        print("=" * 60 + "\n", flush=True)
        return True
    except Exception as e:
        print(f"[OTP SERVICE] Failed to send email to {email} due to error: {e}", flush=True)
        print("=" * 60 + "\n", flush=True)
        return False

@app.post("/api/auth/send-otp")
def send_otp(payload: Dict[str, str], background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    # Generate 6-digit code
    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    
    # Remove existing OTP records for this email
    db.query(models.OTPVerification).filter(models.OTPVerification.email == email).delete()
    
    # Save new OTP record
    otp_record = models.OTPVerification(
        email=email,
        otp_code=otp_code,
        expires_at=expires_at
    )
    db.add(otp_record)
    db.commit()
    
    # Queue email sending in the background to prevent API timeout / UI freeze
    background_tasks.add_task(send_email_otp, email, otp_code)
    
    return {"message": "OTP verification code queued for sending"}

@app.post("/api/auth/verify-otp")
def verify_otp(payload: Dict[str, str], db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    otp_code = payload.get("otp_code", "").strip()
    
    if not email or not otp_code:
        raise HTTPException(status_code=400, detail="Email and OTP code are required")
        
    # Query database for OTP
    otp_record = db.query(models.OTPVerification).filter(
        models.OTPVerification.email == email,
        models.OTPVerification.otp_code == otp_code
    ).first()
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    # Check if expired
    if otp_record.expires_at < datetime.datetime.utcnow():
        db.delete(otp_record)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP code has expired")
        
    # Delete verification record on success
    db.delete(otp_record)
    
    # Find user
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Auto-register new user
        # Get or create default organization
        org = db.query(models.Organization).first()
        if not org:
            org = models.Organization(company_name="NeuroCorp Industries", subscription_plan="Enterprise")
            db.add(org)
            db.commit()
            db.refresh(org)
            
        # Extract name from email (e.g. david.vance@neurocorp.com -> David.vance -> David)
        local_part = email.split("@")[0]
        name_parts = [part.capitalize() for part in local_part.replace(".", " ").replace("_", " ").split()]
        name = " ".join(name_parts) if name_parts else "New User"
        
        user = models.User(
            organization_id=org.id,
            name=name,
            email=email,
            role="General"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        db.commit()
        
    # Return user details and dummy session token
    return {
        "user": {
            "name": user.name,
            "email": user.email,
            "role": user.role
        },
        "token": f"mock-jwt-session-token-{user.id}-{int(time.time())}"
    }

# Background task to parse, chunk, and embed uploaded document
def process_document_task(doc_id: int, file_content: bytes, file_name: str, file_type: str, access_role: str):
    db = database.SessionLocal()
    try:
        doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
        if not doc:
            return
            
        doc.embedding_status = "Processing"
        db.commit()
        
        # 1. Parse document
        chunks_data = RAGService.parse_document(file_content, file_type)
        if not chunks_data:
            doc.embedding_status = "Failed"
            db.commit()
            return
            
        # 2. Extract texts for embedding
        texts = [chunk["text"] for chunk in chunks_data]
        
        # 3. Generate embeddings
        embeddings = RAGService.generate_embeddings(texts, api_settings_cache)
        
        # 4. Save chunks
        for idx, chunk in enumerate(chunks_data):
            embedding_val = embeddings[idx] if idx < len(embeddings) else None
            db_chunk = models.DocumentChunk(
                document_id=doc.id,
                chunk_index=idx,
                text_content=chunk["text"],
                page_number=chunk["page"],
                access_role=access_role,
                embedding_vector=embedding_val
            )
            db.add(db_chunk)
            
        # 5. Generate basic summary using summarization agent (or mock summary)
        doc.summary = AgentService.run_summarization_agent(file_name, chunks_data)
        doc.embedding_status = "Indexed"
        db.commit()
        
    except Exception as e:
        print(f"Error background processing document {doc_id}: {e}")
        try:
            doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
            if doc:
                doc.embedding_status = "Failed"
                db.commit()
        except:
            pass
    finally:
        db.close()

@app.post("/api/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    access_role: str = Form("General"),
    user_email: str = Form("admin@neurocorp.com"),
    db: Session = Depends(get_db)
):
    # Retrieve user & organization
    user = db.query(models.User).filter(models.User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    file_content = await file.read()
    file_size = len(file_content)
    file_name = file.filename
    file_type = file_name.split(".")[-1].lower() if "." in file_name else "txt"
    
    # Save document entry as Pending
    doc = models.Document(
        organization_id=user.organization_id,
        file_name=file_name,
        file_size=file_size,
        file_type=file_type,
        embedding_status="Pending",
        uploaded_by_id=user.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    # Enqueue background RAG parsing and vector indexing
    background_tasks.add_task(
        process_document_task,
        doc.id,
        file_content,
        file_name,
        file_type,
        access_role
    )
    
    return {
        "message": "Document uploaded and indexing started",
        "document_id": doc.id,
        "file_name": file_name,
        "status": "Pending"
    }

@app.get("/api/documents")
def list_documents(user_email: str = "admin@neurocorp.com", db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    docs = db.query(models.Document).filter(models.Document.organization_id == user.organization_id).all()
    
    results = []
    for doc in docs:
        chunk_count = db.query(models.DocumentChunk).filter(models.DocumentChunk.document_id == doc.id).count()
        # Find roles from chunks (default to HR, Finance, etc.)
        first_chunk = db.query(models.DocumentChunk).filter(models.DocumentChunk.document_id == doc.id).first()
        role = first_chunk.access_role if first_chunk else "General"
        
        uploaded_by = db.query(models.User).filter(models.User.id == doc.uploaded_by_id).first()
        
        results.append({
            "id": doc.id,
            "file_name": doc.file_name,
            "file_size": doc.file_size,
            "file_type": doc.file_type,
            "embedding_status": doc.embedding_status,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "uploaded_by": uploaded_by.name if uploaded_by else "System",
            "chunk_count": chunk_count,
            "access_role": role,
            "summary": doc.summary
        })
    return results

@app.post("/api/chat")
def chat_with_docs(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    query = payload.get("query", "").strip()
    user_email = payload.get("user_email", "admin@neurocorp.com")
    agent_used = payload.get("agent", "None")  # None, Research, Compliance
    session_id = payload.get("session_id")
    
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    start_time = time.time()
    
    # 1. Fetch user & role
    user = db.query(models.User).filter(models.User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 2. Gather all chunks for this organization
    org_chunks = db.query(models.DocumentChunk).join(models.Document).filter(
        models.Document.organization_id == user.organization_id,
        models.Document.embedding_status == "Indexed"
    ).all()
    
    formatted_chunks = []
    for c in org_chunks:
        formatted_chunks.append({
            "id": c.id,
            "document_id": c.document_id,
            "text": c.text_content,
            "page_number": c.page_number,
            "access_role": c.access_role,
            "embedding": c.embedding_vector,
            "file_name": c.document.file_name
        })
        
    # 3. Retrieve chunks based on query & user's role (RBAC applied in service)
    retrieved = RAGService.retrieve_chunks(
        query=query, 
        all_chunks=formatted_chunks, 
        user_role=user.role, 
        api_settings=api_settings_cache,
        top_k=5
    )
    
    # 4. Generate response (apply agents if requested)
    response_text = ""
    citations = []
    
    if agent_used == "Research":
        response_text, citations = AgentService.run_research_agent(query, retrieved, api_settings_cache)
    else:
        response_text, citations = RAGService.generate_response(query, retrieved, api_settings_cache)
        
    # 5. Compliance Check (simulated or compliance agent run)
    compliance_result = AgentService.run_compliance_agent(query, response_text)
    
    # Check if compliance blocked the result
    if not compliance_result["is_compliant"] and "Blocked" in compliance_result.get("status", ""):
        response_text = f"🚨 SECURITY WARNING: The generated response was blocked due to: {compliance_result['reason']}"
        citations = []
        
    # Log compliance
    comp_log = models.ComplianceLog(
        organization_id=user.organization_id,
        user_id=user.id,
        query=query,
        response=response_text,
        status=compliance_result["status"],
        flag_reason=compliance_result["reason"]
    )
    db.add(comp_log)
    
    # 6. Save chat session & message
    if not session_id:
        # Create session
        sess = models.ChatSession(user_id=user.id, title=query[:30] + "...")
        db.add(sess)
        db.commit()
        db.refresh(sess)
        session_id = sess.id
    else:
        sess = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
        if not sess:
            sess = models.ChatSession(id=session_id, user_id=user.id, title=query[:30] + "...")
            db.add(sess)
            db.commit()
            
    user_msg = models.ChatMessage(
        session_id=session_id,
        sender_role="user",
        content=query,
        agent_used=None
    )
    assistant_msg = models.ChatMessage(
        session_id=session_id,
        sender_role="assistant",
        content=response_text,
        citations=citations,
        agent_used=agent_used if agent_used != "None" else None
    )
    db.add(user_msg)
    db.add(assistant_msg)
    
    # 7. Log search analytics
    latency = int((time.time() - start_time) * 1000)
    analytics = models.SearchAnalytics(
        organization_id=user.organization_id,
        user_id=user.id,
        query_text=query,
        latency_ms=latency
    )
    db.add(analytics)
    
    db.commit()
    
    return {
        "session_id": session_id,
        "response": response_text,
        "citations": citations,
        "compliance": compliance_result,
        "latency_ms": latency
    }

@app.get("/api/chat/sessions")
def list_sessions(user_email: str = "admin@neurocorp.com", db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    sessions = db.query(models.ChatSession).filter(models.ChatSession.user_id == user.id).order_by(models.ChatSession.created_at.desc()).all()
    
    return [{
        "id": s.id,
        "title": s.title,
        "created_at": s.created_at.isoformat()
    } for s in sessions]

@app.get("/api/chat/sessions/{session_id}/messages")
def get_messages(session_id: int, db: Session = Depends(get_db)):
    messages = db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session_id).order_by(models.ChatMessage.timestamp.asc()).all()
    
    return [{
        "id": m.id,
        "sender_role": m.sender_role,
        "content": m.content,
        "timestamp": m.timestamp.isoformat(),
        "citations": m.citations,
        "agent_used": m.agent_used
    } for m in messages]

@app.get("/api/analytics")
def get_analytics(user_email: str = "admin@neurocorp.com", db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    logs = db.query(models.SearchAnalytics).filter(models.SearchAnalytics.organization_id == user.organization_id).all()
    
    # Prepare logs dictionary for analytics service
    log_dicts = [{
        "query_text": l.query_text,
        "latency_ms": l.latency_ms
    } for l in logs]
    
    analytics_data = AgentService.run_analytics_agent(log_dicts)
    
    # Include compliance violation counts
    flagged_count = db.query(models.ComplianceLog).filter(
        models.ComplianceLog.organization_id == user.organization_id,
        models.ComplianceLog.status != "Pass"
    ).count()
    
    analytics_data["flagged_compliance_queries"] = flagged_count
    
    return analytics_data

@app.get("/api/graph")
def get_knowledge_graph(user_email: str = "admin@neurocorp.com", db: Session = Depends(get_db)):
    """
    Knowledge Graph exporter:
    Returns document nodes, category nodes, and semantic links.
    """
    user = db.query(models.User).filter(models.User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Get all indexed documents
    docs = db.query(models.Document).filter(
        models.Document.organization_id == user.organization_id,
        models.Document.embedding_status == "Indexed"
    ).all()
    
    nodes = []
    edges = []
    
    # Set of unique categories
    categories = set()
    
    # 1. Document Nodes
    for doc in docs:
        # Determine a mock category based on file type / naming
        cat = "General"
        fname = doc.file_name.lower()
        if "hr" in fname or "leave" in fname or "onboarding" in fname or "policy" in fname:
            cat = "HR & Policies"
        elif "finance" in fname or "reimbursement" in fname or "budget" in fname or "tax" in fname:
            cat = "Finance"
        elif "technical" in fname or "api" in fname or "code" in fname or "architecture" in fname:
            cat = "Engineering"
            
        categories.add(cat)
        
        nodes.append({
            "id": f"doc_{doc.id}",
            "label": doc.file_name,
            "type": "document",
            "val": 15,
            "color": "#10B981" if cat == "HR & Policies" else "#3B82F6" if cat == "Finance" else "#F59E0B" if cat == "Engineering" else "#8B5CF6",
            "details": {
                "size": f"{doc.file_size / 1024:.1f} KB",
                "type": doc.file_type.upper(),
                "chunks": db.query(models.DocumentChunk).filter(models.DocumentChunk.document_id == doc.id).count(),
                "role": db.query(models.DocumentChunk).filter(models.DocumentChunk.document_id == doc.id).first().access_role if db.query(models.DocumentChunk).filter(models.DocumentChunk.document_id == doc.id).first() else "General"
            }
        })
        
        # Link document to its category node
        edges.append({
            "source": f"cat_{cat}",
            "target": f"doc_{doc.id}",
            "type": "belongs_to"
        })
        
    # 2. Category Nodes
    for cat in categories:
        nodes.append({
            "id": f"cat_{cat}",
            "label": cat,
            "type": "category",
            "val": 25,
            "color": "#EC4899",
            "details": {"description": f"{cat} Knowledge Base Domain"}
        })
        
    # 3. User Queries (Recent searches linked to category or documents based on matches)
    recent_searches = db.query(models.SearchAnalytics).filter(
        models.SearchAnalytics.organization_id == user.organization_id
    ).order_by(models.SearchAnalytics.timestamp.desc()).limit(5).all()
    
    for idx, search in enumerate(recent_searches):
        nodes.append({
            "id": f"query_{search.id}",
            "label": f'"{search.query_text[:20]}..."',
            "type": "query",
            "val": 10,
            "color": "#E5E7EB",
            "details": {"query_text": search.query_text, "latency": f"{search.latency_ms}ms"}
        })
        
        # Attempt semantic link: find if query matches any document title keywords
        linked = False
        query_words = set(search.query_text.lower().split())
        for doc in docs:
            doc_words = set(doc.file_name.lower().replace(".", " ").split())
            if query_words.intersection(doc_words):
                edges.append({
                    "source": f"query_{search.id}",
                    "target": f"doc_{doc.id}",
                    "type": "queries"
                })
                linked = True
                
        # If no direct document link, link to general category
        if not linked and categories:
            edges.append({
                "source": f"query_{search.id}",
                "target": f"cat_{list(categories)[0]}",
                "type": "queries"
            })
            
    return {
        "nodes": nodes,
        "links": edges
    }

# --- Mount Frontend Static Files ---
from fastapi.staticfiles import StaticFiles

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/out"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

