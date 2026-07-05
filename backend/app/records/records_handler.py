import os
import uuid
import logging
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

logger = logging.getLogger("app.records")

# Load configuration from environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")

# Initialize Supabase client if credentials are provided
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("Supabase environment variables not set. Running database/storage in MOCK mode.")

# Local in-memory store for mockup mode when Supabase is not connected
MOCK_RECORDS = []

def is_supabase_enabled() -> bool:
    return supabase is not None

async def save_scan_record(
    user_id: str, 
    file_bytes: bytes, 
    filename: str, 
    content_type: str,
    prediction_label: str, 
    confidence: float, 
    model_version: str
) -> Dict[str, Any]:
    """
    Uploads the image to Supabase Storage under `brain-scans/{user_id}/{unique_filename}`
    and inserts a record into the `scan_records` table.
    """
    unique_filename = f"{uuid.uuid4()}_{filename}"
    storage_path = f"{user_id}/{unique_filename}"
    
    if not is_supabase_enabled():
        # Fallback to local mock record
        mock_record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "image_path": storage_path,
            "prediction_label": prediction_label,
            "confidence": confidence,
            "model_version": model_version,
            "created_at": "2026-07-05T22:00:00Z",
            "signed_url": "https://placehold.co/600x400/0f6674/ffffff?text=Mock+Brain+MRI"
        }
        MOCK_RECORDS.append(mock_record)
        logger.info(f"[MOCK] Saved scan record: {mock_record['id']}")
        return mock_record

    try:
        # 1. Upload to Supabase Storage
        # Make sure the 'brain-scans' bucket exists in your Supabase project!
        supabase.storage.from_("brain-scans").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        
        # 2. Insert record into PostgreSQL scan_records table
        record_data = {
            "user_id": user_id,
            "image_path": storage_path,
            "prediction_label": prediction_label,
            "confidence": confidence,
            "model_version": model_version
        }
        
        db_response = supabase.table("scan_records").insert(record_data).execute()
        
        if len(db_response.data) == 0:
            raise Exception("Failed to insert record into DB")
            
        record = db_response.data[0]
        
        # 3. Add signed URL for the frontend
        signed_url_res = supabase.storage.from_("brain-scans").create_signed_url(storage_path, expires_in=3600)
        record["signed_url"] = signed_url_res.get("signedURL", "")
        
        return record
        
    except Exception as e:
        logger.error(f"Error saving scan record: {e}")
        raise e

async def get_user_history(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves all scan records for the specified user, sorted by date descending."""
    if not is_supabase_enabled():
        return [r for r in MOCK_RECORDS if r["user_id"] == user_id]

    try:
        response = supabase.table("scan_records") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
            
        records = response.data
        
        # Generate signed URLs for each record
        for record in records:
            try:
                signed_url_res = supabase.storage.from_("brain-scans").create_signed_url(
                    record["image_path"], expires_in=3600
                )
                record["signed_url"] = signed_url_res.get("signedURL", "")
            except Exception:
                record["signed_url"] = ""
                
        return records
    except Exception as e:
        logger.error(f"Error retrieving user history: {e}")
        raise e

async def get_scan_record(user_id: str, record_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single scan record for the user."""
    if not is_supabase_enabled():
        for r in MOCK_RECORDS:
            if r["id"] == record_id and r["user_id"] == user_id:
                return r
        return None

    try:
        response = supabase.table("scan_records") \
            .select("*") \
            .eq("id", record_id) \
            .eq("user_id", user_id) \
            .execute()
            
        if len(response.data) == 0:
            return None
            
        record = response.data[0]
        
        # Generate signed URL
        signed_url_res = supabase.storage.from_("brain-scans").create_signed_url(
            record["image_path"], expires_in=3600
        )
        record["signed_url"] = signed_url_res.get("signedURL", "")
        
        return record
    except Exception as e:
        logger.error(f"Error retrieving scan record {record_id}: {e}")
        raise e

async def delete_scan_record(user_id: str, record_id: str) -> bool:
    """Deletes a scan record and its associated image file from storage."""
    if not is_supabase_enabled():
        global MOCK_RECORDS
        initial_len = len(MOCK_RECORDS)
        MOCK_RECORDS = [r for r in MOCK_RECORDS if not (r["id"] == record_id and r["user_id"] == user_id)]
        return len(MOCK_RECORDS) < initial_len

    try:
        # 1. Fetch the record to get the image path
        response = supabase.table("scan_records") \
            .select("image_path") \
            .eq("id", record_id) \
            .eq("user_id", user_id) \
            .execute()
            
        if len(response.data) == 0:
            return False
            
        image_path = response.data[0]["image_path"]
        
        # 2. Delete from DB (RLS ensures user can delete only their own)
        supabase.table("scan_records") \
            .delete() \
            .eq("id", record_id) \
            .eq("user_id", user_id) \
            .execute()
            
        # 3. Delete from Storage
        try:
            supabase.storage.from_("brain-scans").remove([image_path])
        except Exception as se:
            logger.warning(f"Failed to delete image file from storage: {se}")
            
        return True
    except Exception as e:
        logger.error(f"Error deleting scan record {record_id}: {e}")
        raise e
