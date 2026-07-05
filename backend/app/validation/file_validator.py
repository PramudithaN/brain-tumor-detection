import io
from fastapi import HTTPException, UploadFile, status
from PIL import Image

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/jpg"}
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "MPO"}  # MPO is sometimes used by multi-picture format JPGs

async def validate_uploaded_image(file: UploadFile) -> bytes:
    """
    Validates the uploaded file.
    Checks:
    - File size is within limits (10 MB).
    - File MIME type is allowed.
    - File is a valid, readable image using Pillow.
    Returns the file content bytes if valid.
    """
    # 1. Read file contents
    content = await file.read()
    
    # Reset read pointer in case we need it elsewhere (though we return the bytes)
    await file.seek(0)
    
    # 2. Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large. Max allowed size is 10MB."
        )
        
    # 3. Check client-supplied content type (mime type)
    # Some browsers send image/jpg, others image/jpeg
    content_type = file.content_type
    if content_type not in ALLOWED_MIME_TYPES:
        # We also allow extension-based fallback if mimetype is incorrect but contents are correct,
        # but let's be strict or verify contents first.
        pass
        
    # 4. Open with Pillow to verify image validity (MIME type from bytes)
    try:
        image = Image.open(io.BytesIO(content))
        image.verify()  # Verifies the file header is valid
        
        # Re-open after verify() since verify() closes the file pointer/corrupts further reads
        image = Image.open(io.BytesIO(content))
        
        # Check actual format from bytes (e.g. JPEG, PNG)
        if image.format not in ALLOWED_IMAGE_FORMATS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image format: {image.format}. Please upload a JPEG or PNG."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted image file."
        )
        
    return content
